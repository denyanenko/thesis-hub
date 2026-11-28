import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import ms from 'ms';

import {
  AuthService,
  type JwtPayload,
  type TokenPair,
  type UserRole,
} from '../auth/auth.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import {
  admins,
  educationalPrograms,
  groups,
  orgUnits,
  specialties,
  students,
  supervisors,
  userInvitations,
  users,
} from '../database/schema.js';
import { MailService } from '../mail/mail.service.js';
import type { UserInvitationTemplateParams } from '../mail/mail.templates.js';
import { OrgScopeService } from '../org-units/org-scope.service.js';
import type { AdminActor } from '../org-units/org-units.types.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import {
  BulkCreateInvitationsDto,
  BulkPreviewInvitationsDto,
} from './dto/bulk-invitations.dto.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto.js';
import { InvitationSpreadsheetService } from './invitation-spreadsheet.service.js';
import {
  DEGREE_LEVEL_LABELS_UA,
  SUPERADMIN_OPTION_LABEL,
  USER_ROLE_LABELS_UA,
  type BulkCreateResponse,
  type BulkInvitationRowInput,
  type BulkPreviewResponse,
  type BulkPreviewRow,
  type CatalogGroupItem,
  type CatalogOrgUnitItem,
  type InvitationCatalog,
  type InvitationLifecycleStatus,
  type InvitationListItem,
  type InvitationListResponse,
  type InvitationListStats,
  type UploadedSpreadsheetFile,
  type VerifiedInvitationView,
} from './invitations.types.js';

interface InvitationJwtPayload {
  sub: number;
  jti: string;
  purpose: 'user-invitation';
}

interface PendingEmailTask {
  invitationId: number;
  to: string;
  params: UserInvitationTemplateParams;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID_SUFFIX_REGEX = /\[#(\d+)\]\s*$/;
const PURE_INT_REGEX = /^\d+$/;
const INLINE_EMAIL_BATCH_LIMIT = 3;
const EMAIL_BATCH_CONCURRENCY = 2;
const EMAIL_BATCH_DELAY_MS = 150;

const SUPERADMIN_REF_ALIASES = new Set([
  SUPERADMIN_OPTION_LABEL.toLowerCase(),
  'головний адміністратор',
  'суперадмін',
  'суперадміністратор',
  'superadmin',
  'увесь університет',
]);

interface PgErrorShape {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

function extractPgError(err: unknown): PgErrorShape | null {
  if (!err || typeof err !== 'object') return null;
  if ('code' in err && typeof (err as PgErrorShape).code === 'string') {
    return err as PgErrorShape;
  }
  if ('cause' in err && err.cause && typeof err.cause === 'object') {
    return extractPgError(err.cause);
  }
  return null;
}

function mapPgError(err: unknown): never {
  const pgErr = extractPgError(err);
  if (pgErr) {
    if (pgErr.code === '23505') {
      if (
        pgErr.constraint === 'users_email_key' ||
        pgErr.constraint === 'uq_user_invitations_active_email'
      ) {
        throw new ConflictException(
          'Користувач або активне запрошення з такою електронною поштою вже існує',
        );
      }
      if (
        pgErr.constraint === 'students_student_number_key' ||
        pgErr.constraint === 'uq_user_invitations_active_student_number'
      ) {
        throw new ConflictException(
          'Студент або активне запрошення з таким номером студентського квитка вже існує',
        );
      }
      throw new ConflictException('Конфлікт унікальності даних');
    }
    if (pgErr.code === '23503') {
      throw new BadRequestException(
        'Вказана група або структурний підрозділ не існує',
      );
    }
    if (pgErr.code === '23514' || pgErr.code === 'P0001') {
      throw new BadRequestException(
        'Порушено доменні обмеження запрошення (перевірте роль, активність групи або підрозділу)',
      );
    }
  }
  throw err;
}

function formatDateTimeKyiv(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(iso));
}

function formatFullName(
  lastName: string,
  firstName: string,
  patronymic?: string | null,
): string {
  return [lastName, firstName, patronymic]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(' ');
}

function buildOrgPathMap(
  units: Array<{
    id: number;
    parentId: number | null;
    name: string;
    shortName: string | null;
  }>,
): Map<number, string> {
  const byId = new Map(units.map((u) => [u.id, u]));
  const memo = new Map<number, string>();

  const resolvePath = (id: number, visited = new Set<number>()): string => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (visited.has(id)) return '';
    visited.add(id);

    const unit = byId.get(id);
    if (!unit) return '';

    const label = unit.shortName?.trim() || unit.name;
    const parentPath =
      unit.parentId !== null ? resolvePath(unit.parentId, visited) : '';
    const fullPath = parentPath ? `${parentPath} / ${label}` : label;
    memo.set(id, fullPath);
    return fullPath;
  };

  for (const unit of units) {
    resolvePath(unit.id);
  }
  return memo;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly mailService: MailService,
    private readonly orgScope: OrgScopeService,
    private readonly authService: AuthService,
    private readonly spreadsheet: InvitationSpreadsheetService,
  ) {}

  private getInviteSecret(): string {
    return (
      this.config.get('JWT_INVITE_SECRET') ||
      `${this.config.get('JWT_RESET_SECRET')}:user-invitation`
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private buildAcceptLink(token: string): string {
    const frontendUrl = this.config.get('FRONTEND_URL').replace(/\/+$/, '');
    return `${frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
  }

  private getExpiresAtIso(): string {
    const expiresInMs = ms(this.config.get('INVITATION_EXPIRES_IN'));
    return new Date(Date.now() + expiresInMs).toISOString();
  }

  private async signInvitationToken(invitationId: number): Promise<string> {
    const payload: InvitationJwtPayload = {
      sub: invitationId,
      jti: crypto.randomUUID(),
      purpose: 'user-invitation',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.getInviteSecret(),
      expiresIn: this.config.get('INVITATION_EXPIRES_IN'),
    });
  }

  private computeStatus(row: {
    acceptedAt: string | null;
    revokedAt: string | null;
    expiresAt: string;
  }): InvitationLifecycleStatus {
    if (row.acceptedAt !== null) return 'accepted';
    if (row.revokedAt !== null) return 'revoked';
    if (new Date(row.expiresAt).getTime() <= Date.now()) return 'expired';
    return 'pending';
  }

  private async getScopeIds(actor: AdminActor): Promise<Set<number> | null> {
    if (actor.isSuperAdmin) return null;
    if (actor.orgUnitId === null) return new Set<number>();
    const subtree = await this.orgScope.getSubtreeNodes(actor.orgUnitId);
    return new Set(subtree.map((n) => n.id));
  }

  /**
   * Повертає довідник доступних груп, кафедр та підрозділів у межах зони
   * відповідальності поточного адміністратора (для форм UI та генерації Excel-шаблонів).
   */
  async getCatalog(actorUserId: number): Promise<InvitationCatalog> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    return this.loadCatalogForActor(actor);
  }

  private async loadCatalogForActor(
    actor: AdminActor,
  ): Promise<InvitationCatalog> {
    const scopeIds = await this.getScopeIds(actor);

    const [allUnits, allPrograms, allSpecialties, allGroups] =
      await Promise.all([
        this.db
          .select({
            id: orgUnits.id,
            parentId: orgUnits.parentId,
            unitType: orgUnits.unitType,
            name: orgUnits.name,
            shortName: orgUnits.shortName,
            isActive: orgUnits.isActive,
          })
          .from(orgUnits),
        this.db
          .select({
            id: educationalPrograms.id,
            name: educationalPrograms.name,
            degreeLevel: educationalPrograms.degreeLevel,
            specialtyId: educationalPrograms.specialtyId,
            orgUnitId: educationalPrograms.orgUnitId,
          })
          .from(educationalPrograms),
        this.db
          .select({
            id: specialties.id,
            code: specialties.code,
            name: specialties.name,
          })
          .from(specialties),
        this.db
          .select({
            id: groups.id,
            name: groups.name,
            enrollmentYear: groups.enrollmentYear,
            educationalProgramId: groups.educationalProgramId,
            isActive: groups.isActive,
          })
          .from(groups),
      ]);

    const pathMap = buildOrgPathMap(allUnits);
    const unitById = new Map(allUnits.map((u) => [u.id, u]));
    const programById = new Map(allPrograms.map((p) => [p.id, p]));
    const specialtyById = new Map(allSpecialties.map((s) => [s.id, s]));

    const inScope = (unitId: number) =>
      scopeIds === null || scopeIds.has(unitId);

    const activeOrgUnits: CatalogOrgUnitItem[] = allUnits
      .filter((u) => u.isActive && inScope(u.id))
      .map((u) => {
        const orgPath = pathMap.get(u.id) ?? u.name;
        const shortPart = u.shortName ? ` (${u.shortName})` : '';
        return {
          id: u.id,
          name: u.name,
          shortName: u.shortName,
          unitType: u.unitType,
          parentId: u.parentId,
          orgPath,
          templateOption: `${u.name}${shortPart} [#${u.id}]`,
        };
      })
      .sort((a, b) => a.orgPath.localeCompare(b.orgPath, 'uk'));

    const activeDepartments = activeOrgUnits.filter(
      (u) => u.unitType === 'department',
    );

    const activeGroups: CatalogGroupItem[] = allGroups
      .filter((g) => {
        if (!g.isActive) return false;
        const prog = programById.get(g.educationalProgramId);
        if (!prog) return false;
        return inScope(prog.orgUnitId);
      })
      .map((g) => {
        const prog = programById.get(g.educationalProgramId)!;
        const spec = specialtyById.get(prog.specialtyId);
        const dept = unitById.get(prog.orgUnitId);
        const orgPath = pathMap.get(prog.orgUnitId) ?? dept?.name ?? '';
        const degreeLabel = DEGREE_LEVEL_LABELS_UA[prog.degreeLevel];
        return {
          id: g.id,
          name: g.name,
          enrollmentYear: g.enrollmentYear,
          educationalProgramId: prog.id,
          educationalProgramName: prog.name,
          degreeLevel: prog.degreeLevel,
          specialtyCode: spec?.code ?? '',
          specialtyName: spec?.name ?? '',
          departmentId: prog.orgUnitId,
          departmentName: dept?.name ?? '',
          departmentShortName: dept?.shortName ?? null,
          orgPath,
          templateOption: `${g.name} — ${prog.name} (${degreeLabel}) [#${g.id}]`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

    return {
      isSuperAdmin: actor.isSuperAdmin,
      actorOrgUnitId: actor.orgUnitId,
      groups: activeGroups,
      departments: activeDepartments,
      orgUnits: activeOrgUnits,
    };
  }

  /**
   * Генерує .xlsx-шаблон для завантаження користувачів певної ролі.
   */
  async generateTemplate(
    actorUserId: number,
    role: UserRole,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const catalog = await this.getCatalog(actorUserId);
    const buffer = await this.spreadsheet.generateTemplateBuffer(role, catalog);
    const filename = `thesis-hub-template-${role}s.xlsx`;
    return { buffer, filename };
  }

  /**
   * Парсить завантажений .xlsx/.csv файл та виконує dry-run валідацію кожного рядка.
   */
  async previewUploadedFile(
    actorUserId: number,
    role: UserRole,
    file: UploadedSpreadsheetFile | undefined,
  ): Promise<BulkPreviewResponse> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Файл не передано або він порожній');
    }
    const parsedRows = await this.spreadsheet.parseUploadedFile(
      file.buffer,
      file.originalname,
      role,
    );
    return this.previewBulk(actorUserId, { role, rows: parsedRows });
  }

  /**
   * Dry-run перевірка масиву рядків без створення записів у БД.
   */
  async previewBulk(
    actorUserId: number,
    dto: BulkPreviewInvitationsDto,
  ): Promise<BulkPreviewResponse> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const catalog = await this.loadCatalogForActor(actor);
    const evaluated = await this.validateRows(catalog, dto.role, dto.rows);
    const validCount = evaluated.filter((r) => r.isValid).length;

    return {
      role: dto.role,
      totalCount: evaluated.length,
      validCount,
      invalidCount: evaluated.length - validCount,
      rows: evaluated,
    };
  }

  /**
   * Одиночне запрошення користувача з миттєвою відправкою листа.
   */
  async create(
    actorUserId: number,
    dto: CreateInvitationDto,
  ): Promise<InvitationListItem> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const catalog = await this.loadCatalogForActor(actor);

    const [evaluated] = await this.validateRows(catalog, dto.role, [
      {
        rowNumber: 1,
        email: dto.email,
        lastName: dto.lastName,
        firstName: dto.firstName,
        patronymic: dto.patronymic ?? null,
        studentNumber: dto.studentNumber ?? null,
        groupId: dto.groupId ?? null,
        orgUnitId: dto.orgUnitId ?? null,
        position: dto.position ?? null,
        academicDegree: dto.academicDegree ?? null,
        academicTitle: dto.academicTitle ?? null,
      },
    ]);

    if (!evaluated.isValid) {
      const firstError = evaluated.errors[0] ?? 'Некоректні дані запрошення';
      if (firstError.includes('вже існує') || firstError.includes('вже має')) {
        throw new ConflictException(evaluated.errors.join('; '));
      }
      if (firstError.includes('прав') || firstError.includes('суперадмін')) {
        throw new ForbiddenException(evaluated.errors.join('; '));
      }
      throw new BadRequestException(evaluated.errors.join('; '));
    }

    const { createdIds, emailTasks } = await this.persistInvitations(
      actor.userId,
      dto.role,
      [evaluated],
    );

    if (emailTasks.length > 0) {
      await this.deliverSingleEmail(emailTasks[0]);
    }

    const item = await this.loadInvitationViewById(createdIds[0]);
    if (!item) {
      throw new NotFoundException('Запрошення не знайдено після створення');
    }
    return item;
  }

  /**
   * Масове створення й розсилка запрошень (підтримує гнучкий режим skipInvalid).
   */
  async createBulk(
    actorUserId: number,
    dto: BulkCreateInvitationsDto,
  ): Promise<BulkCreateResponse> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const catalog = await this.loadCatalogForActor(actor);
    const evaluated = await this.validateRows(catalog, dto.role, dto.rows);

    const validRows = evaluated.filter((r) => r.isValid);
    const invalidRows = evaluated.filter((r) => !r.isValid);
    const skipInvalid = dto.skipInvalid ?? true;

    if (!skipInvalid && invalidRows.length > 0) {
      throw new BadRequestException(
        `У списку виявлено помилки (${invalidRows.length} із ${evaluated.length} рядків). Виправте їх або дозвольте надсилання лише валідних рядків.`,
      );
    }

    if (validRows.length === 0) {
      throw new BadRequestException(
        'Жоден рядок не пройшов перевірку. Виправте помилки перед надсиланням.',
      );
    }

    const { createdIds, emailTasks } = await this.persistInvitations(
      actor.userId,
      dto.role,
      validRows,
    );

    if (emailTasks.length <= INLINE_EMAIL_BATCH_LIMIT) {
      for (const task of emailTasks) {
        await this.deliverSingleEmail(task);
      }
    } else {
      void this.dispatchBatchEmails(emailTasks).catch((err: unknown) => {
        this.logger.error(
          `Помилка фонової розсилки запрошень: ${(err as Error).message}`,
          (err as Error).stack,
        );
      });
    }

    const createdItems = await this.loadInvitationViewsByIds(createdIds);

    return {
      role: dto.role,
      createdCount: createdItems.length,
      skippedCount: invalidRows.length,
      created: createdItems,
      skipped: invalidRows,
    };
  }

  /**
   * Повертає список запрошень у межах прав адміністратора + статистику за статусами.
   */
  async findAll(
    actorUserId: number,
    query: ListInvitationsQueryDto,
  ): Promise<InvitationListResponse> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const scopeIds = await this.getScopeIds(actor);

    const rows = await this.db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        firstName: userInvitations.firstName,
        lastName: userInvitations.lastName,
        patronymic: userInvitations.patronymic,
        studentNumber: userInvitations.studentNumber,
        groupId: userInvitations.groupId,
        orgUnitId: userInvitations.orgUnitId,
        position: userInvitations.position,
        academicDegree: userInvitations.academicDegree,
        academicTitle: userInvitations.academicTitle,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        acceptedUserId: userInvitations.acceptedUserId,
        revokedAt: userInvitations.revokedAt,
        invitedByUserId: userInvitations.invitedByUserId,
        emailStatus: userInvitations.emailStatus,
        emailError: userInvitations.emailError,
        emailSentAt: userInvitations.emailSentAt,
        createdAt: userInvitations.createdAt,
        updatedAt: userInvitations.updatedAt,
      })
      .from(userInvitations)
      .orderBy(desc(userInvitations.createdAt), desc(userInvitations.id));

    const enriched = await this.hydrateInvitationViews(rows);

    // Фільтрація за OrgScope для локального адміна
    const scoped =
      scopeIds === null
        ? enriched
        : enriched.filter((item) => {
            if (item.invitedByUserId === actor.userId) return true;
            if (item.orgUnitId !== null && scopeIds.has(item.orgUnitId)) {
              return true;
            }
            if (item.groupDepartmentId !== null) {
              return scopeIds.has(item.groupDepartmentId);
            }
            return false;
          });

    const stats: InvitationListStats = {
      total: scoped.length,
      pending: 0,
      accepted: 0,
      expired: 0,
      revoked: 0,
      emailFailed: 0,
      emailPending: 0,
    };

    for (const item of scoped) {
      stats[item.view.status] += 1;
      if (item.view.emailStatus === 'failed' && item.view.status === 'pending') {
        stats.emailFailed += 1;
      }
      if (
        item.view.emailStatus === 'pending' &&
        item.view.status === 'pending'
      ) {
        stats.emailPending += 1;
      }
    }

    const searchLower = query.search?.trim().toLowerCase() ?? '';
    const filtered = scoped
      .map((entry) => entry.view)
      .filter((item) => {
        if (query.role && item.role !== query.role) return false;
        if (query.status && item.status !== query.status) return false;
        if (searchLower) {
          const haystack = [
            item.email,
            item.lastName,
            item.firstName,
            item.patronymic ?? '',
            item.studentNumber ?? '',
            item.groupName ?? '',
            item.orgUnitName ?? '',
            item.orgUnitShortName ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(searchLower)) return false;
        }
        return true;
      });

    return { items: filtered, stats };
  }

  /**
   * Повторно надсилає лист-запрошення (перевипускає JWT-токен та оновлює термін дії).
   */
  async resend(
    actorUserId: number,
    invitationId: number,
  ): Promise<InvitationListItem> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const invitation = await this.findInvitationAndAssertScope(
      actor,
      invitationId,
    );

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException(
        'Це запрошення вже прийнято — повторна відправка неможлива',
      );
    }
    if (invitation.revokedAt !== null) {
      throw new BadRequestException(
        'Це запрошення відкликано — створіть нове запрошення',
      );
    }

    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${invitation.email.toLowerCase()}`)
      .limit(1);
    if (existingUser.length > 0) {
      throw new ConflictException(
        'Користувач із такою електронною поштою вже зареєстрований у системі',
      );
    }

    const token = await this.signInvitationToken(invitation.id);
    const tokenHash = this.hashToken(token);
    const expiresAt = this.getExpiresAtIso();

    await this.db
      .update(userInvitations)
      .set({
        tokenHash,
        expiresAt,
        emailStatus: 'pending',
        emailError: null,
        emailSentAt: null,
      })
      .where(eq(userInvitations.id, invitation.id));

    const viewBeforeMail = await this.loadInvitationViewById(invitation.id);
    const contextLabel = viewBeforeMail
      ? this.buildContextLabelFromView(viewBeforeMail)
      : null;

    await this.deliverSingleEmail({
      invitationId: invitation.id,
      to: invitation.email,
      params: {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        patronymic: invitation.patronymic,
        roleLabel: USER_ROLE_LABELS_UA[invitation.role],
        contextLabel,
        link: this.buildAcceptLink(token),
        expiresAtLabel: formatDateTimeKyiv(expiresAt),
      },
    });

    const updated = await this.loadInvitationViewById(invitation.id);
    if (!updated) {
      throw new NotFoundException('Запрошення не знайдено');
    }
    return updated;
  }

  /**
   * Відкликає невикористане запрошення.
   */
  async revoke(
    actorUserId: number,
    invitationId: number,
  ): Promise<InvitationListItem> {
    const actor = await this.orgScope.getAdminActor(actorUserId);
    const invitation = await this.findInvitationAndAssertScope(
      actor,
      invitationId,
    );

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException(
        'Неможливо відкликати вже прийняте запрошення',
      );
    }
    if (invitation.revokedAt !== null) {
      throw new BadRequestException('Це запрошення вже відкликано');
    }

    await this.db
      .update(userInvitations)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(userInvitations.id, invitation.id));

    const updated = await this.loadInvitationViewById(invitation.id);
    if (!updated) {
      throw new NotFoundException('Запрошення не знайдено');
    }
    return updated;
  }

  /**
   * Публічна перевірка JWT-токена запрошення (для відображення даних користувача
   * на сторінці активації перед введенням пароля).
   */
  async verifyInvitation(token: string): Promise<VerifiedInvitationView> {
    const invitation = await this.validateTokenAndLoadInvitation(token);
    const view = await this.loadInvitationViewById(invitation.id);
    if (!view) {
      throw new BadRequestException('Посилання-запрошення недійсне');
    }

    return {
      email: view.email,
      role: view.role,
      roleLabel: USER_ROLE_LABELS_UA[view.role],
      firstName: view.firstName,
      lastName: view.lastName,
      patronymic: view.patronymic,
      studentNumber: view.studentNumber,
      groupName: view.groupName,
      educationalProgramName: view.educationalProgramName,
      orgUnitName:
        view.role === 'admin' && view.orgUnitId === null
          ? SUPERADMIN_OPTION_LABEL
          : view.orgUnitName,
      position: view.position,
      academicDegree: view.academicDegree,
      academicTitle: view.academicTitle,
      expiresAt: view.expiresAt,
    };
  }

  /**
   * Публічне прийняття запрошення: створює користувача + рольовий профіль
   * у транзакції та одразу видає пару токенів сесії для автоматичного входу.
   */
  async acceptInvitation(
    dto: AcceptInvitationDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ tokens: TokenPair; user: JwtPayload }> {
    const invitation = await this.validateTokenAndLoadInvitation(dto.token);
    const passwordHash = await argon2.hash(dto.password);

    let createdUser: { id: number; email: string; role: UserRole };

    try {
      createdUser = await this.db.transaction(async (tx) => {
        // Атомарне блокування рядка запрошення від подвійного сабміту
        const lockedRes = await tx.execute<{
          id: string | number;
          accepted_at: string | null;
          revoked_at: string | null;
          expires_at: string;
          token_hash: string;
        }>(sql`
          SELECT id, accepted_at, revoked_at, expires_at, token_hash
          FROM user_invitations
          WHERE id = ${invitation.id}
          FOR UPDATE
        `);

        const locked = lockedRes.rows[0];
        if (!locked) {
          throw new BadRequestException('Посилання-запрошення недійсне');
        }
        if (locked.revoked_at !== null) {
          throw new BadRequestException(
            'Це запрошення було відкликано адміністратором',
          );
        }
        if (locked.accepted_at !== null) {
          throw new BadRequestException(
            'Це запрошення вже використано. Увійдіть за своєю поштою та паролем.',
          );
        }
        if (new Date(locked.expires_at).getTime() <= Date.now()) {
          throw new BadRequestException(
            'Термін дії запрошення минув. Зверніться до адміністратора для повторного надсилання.',
          );
        }
        if (locked.token_hash !== this.hashToken(dto.token)) {
          throw new BadRequestException(
            'Посилання-запрошення застаріло. Скористайтеся найновішим листом.',
          );
        }

        // Перевірка актуальності привʼязаної групи / підрозділу
        if (invitation.role === 'student' && invitation.groupId !== null) {
          const [group] = await tx
            .select({ id: groups.id, isActive: groups.isActive })
            .from(groups)
            .where(eq(groups.id, invitation.groupId))
            .limit(1);
          if (!group || !group.isActive) {
            throw new BadRequestException(
              'Академічна група із запрошення більше не активна. Зверніться до адміністратора.',
            );
          }
        }
        if (
          (invitation.role === 'supervisor' || invitation.role === 'admin') &&
          invitation.orgUnitId !== null
        ) {
          const [unit] = await tx
            .select({
              id: orgUnits.id,
              isActive: orgUnits.isActive,
              unitType: orgUnits.unitType,
            })
            .from(orgUnits)
            .where(eq(orgUnits.id, invitation.orgUnitId))
            .limit(1);
          if (!unit || !unit.isActive) {
            throw new BadRequestException(
              'Структурний підрозділ із запрошення більше не активний. Зверніться до адміністратора.',
            );
          }
          if (
            invitation.role === 'supervisor' &&
            unit.unitType !== 'department'
          ) {
            throw new BadRequestException(
              'Науковий керівник має бути привʼязаний до кафедри. Зверніться до адміністратора.',
            );
          }
        }

        // Перевірка унікальності email (case-insensitive)
        const existingEmail = await tx
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${invitation.email.toLowerCase()}`)
          .limit(1);
        if (existingEmail.length > 0) {
          throw new ConflictException(
            'Користувач із такою електронною поштою вже існує у системі',
          );
        }

        const [insertedUser] = await tx
          .insert(users)
          .values({
            email: invitation.email.toLowerCase(),
            passwordHash,
            role: invitation.role,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            patronymic: invitation.patronymic,
            isActive: true,
          })
          .returning({
            id: users.id,
            email: users.email,
            role: users.role,
          });

        if (invitation.role === 'student') {
          await tx.insert(students).values({
            userId: insertedUser.id,
            studentNumber: invitation.studentNumber!,
            groupId: invitation.groupId,
          });
        } else if (invitation.role === 'supervisor') {
          await tx.insert(supervisors).values({
            userId: insertedUser.id,
            orgUnitId: invitation.orgUnitId,
            position: invitation.position,
            academicDegree: invitation.academicDegree,
            academicTitle: invitation.academicTitle,
          });
        } else {
          await tx.insert(admins).values({
            userId: insertedUser.id,
            orgUnitId: invitation.orgUnitId,
            position: invitation.position,
          });
        }

        await tx
          .update(userInvitations)
          .set({
            acceptedAt: new Date().toISOString(),
            acceptedUserId: insertedUser.id,
          })
          .where(eq(userInvitations.id, invitation.id));

        return insertedUser;
      });
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      mapPgError(err);
    }

    const jwtPayload: JwtPayload = {
      sub: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
    };

    const tokens = await this.authService.issueSessionTokens(
      jwtPayload,
      userAgent,
      ipAddress,
    );

    return { tokens, user: jwtPayload };
  }

  // ---------------------------------------------------------------------------
  // Приватна валідація рядків (єдиний конвеєр для одиночних і масових запрошень)
  // ---------------------------------------------------------------------------

  private async validateRows(
    catalog: InvitationCatalog,
    role: UserRole,
    rows: BulkInvitationRowInput[],
  ): Promise<BulkPreviewRow[]> {
    const groupById = new Map(catalog.groups.map((g) => [g.id, g]));
    const deptById = new Map(catalog.departments.map((d) => [d.id, d]));
    const unitById = new Map(catalog.orgUnits.map((u) => [u.id, u]));

    // Збираємо всі непусті email та studentNumber для пакетної перевірки в БД
    const normalizedEmails = new Set<string>();
    const normalizedStudentNumbers = new Set<string>();
    for (const row of rows) {
      const email = (row.email ?? '').trim().toLowerCase();
      if (email) normalizedEmails.add(email);
      const sn = row.studentNumber?.trim();
      if (role === 'student' && sn) normalizedStudentNumbers.add(sn);
    }

    const emailList = Array.from(normalizedEmails);
    const studentNumberList = Array.from(normalizedStudentNumbers);
    const nowIso = new Date().toISOString();

    const [
      existingUserEmails,
      existingPendingInvEmails,
      existingStudentNumbers,
      existingPendingStudentNumbers,
    ] = await Promise.all([
      emailList.length > 0
        ? this.db
            .select({ email: users.email })
            .from(users)
            .where(inArray(sql`lower(${users.email})`, emailList))
        : Promise.resolve([]),
      emailList.length > 0
        ? this.db
            .select({
              email: userInvitations.email,
              expiresAt: userInvitations.expiresAt,
            })
            .from(userInvitations)
            .where(
              and(
                inArray(sql`lower(${userInvitations.email})`, emailList),
                isNull(userInvitations.acceptedAt),
                isNull(userInvitations.revokedAt),
              ),
            )
        : Promise.resolve([]),
      studentNumberList.length > 0
        ? this.db
            .select({ studentNumber: students.studentNumber })
            .from(students)
            .where(inArray(students.studentNumber, studentNumberList))
        : Promise.resolve([]),
      studentNumberList.length > 0
        ? this.db
            .select({
              studentNumber: userInvitations.studentNumber,
              expiresAt: userInvitations.expiresAt,
            })
            .from(userInvitations)
            .where(
              and(
                inArray(userInvitations.studentNumber, studentNumberList),
                isNull(userInvitations.acceptedAt),
                isNull(userInvitations.revokedAt),
              ),
            )
        : Promise.resolve([]),
    ]);

    const takenEmails = new Set(
      existingUserEmails.map((u) => u.email.toLowerCase()),
    );
    const activeInvitedEmails = new Set(
      existingPendingInvEmails
        .filter((inv) => inv.expiresAt > nowIso)
        .map((inv) => inv.email.toLowerCase()),
    );
    const takenStudentNumbers = new Set(
      existingStudentNumbers.map((s) => s.studentNumber),
    );
    const activeInvitedStudentNumbers = new Set(
      existingPendingStudentNumbers
        .filter((inv) => inv.expiresAt > nowIso && inv.studentNumber !== null)
        .map((inv) => inv.studentNumber!),
    );

    // Підрахунок дублікатів усередині поточного пакету
    const emailCounts = new Map<string, number>();
    const studentNumberCounts = new Map<string, number>();
    for (const row of rows) {
      const email = (row.email ?? '').trim().toLowerCase();
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
      }
      if (role === 'student') {
        const sn = row.studentNumber?.trim() ?? '';
        if (sn) {
          studentNumberCounts.set(sn, (studentNumberCounts.get(sn) ?? 0) + 1);
        }
      }
    }

    return rows.map((raw, index) => {
      const rowNumber = raw.rowNumber ?? index + 1;
      const errors: string[] = [];

      const email = (raw.email ?? '').trim().toLowerCase();
      const lastName = (raw.lastName ?? '').trim();
      const firstName = (raw.firstName ?? '').trim();
      const patronymic = raw.patronymic?.trim() || null;
      const studentNumber =
        role === 'student' ? raw.studentNumber?.trim() || null : null;
      const position =
        role === 'supervisor' || role === 'admin'
          ? raw.position?.trim() || null
          : null;
      const academicDegree =
        role === 'supervisor' ? raw.academicDegree?.trim() || null : null;
      const academicTitle =
        role === 'supervisor' ? raw.academicTitle?.trim() || null : null;

      // 1. Загальні поля
      if (!email) {
        errors.push('Не вказано електронну пошту');
      } else if (!EMAIL_REGEX.test(email) || email.length > 255) {
        errors.push('Некоректний формат електронної пошти');
      } else {
        if ((emailCounts.get(email) ?? 0) > 1) {
          errors.push('Дублікат електронної пошти всередині списку');
        }
        if (takenEmails.has(email)) {
          errors.push('Користувач із такою електронною поштою вже існує');
        } else if (activeInvitedEmails.has(email)) {
          errors.push('Для цієї електронної пошти вже є активне запрошення');
        }
      }

      if (!lastName) {
        errors.push('Не вказано прізвище');
      } else if (lastName.length > 100) {
        errors.push('Прізвище перевищує 100 символів');
      }

      if (!firstName) {
        errors.push('Не вказано імʼя');
      } else if (firstName.length > 100) {
        errors.push('Імʼя перевищує 100 символів');
      }

      if (patronymic && patronymic.length > 100) {
        errors.push('По батькові перевищує 100 символів');
      }

      // 2. Рольові поля та розвʼязання посилань
      let resolvedGroupId: number | null = null;
      let resolvedGroupLabel: string | null = null;
      let resolvedOrgUnitId: number | null = null;
      let resolvedOrgUnitLabel: string | null = null;

      if (role === 'student') {
        if (!studentNumber) {
          errors.push('Не вказано номер студентського квитка');
        } else if (studentNumber.length > 64) {
          errors.push('Номер студентського перевищує 64 символи');
        } else {
          if ((studentNumberCounts.get(studentNumber) ?? 0) > 1) {
            errors.push('Дублікат номера студентського всередині списку');
          }
          if (takenStudentNumbers.has(studentNumber)) {
            errors.push('Студент із таким номером квитка вже існує');
          } else if (activeInvitedStudentNumbers.has(studentNumber)) {
            errors.push(
              'Для цього номера студентського вже є активне запрошення',
            );
          }
        }

        const resolved = this.resolveGroup(
          raw.groupId ?? null,
          raw.groupRef ?? null,
          catalog.groups,
          groupById,
        );
        if (resolved.error) {
          errors.push(resolved.error);
        } else if (resolved.item) {
          resolvedGroupId = resolved.item.id;
          resolvedGroupLabel = `${resolved.item.name} (${resolved.item.educationalProgramName})`;
        }
      } else if (role === 'supervisor') {
        const resolved = this.resolveOrgUnit(
          raw.orgUnitId ?? null,
          raw.orgUnitRef ?? null,
          catalog.departments,
          deptById,
          'department',
        );
        if (resolved.error) {
          errors.push(resolved.error);
        } else if (resolved.item) {
          resolvedOrgUnitId = resolved.item.id;
          resolvedOrgUnitLabel = resolved.item.shortName
            ? `${resolved.item.name} (${resolved.item.shortName})`
            : resolved.item.name;
        }
        if (position && position.length > 150) {
          errors.push('Посада перевищує 150 символів');
        }
        if (academicDegree && academicDegree.length > 120) {
          errors.push('Науковий ступінь перевищує 120 символів');
        }
        if (academicTitle && academicTitle.length > 120) {
          errors.push('Вчене звання перевищує 120 символів');
        }
      } else {
        // admin
        const refTrimmed = raw.orgUnitRef?.trim() ?? '';
        const explicitlySuperAdmin =
          (raw.orgUnitId === null || raw.orgUnitId === undefined) &&
          (refTrimmed.length === 0 ||
            SUPERADMIN_REF_ALIASES.has(refTrimmed.toLowerCase()));

        if (explicitlySuperAdmin) {
          if (!catalog.isSuperAdmin) {
            errors.push(
              'Оберіть підрозділ у межах ваших прав (запрошувати головних адміністраторів може лише головний адміністратор)',
            );
          } else {
            resolvedOrgUnitId = null;
            resolvedOrgUnitLabel = SUPERADMIN_OPTION_LABEL;
          }
        } else {
          const resolved = this.resolveOrgUnit(
            raw.orgUnitId ?? null,
            raw.orgUnitRef ?? null,
            catalog.orgUnits,
            unitById,
            'any',
          );
          if (resolved.error) {
            errors.push(resolved.error);
          } else if (resolved.item) {
            resolvedOrgUnitId = resolved.item.id;
            resolvedOrgUnitLabel = resolved.item.shortName
              ? `${resolved.item.name} (${resolved.item.shortName})`
              : resolved.item.name;
          }
        }
        if (position && position.length > 150) {
          errors.push('Посада перевищує 150 символів');
        }
      }

      return {
        rowNumber,
        email,
        lastName,
        firstName,
        patronymic,
        studentNumber,
        groupId: resolvedGroupId,
        groupRef: raw.groupRef?.trim() || null,
        groupLabel: resolvedGroupLabel,
        orgUnitId: resolvedOrgUnitId,
        orgUnitRef: raw.orgUnitRef?.trim() || null,
        orgUnitLabel: resolvedOrgUnitLabel,
        position,
        academicDegree,
        academicTitle,
        isValid: errors.length === 0,
        errors,
      };
    });
  }

  private resolveGroup(
    groupId: number | null,
    groupRef: string | null,
    allGroups: CatalogGroupItem[],
    groupById: Map<number, CatalogGroupItem>,
  ): { item: CatalogGroupItem | null; error: string | null } {
    if (groupId !== null && groupId !== undefined) {
      const found = groupById.get(groupId);
      if (!found) {
        return {
          item: null,
          error:
            'Обрану групу не знайдено серед активних груп у межах ваших прав',
        };
      }
      return { item: found, error: null };
    }

    const ref = groupRef?.trim() ?? '';
    if (!ref) {
      return { item: null, error: 'Не вказано академічну групу' };
    }

    const idMatch = ID_SUFFIX_REGEX.exec(ref);
    if (idMatch) {
      const parsedId = Number(idMatch[1]);
      const found = groupById.get(parsedId);
      if (!found) {
        return {
          item: null,
          error: `Групу «${ref}» не знайдено серед активних груп у межах ваших прав`,
        };
      }
      return { item: found, error: null };
    }

    if (PURE_INT_REGEX.test(ref)) {
      const found = groupById.get(Number(ref));
      if (found) return { item: found, error: null };
    }

    const refLower = ref.toLowerCase();
    const byTemplate = allGroups.find(
      (g) => g.templateOption.toLowerCase() === refLower,
    );
    if (byTemplate) return { item: byTemplate, error: null };

    const byName = allGroups.filter((g) => g.name.toLowerCase() === refLower);
    if (byName.length === 1) return { item: byName[0], error: null };
    if (byName.length > 1) {
      return {
        item: null,
        error: `Знайдено кілька груп із назвою «${ref}» — уточніть вибір зі списку`,
      };
    }

    return {
      item: null,
      error: `Групу «${ref}» не знайдено серед активних груп у межах ваших прав`,
    };
  }

  private resolveOrgUnit(
    orgUnitId: number | null,
    orgUnitRef: string | null,
    allowedUnits: CatalogOrgUnitItem[],
    unitById: Map<number, CatalogOrgUnitItem>,
    mode: 'department' | 'any',
  ): { item: CatalogOrgUnitItem | null; error: string | null } {
    const noun = mode === 'department' ? 'кафедру' : 'підрозділ';
    const scopeHint =
      mode === 'department'
        ? 'серед активних кафедр у межах ваших прав'
        : 'серед активних підрозділів у межах ваших прав';

    if (orgUnitId !== null && orgUnitId !== undefined) {
      const found = unitById.get(orgUnitId);
      if (!found) {
        return {
          item: null,
          error: `Обраний ${noun} не знайдено ${scopeHint}`,
        };
      }
      return { item: found, error: null };
    }

    const ref = orgUnitRef?.trim() ?? '';
    if (!ref) {
      return { item: null, error: `Не вказано ${noun}` };
    }

    const idMatch = ID_SUFFIX_REGEX.exec(ref);
    if (idMatch) {
      const found = unitById.get(Number(idMatch[1]));
      if (!found) {
        return {
          item: null,
          error: `${mode === 'department' ? 'Кафедру' : 'Підрозділ'} «${ref}» не знайдено ${scopeHint}`,
        };
      }
      return { item: found, error: null };
    }

    if (PURE_INT_REGEX.test(ref)) {
      const found = unitById.get(Number(ref));
      if (found) return { item: found, error: null };
    }

    const refLower = ref.toLowerCase();
    const byTemplate = allowedUnits.find(
      (u) => u.templateOption.toLowerCase() === refLower,
    );
    if (byTemplate) return { item: byTemplate, error: null };

    const byExact = allowedUnits.filter(
      (u) =>
        u.name.toLowerCase() === refLower ||
        (u.shortName && u.shortName.toLowerCase() === refLower) ||
        u.orgPath.toLowerCase() === refLower,
    );
    if (byExact.length === 1) return { item: byExact[0], error: null };
    if (byExact.length > 1) {
      return {
        item: null,
        error: `Знайдено кілька варіантів для «${ref}» — уточніть вибір зі списку`,
      };
    }

    return {
      item: null,
      error: `${mode === 'department' ? 'Кафедру' : 'Підрозділ'} «${ref}» не знайдено ${scopeHint}`,
    };
  }

  // ---------------------------------------------------------------------------
  // Збереження запрошень і відправка листів
  // ---------------------------------------------------------------------------

  private async persistInvitations(
    invitedByUserId: number,
    role: UserRole,
    validRows: BulkPreviewRow[],
  ): Promise<{ createdIds: number[]; emailTasks: PendingEmailTask[] }> {
    const expiresAt = this.getExpiresAtIso();
    const nowIso = new Date().toISOString();
    const emailsToInsert = validRows.map((r) => r.email);
    const studentNumbersToInsert = validRows
      .map((r) => r.studentNumber)
      .filter((sn): sn is string => sn !== null);

    try {
      return await this.db.transaction(async (tx) => {
        // Автоматично відкликаємо прострочені невикористані запрошення з тими ж email / student_number,
        // щоб не блокувати повторне запрошення через частковий унікальний індекс
        const staleConditions = [
          inArray(sql`lower(${userInvitations.email})`, emailsToInsert),
        ];
        if (studentNumbersToInsert.length > 0) {
          staleConditions.push(
            inArray(userInvitations.studentNumber, studentNumbersToInsert),
          );
        }

        await tx
          .update(userInvitations)
          .set({ revokedAt: nowIso })
          .where(
            and(
              isNull(userInvitations.acceptedAt),
              isNull(userInvitations.revokedAt),
              lte(userInvitations.expiresAt, nowIso),
              or(...staleConditions),
            ),
          );

        const createdIds: number[] = [];
        const emailTasks: PendingEmailTask[] = [];

        for (const row of validRows) {
          const placeholderHash = `pending:${crypto.randomUUID()}`;
          const [inserted] = await tx
            .insert(userInvitations)
            .values({
              email: row.email,
              role,
              firstName: row.firstName,
              lastName: row.lastName,
              patronymic: row.patronymic,
              studentNumber: role === 'student' ? row.studentNumber : null,
              groupId: role === 'student' ? row.groupId : null,
              orgUnitId: role === 'student' ? null : row.orgUnitId,
              position:
                role === 'supervisor' || role === 'admin' ? row.position : null,
              academicDegree:
                role === 'supervisor' ? row.academicDegree : null,
              academicTitle: role === 'supervisor' ? row.academicTitle : null,
              tokenHash: placeholderHash,
              expiresAt,
              invitedByUserId,
              emailStatus: 'pending',
            })
            .returning({ id: userInvitations.id });

          const token = await this.signInvitationToken(inserted.id);
          const tokenHash = this.hashToken(token);

          await tx
            .update(userInvitations)
            .set({ tokenHash })
            .where(eq(userInvitations.id, inserted.id));

          createdIds.push(inserted.id);

          const contextLabel =
            role === 'student'
              ? row.groupLabel
              : row.orgUnitLabel ?? SUPERADMIN_OPTION_LABEL;

          emailTasks.push({
            invitationId: inserted.id,
            to: row.email,
            params: {
              firstName: row.firstName,
              lastName: row.lastName,
              patronymic: row.patronymic,
              roleLabel: USER_ROLE_LABELS_UA[role],
              contextLabel,
              link: this.buildAcceptLink(token),
              expiresAtLabel: formatDateTimeKyiv(expiresAt),
            },
          });
        }

        return { createdIds, emailTasks };
      });
    } catch (err) {
      mapPgError(err);
    }
  }

  private async deliverSingleEmail(task: PendingEmailTask): Promise<void> {
    try {
      await this.mailService.sendUserInvitationEmail(task.to, task.params);
      await this.db
        .update(userInvitations)
        .set({
          emailStatus: 'sent',
          emailSentAt: new Date().toISOString(),
          emailError: null,
        })
        .where(eq(userInvitations.id, task.invitationId));
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message.slice(0, 300)
          : 'Не вдалося надіслати лист';
      this.logger.warn(
        `Не вдалося надіслати лист запрошення #${task.invitationId} (${task.to}): ${errorMessage}`,
      );
      await this.db
        .update(userInvitations)
        .set({
          emailStatus: 'failed',
          emailError: errorMessage,
        })
        .where(eq(userInvitations.id, task.invitationId));
    }
  }

  private async dispatchBatchEmails(tasks: PendingEmailTask[]): Promise<void> {
    let cursor = 0;

    const worker = async () => {
      while (cursor < tasks.length) {
        const index = cursor;
        cursor += 1;
        await this.deliverSingleEmail(tasks[index]);
        if (cursor < tasks.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, EMAIL_BATCH_DELAY_MS),
          );
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(EMAIL_BATCH_CONCURRENCY, tasks.length) },
      () => worker(),
    );
    await Promise.all(workers);
  }

  // ---------------------------------------------------------------------------
  // Допоміжні методи завантаження, перевірки scope та верифікації токена
  // ---------------------------------------------------------------------------

  private async validateTokenAndLoadInvitation(token: string) {
    let payload: InvitationJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<InvitationJwtPayload>(token, {
        secret: this.getInviteSecret(),
      });
      if (
        payload.purpose !== 'user-invitation' ||
        typeof payload.sub !== 'number'
      ) {
        throw new Error('Invalid invitation payload');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw new BadRequestException(
          'Термін дії запрошення минув. Зверніться до адміністратора для повторного надсилання.',
        );
      }
      throw new BadRequestException('Посилання-запрошення недійсне');
    }

    const [invitation] = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, payload.sub))
      .limit(1);

    if (!invitation) {
      throw new BadRequestException('Посилання-запрошення недійсне');
    }

    const providedHash = Buffer.from(this.hashToken(token), 'utf8');
    const storedHash = Buffer.from(invitation.tokenHash, 'utf8');
    const hashesMatch =
      providedHash.length === storedHash.length &&
      crypto.timingSafeEqual(providedHash, storedHash);

    if (!hashesMatch) {
      throw new BadRequestException(
        'Це посилання застаріло, оскільки було надіслано новіше запрошення',
      );
    }

    if (invitation.revokedAt !== null) {
      throw new BadRequestException(
        'Це запрошення було відкликано адміністратором',
      );
    }
    if (invitation.acceptedAt !== null) {
      throw new BadRequestException(
        'Це запрошення вже використано. Ви можете увійти за своєю електронною поштою та паролем.',
      );
    }
    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException(
        'Термін дії запрошення минув. Зверніться до адміністратора для повторного надсилання.',
      );
    }

    return invitation;
  }

  private async findInvitationAndAssertScope(
    actor: AdminActor,
    invitationId: number,
  ) {
    const [invitation] = await this.db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException('Запрошення не знайдено');
    }

    if (actor.isSuperAdmin) {
      return invitation;
    }

    if (invitation.invitedByUserId === actor.userId) {
      return invitation;
    }

    let targetUnitId: number | null = invitation.orgUnitId;

    if (invitation.role === 'student' && invitation.groupId !== null) {
      const [groupRow] = await this.db
        .select({ orgUnitId: educationalPrograms.orgUnitId })
        .from(groups)
        .innerJoin(
          educationalPrograms,
          eq(groups.educationalProgramId, educationalPrograms.id),
        )
        .where(eq(groups.id, invitation.groupId))
        .limit(1);
      targetUnitId = groupRow?.orgUnitId ?? null;
    }

    if (targetUnitId === null) {
      throw new ForbiddenException(
        'Недостатньо прав для керування цим запрошенням',
      );
    }

    await this.orgScope.assertUnitInScope(
      actor,
      targetUnitId,
      { includeSelf: true },
      'Недостатньо прав для керування цим запрошенням',
    );

    return invitation;
  }

  private async loadInvitationViewById(
    id: number,
  ): Promise<InvitationListItem | null> {
    const views = await this.loadInvitationViewsByIds([id]);
    return views[0] ?? null;
  }

  private async loadInvitationViewsByIds(
    ids: number[],
  ): Promise<InvitationListItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        firstName: userInvitations.firstName,
        lastName: userInvitations.lastName,
        patronymic: userInvitations.patronymic,
        studentNumber: userInvitations.studentNumber,
        groupId: userInvitations.groupId,
        orgUnitId: userInvitations.orgUnitId,
        position: userInvitations.position,
        academicDegree: userInvitations.academicDegree,
        academicTitle: userInvitations.academicTitle,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        acceptedUserId: userInvitations.acceptedUserId,
        revokedAt: userInvitations.revokedAt,
        invitedByUserId: userInvitations.invitedByUserId,
        emailStatus: userInvitations.emailStatus,
        emailError: userInvitations.emailError,
        emailSentAt: userInvitations.emailSentAt,
        createdAt: userInvitations.createdAt,
        updatedAt: userInvitations.updatedAt,
      })
      .from(userInvitations)
      .where(inArray(userInvitations.id, ids));

    const hydrated = await this.hydrateInvitationViews(rows);
    const byId = new Map(hydrated.map((h) => [h.view.id, h.view]));
    return ids
      .map((id) => byId.get(id))
      .filter((v): v is InvitationListItem => v !== undefined);
  }

  private async hydrateInvitationViews(
    rows: Array<{
      id: number;
      email: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      patronymic: string | null;
      studentNumber: string | null;
      groupId: number | null;
      orgUnitId: number | null;
      position: string | null;
      academicDegree: string | null;
      academicTitle: string | null;
      expiresAt: string;
      acceptedAt: string | null;
      acceptedUserId: number | null;
      revokedAt: string | null;
      invitedByUserId: number | null;
      emailStatus: 'pending' | 'sent' | 'failed';
      emailError: string | null;
      emailSentAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>,
  ): Promise<
    Array<{
      view: InvitationListItem;
      orgUnitId: number | null;
      groupDepartmentId: number | null;
      invitedByUserId: number | null;
    }>
  > {
    if (rows.length === 0) return [];

    const groupIds = Array.from(
      new Set(
        rows.map((r) => r.groupId).filter((id): id is number => id !== null),
      ),
    );
    const orgUnitIds = Array.from(
      new Set(
        rows.map((r) => r.orgUnitId).filter((id): id is number => id !== null),
      ),
    );
    const inviterIds = Array.from(
      new Set(
        rows
          .map((r) => r.invitedByUserId)
          .filter((id): id is number => id !== null),
      ),
    );

    const [groupRows, unitRows, inviterRows] = await Promise.all([
      groupIds.length > 0
        ? this.db
            .select({
              id: groups.id,
              name: groups.name,
              programName: educationalPrograms.name,
              departmentId: educationalPrograms.orgUnitId,
            })
            .from(groups)
            .innerJoin(
              educationalPrograms,
              eq(groups.educationalProgramId, educationalPrograms.id),
            )
            .where(inArray(groups.id, groupIds))
        : Promise.resolve([]),
      orgUnitIds.length > 0
        ? this.db
            .select({
              id: orgUnits.id,
              name: orgUnits.name,
              shortName: orgUnits.shortName,
              unitType: orgUnits.unitType,
            })
            .from(orgUnits)
            .where(inArray(orgUnits.id, orgUnitIds))
        : Promise.resolve([]),
      inviterIds.length > 0
        ? this.db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              patronymic: users.patronymic,
            })
            .from(users)
            .where(inArray(users.id, inviterIds))
        : Promise.resolve([]),
    ]);

    const groupMap = new Map(groupRows.map((g) => [g.id, g]));
    const unitMap = new Map(unitRows.map((u) => [u.id, u]));
    const inviterMap = new Map(inviterRows.map((u) => [u.id, u]));

    return rows.map((row) => {
      const group = row.groupId !== null ? groupMap.get(row.groupId) : undefined;
      const unit = row.orgUnitId !== null ? unitMap.get(row.orgUnitId) : undefined;
      const inviter =
        row.invitedByUserId !== null
          ? inviterMap.get(row.invitedByUserId)
          : undefined;

      return {
        orgUnitId: row.orgUnitId,
        groupDepartmentId: group?.departmentId ?? null,
        invitedByUserId: row.invitedByUserId,
        view: {
          id: row.id,
          email: row.email,
          role: row.role,
          firstName: row.firstName,
          lastName: row.lastName,
          patronymic: row.patronymic,
          studentNumber: row.studentNumber,
          groupId: row.groupId,
          groupName: group?.name ?? null,
          educationalProgramName: group?.programName ?? null,
          orgUnitId: row.orgUnitId,
          orgUnitName: unit?.name ?? null,
          orgUnitShortName: unit?.shortName ?? null,
          orgUnitType: unit?.unitType ?? null,
          position: row.position,
          academicDegree: row.academicDegree,
          academicTitle: row.academicTitle,
          status: this.computeStatus(row),
          emailStatus: row.emailStatus,
          emailError: row.emailError,
          emailSentAt: row.emailSentAt,
          expiresAt: row.expiresAt,
          acceptedAt: row.acceptedAt,
          acceptedUserId: row.acceptedUserId,
          revokedAt: row.revokedAt,
          invitedByUserId: row.invitedByUserId,
          invitedByName: inviter
            ? formatFullName(
                inviter.lastName,
                inviter.firstName,
                inviter.patronymic,
              )
            : null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      };
    });
  }

  private buildContextLabelFromView(view: InvitationListItem): string | null {
    if (view.role === 'student' && view.groupName) {
      return view.educationalProgramName
        ? `Група ${view.groupName} (${view.educationalProgramName})`
        : `Група ${view.groupName}`;
    }
    if (view.role === 'admin' && view.orgUnitId === null) {
      return SUPERADMIN_OPTION_LABEL;
    }
    if (view.orgUnitName) {
      return view.orgUnitShortName
        ? `${view.orgUnitName} (${view.orgUnitShortName})`
        : view.orgUnitName;
    }
    return null;
  }
}
