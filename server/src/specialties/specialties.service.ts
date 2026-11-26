import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { educationalPrograms, specialties } from '../database/schema.js';
import { OrgScopeService } from '../org-units/org-scope.service.js';
import {
  getPgErrorCode,
  getPgErrorMessage,
  type AdminActor,
} from '../org-units/org-units.types.js';
import type { CreateSpecialtyDto } from './dto/create-specialty.dto.js';
import type { DeactivateSpecialtyDto } from './dto/deactivate-specialty.dto.js';
import type { ReplaceSpecialtyDto } from './dto/replace-specialty.dto.js';
import type { UpdateSpecialtyDto } from './dto/update-specialty.dto.js';
import type {
  ReplaceSpecialtyResponse,
  SpecialtiesListResponse,
  SpecialtyItem,
  SpecialtyProgramsAction,
  SpecialtyRef,
} from './specialties.types.js';

type SpecialtyRow = typeof specialties.$inferSelect;

const SUPER_ADMIN_ONLY_MESSAGE =
  'Керувати довідником спеціальностей може лише головний адміністратор';

function toRef(row: SpecialtyRow): SpecialtyRef {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
  };
}

function compareByCode(a: { code: string }, b: { code: string }): number {
  return a.code.localeCompare(b.code, 'uk', {
    numeric: true,
    sensitivity: 'base',
  });
}

@Injectable()
export class SpecialtiesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scopeService: OrgScopeService,
  ) {}

  async findAll(
    userId: number,
    includeInactive: boolean,
  ): Promise<SpecialtiesListResponse> {
    const actor = await this.scopeService.getAdminActor(userId);

    const [allRows, programStatsRows] = await Promise.all([
      this.db.select().from(specialties),
      this.loadProgramStats(actor),
    ]);

    const items = this.buildSpecialtyItems(
      allRows,
      programStatsRows,
      actor.isSuperAdmin,
    );

    return {
      actor,
      specialties: includeInactive
        ? items
        : items.filter((item) => item.isActive),
    };
  }

  async findOne(userId: number, id: number): Promise<SpecialtyItem> {
    const actor = await this.scopeService.getAdminActor(userId);
    const [allRows, programStatsRows] = await Promise.all([
      this.db.select().from(specialties),
      this.loadProgramStats(actor),
    ]);

    const items = this.buildSpecialtyItems(
      allRows,
      programStatsRows,
      actor.isSuperAdmin,
    );
    const found = items.find((item) => item.id === id);
    if (!found) {
      throw new NotFoundException('Спеціальність не знайдено');
    }
    return found;
  }

  async create(userId: number, dto: CreateSpecialtyDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    try {
      const [created] = await this.db
        .insert(specialties)
        .values({
          code: dto.code,
          name: dto.name,
          isActive: true,
        })
        .returning();
      return created;
    } catch (err) {
      this.rethrowPgError(err, dto.code);
    }
  }

  async update(userId: number, id: number, dto: UpdateSpecialtyDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    const existing = await this.findSpecialtyOrThrow(id);
    const nextCode = dto.code ?? existing.code;
    const nextName = dto.name ?? existing.name;

    if (nextCode === existing.code && nextName === existing.name) {
      return existing;
    }

    try {
      const [updated] = await this.db
        .update(specialties)
        .set({
          code: nextCode,
          name: nextName,
        })
        .where(eq(specialties.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err, nextCode);
    }
  }

  async deactivate(userId: number, id: number, dto: DeactivateSpecialtyDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    const existing = await this.findSpecialtyOrThrow(id);

    if (!existing.isActive) {
      if (dto.reason === undefined || dto.reason === existing.deactivationReason) {
        return existing;
      }

      try {
        const [updated] = await this.db
          .update(specialties)
          .set({ deactivationReason: dto.reason })
          .where(eq(specialties.id, existing.id))
          .returning();
        return updated;
      } catch (err) {
        this.rethrowPgError(err);
      }
    }

    try {
      const [updated] = await this.db
        .update(specialties)
        .set({
          isActive: false,
          deactivationReason: dto.reason ?? null,
        })
        .where(eq(specialties.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async activate(userId: number, id: number) {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    const existing = await this.findSpecialtyOrThrow(id);
    if (existing.isActive) {
      return existing;
    }

    if (existing.replacedById !== null) {
      throw new ConflictException(
        `Неможливо активувати спеціальність «${existing.code}»: для неї вже вказано правонаступника`,
      );
    }

    try {
      const [updated] = await this.db
        .update(specialties)
        .set({ isActive: true })
        .where(eq(specialties.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async replace(
    userId: number,
    id: number,
    dto: ReplaceSpecialtyDto,
  ): Promise<ReplaceSpecialtyResponse> {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    const hasExistingTarget = dto.targetSpecialtyId !== undefined;
    const hasNewCode = dto.newCode !== undefined;
    const hasNewName = dto.newName !== undefined;
    const hasAnyNewField = hasNewCode || hasNewName;

    if (hasExistingTarget && hasAnyNewField) {
      throw new BadRequestException(
        'Вкажіть або існуючу спеціальність-правонаступника, або код і назву нової — але не обидва варіанти одночасно',
      );
    }

    if (!hasExistingTarget && (!hasNewCode || !hasNewName)) {
      throw new BadRequestException(
        'Необхідно обрати існуючу спеціальність-правонаступника або вказати код і назву нової спеціальності',
      );
    }

    const source = await this.findSpecialtyOrThrow(id);
    if (source.replacedById !== null) {
      throw new ConflictException(
        `Для спеціальності «${source.code}» вже вказано правонаступника`,
      );
    }

    const programsAction: SpecialtyProgramsAction = dto.programsAction ?? 'keep';

    try {
      return await this.db.transaction(async (tx) => {
        let target: SpecialtyRow;

        if (hasExistingTarget) {
          if (dto.targetSpecialtyId === source.id) {
            throw new BadRequestException(
              'Спеціальність не може бути правонаступником самої себе',
            );
          }

          const [foundTarget] = await tx
            .select()
            .from(specialties)
            .where(eq(specialties.id, dto.targetSpecialtyId!))
            .limit(1);

          if (!foundTarget) {
            throw new NotFoundException(
              'Цільову спеціальність-правонаступника не знайдено',
            );
          }

          if (!foundTarget.isActive) {
            throw new BadRequestException(
              `Правонаступником може бути лише активна спеціальність («${foundTarget.code}» неактивна)`,
            );
          }

          target = foundTarget;
        } else {
          const [createdTarget] = await tx
            .insert(specialties)
            .values({
              code: dto.newCode!,
              name: dto.newName!,
              isActive: true,
            })
            .returning();
          target = createdTarget;
        }

        const effectiveReason =
          dto.reason !== undefined ? dto.reason : source.deactivationReason;

        const [updatedSource] = await tx
          .update(specialties)
          .set({
            isActive: false,
            replacedById: target.id,
            deactivationReason: effectiveReason ?? null,
          })
          .where(eq(specialties.id, source.id))
          .returning();

        let clonedProgramsCount = 0;
        let linkedExistingProgramsCount = 0;

        if (programsAction === 'clone') {
          const activeSourcePrograms = await tx
            .select()
            .from(educationalPrograms)
            .where(
              and(
                eq(educationalPrograms.specialtyId, source.id),
                eq(educationalPrograms.isActive, true),
              ),
            );

          const programDeactivationReason =
            effectiveReason ??
            `Перекодування спеціальності ${source.code} → ${target.code}`;

          for (const program of activeSourcePrograms) {
            const [existingTargetProgram] = await tx
              .select()
              .from(educationalPrograms)
              .where(
                and(
                  eq(educationalPrograms.specialtyId, target.id),
                  eq(educationalPrograms.orgUnitId, program.orgUnitId),
                  eq(educationalPrograms.name, program.name),
                  eq(educationalPrograms.degreeLevel, program.degreeLevel),
                ),
              )
              .limit(1);

            let targetProgramId: number;

            if (existingTargetProgram) {
              if (!existingTargetProgram.isActive) {
                throw new ConflictException(
                  `Неможливо клонувати освітню програму «${program.name}»: на спеціальності «${target.code}» вже існує неактивна програма з такою ж назвою, кафедрою та рівнем освіти`,
                );
              }
              targetProgramId = existingTargetProgram.id;
              linkedExistingProgramsCount += 1;
            } else {
              const [cloned] = await tx
                .insert(educationalPrograms)
                .values({
                  specialtyId: target.id,
                  orgUnitId: program.orgUnitId,
                  name: program.name,
                  degreeLevel: program.degreeLevel,
                  isActive: true,
                })
                .returning({ id: educationalPrograms.id });
              targetProgramId = cloned.id;
              clonedProgramsCount += 1;
            }

            await tx
              .update(educationalPrograms)
              .set({
                isActive: false,
                replacedById: targetProgramId,
                deactivationReason: programDeactivationReason,
              })
              .where(eq(educationalPrograms.id, program.id));
          }
        }

        return {
          source: toRef(updatedSource),
          target: toRef(target),
          programsAction,
          clonedProgramsCount,
          linkedExistingProgramsCount,
        };
      });
    } catch (err) {
      this.rethrowPgError(err, dto.newCode);
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(actor, SUPER_ADMIN_ONLY_MESSAGE);

    const existing = await this.findSpecialtyOrThrow(id);

    const [programsCount, predecessorsCount] = await Promise.all([
      this.countPrograms(existing.id),
      this.countPredecessors(existing.id),
    ]);

    const blockers: string[] = [];
    if (programsCount > 0) {
      blockers.push(`освітні програми: ${programsCount}`);
    }
    if (predecessorsCount > 0) {
      blockers.push(`попередні спеціальності в історії замін: ${predecessorsCount}`);
    }

    if (blockers.length > 0) {
      throw new ConflictException(
        `Неможливо видалити спеціальність «${existing.code} — ${existing.name}»: є повʼязані записи (${blockers.join(', ')}). Використайте деактивацію або заміну.`,
      );
    }

    try {
      await this.db.delete(specialties).where(eq(specialties.id, existing.id));
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  /**
   * Повертає статистику ОП за спеціальностями в межах області видимості адміністратора:
   * для головного адміна — по всьому університету, для локального — лише по його піддереву.
   */
  private async loadProgramStats(actor: AdminActor) {
    if (actor.isSuperAdmin) {
      return this.db
        .select({
          specialtyId: educationalPrograms.specialtyId,
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${educationalPrograms.isActive})::int`,
        })
        .from(educationalPrograms)
        .groupBy(educationalPrograms.specialtyId);
    }

    if (actor.orgUnitId === null) {
      return [];
    }

    const subtree = await this.scopeService.getSubtreeNodes(actor.orgUnitId);
    const scopeIds = subtree.map((node) => node.id);
    if (scopeIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        specialtyId: educationalPrograms.specialtyId,
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${educationalPrograms.isActive})::int`,
      })
      .from(educationalPrograms)
      .where(inArray(educationalPrograms.orgUnitId, scopeIds))
      .groupBy(educationalPrograms.specialtyId);
  }

  private buildSpecialtyItems(
    rows: SpecialtyRow[],
    programStatsRows: Array<{
      specialtyId: number;
      total: number;
      active: number;
    }>,
    isSuperAdmin: boolean,
  ): SpecialtyItem[] {
    const byId = new Map<number, SpecialtyRow>();
    const replacedFromMap = new Map<number, SpecialtyRef[]>();

    for (const row of rows) {
      byId.set(row.id, row);
    }

    for (const row of rows) {
      if (row.replacedById !== null) {
        const list = replacedFromMap.get(row.replacedById) ?? [];
        list.push(toRef(row));
        replacedFromMap.set(row.replacedById, list);
      }
    }

    const programStatsMap = new Map<number, { total: number; active: number }>();
    for (const stat of programStatsRows) {
      programStatsMap.set(stat.specialtyId, {
        total: Number(stat.total),
        active: Number(stat.active),
      });
    }

    const resolveCurrentReplacement = (row: SpecialtyRow): SpecialtyRef | null => {
      if (row.replacedById === null) return null;
      const visited = new Set<number>([row.id]);
      let cursor = byId.get(row.replacedById);
      while (cursor && cursor.replacedById !== null && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        const next = byId.get(cursor.replacedById);
        if (!next) break;
        cursor = next;
      }
      return cursor ? toRef(cursor) : null;
    };

    return rows
      .map((row): SpecialtyItem => {
        const replacedByRow =
          row.replacedById !== null ? byId.get(row.replacedById) ?? null : null;
        const replacedFrom = (replacedFromMap.get(row.id) ?? []).sort(
          compareByCode,
        );
        const programStats = programStatsMap.get(row.id) ?? {
          total: 0,
          active: 0,
        };

        const counts = {
          programs: programStats.total,
          activePrograms: programStats.active,
          predecessors: replacedFrom.length,
        };

        return {
          id: row.id,
          code: row.code,
          name: row.name,
          isActive: row.isActive,
          replacedById: row.replacedById,
          replacedBy: replacedByRow ? toRef(replacedByRow) : null,
          currentReplacement: resolveCurrentReplacement(row),
          replacedFrom,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deactivatedAt: row.deactivatedAt,
          deactivationReason: row.deactivationReason,
          counts,
          canDelete:
            isSuperAdmin && counts.programs === 0 && counts.predecessors === 0,
        };
      })
      .sort(compareByCode);
  }

  private async findSpecialtyOrThrow(id: number): Promise<SpecialtyRow> {
    const found = await this.db.query.specialties.findFirst({
      where: eq(specialties.id, id),
    });
    if (!found) {
      throw new NotFoundException('Спеціальність не знайдено');
    }
    return found;
  }

  private async countPrograms(specialtyId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(educationalPrograms)
      .where(eq(educationalPrograms.specialtyId, specialtyId));
    return Number(row?.total ?? 0);
  }

  private async countPredecessors(specialtyId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(specialties)
      .where(eq(specialties.replacedById, specialtyId));
    return Number(row?.total ?? 0);
  }

  private rethrowPgError(err: unknown, codeContext?: string): never {
    const pgCode = getPgErrorCode(err);
    if (pgCode === '23505') {
      throw new ConflictException(
        codeContext
          ? `Спеціальність із кодом «${codeContext}» вже існує`
          : 'Запис із такими унікальними даними вже існує',
      );
    }
    if (pgCode === '23503') {
      throw new ConflictException(
        'Операцію відхилено: на цю спеціальність посилаються інші записи в системі',
      );
    }
    if (pgCode === '23514' || pgCode === 'P0001') {
      const detail = getPgErrorMessage(err);
      throw new ConflictException(
        detail
          ? `Порушення обмежень цілісності даних: ${detail}`
          : 'Операцію відхилено через порушення обмежень цілісності даних',
      );
    }
    throw err;
  }
}
