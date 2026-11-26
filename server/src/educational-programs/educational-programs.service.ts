import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import {
  educationalPrograms,
  groups,
  orgUnits,
  specialties,
} from '../database/schema.js';
import { OrgScopeService } from '../org-units/org-scope.service.js';
import {
  getPgErrorCode,
  getPgErrorMessage,
  type AdminActor,
} from '../org-units/org-units.types.js';
import type { CreateEducationalProgramDto } from './dto/create-educational-program.dto.js';
import type { DeactivateEducationalProgramDto } from './dto/deactivate-educational-program.dto.js';
import type { ReplaceEducationalProgramDto } from './dto/replace-educational-program.dto.js';
import type { UpdateEducationalProgramDto } from './dto/update-educational-program.dto.js';
import type {
  DegreeLevel,
  EducationalProgramItem,
  EducationalProgramsListResponse,
  ProgramDepartmentRef,
  ProgramRef,
  ProgramSpecialtyRef,
  ReplaceEducationalProgramResponse,
} from './educational-programs.types.js';

type ProgramRow = typeof educationalPrograms.$inferSelect;
type SpecialtyRow = typeof specialties.$inferSelect;
type OrgUnitRow = typeof orgUnits.$inferSelect;

const DEGREE_SORT_ORDER: Record<DegreeLevel, number> = {
  bachelor: 0,
  master: 1,
  phd: 2,
};

function compareSpecialtyCodes(a: string, b: string): number {
  return a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' });
}

@Injectable()
export class EducationalProgramsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scopeService: OrgScopeService,
  ) {}

  async findAll(
    userId: number,
    includeInactive: boolean,
  ): Promise<EducationalProgramsListResponse> {
    const actor = await this.scopeService.getAdminActor(userId);
    const scopeUnitIds = await this.resolveScopeUnitIds(actor);

    const [allPrograms, allSpecialties, allUnits, groupStatsRows] =
      await Promise.all([
        this.db.select().from(educationalPrograms),
        this.db.select().from(specialties),
        this.db.select().from(orgUnits),
        this.db
          .select({
            educationalProgramId: groups.educationalProgramId,
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${groups.isActive})::int`,
          })
          .from(groups)
          .groupBy(groups.educationalProgramId),
      ]);

    const { items, departmentsById } = this.buildProgramItems(
      allPrograms,
      allSpecialties,
      allUnits,
      groupStatsRows,
    );

    const scopedItems = items.filter((item) => {
      if (scopeUnitIds !== null && !scopeUnitIds.has(item.orgUnitId)) {
        return false;
      }
      return includeInactive ? true : item.isActive;
    });

    const availableDepartments = [...departmentsById.values()]
      .filter((dept) => scopeUnitIds === null || scopeUnitIds.has(dept.id))
      .sort((a, b) => {
        const parentCompare = (a.parentName ?? '').localeCompare(
          b.parentName ?? '',
          'uk',
        );
        if (parentCompare !== 0) return parentCompare;
        return a.name.localeCompare(b.name, 'uk');
      });

    const activeSpecialties: ProgramSpecialtyRef[] = allSpecialties
      .filter((s) => s.isActive)
      .map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        isActive: s.isActive,
      }))
      .sort((a, b) => compareSpecialtyCodes(a.code, b.code));

    return {
      actor,
      programs: scopedItems,
      availableDepartments,
      activeSpecialties,
    };
  }

  async findOne(userId: number, id: number): Promise<EducationalProgramItem> {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findProgramOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, existing.orgUnitId, {
      includeSelf: true,
    });

    const [allPrograms, allSpecialties, allUnits, groupStatsRows] =
      await Promise.all([
        this.db.select().from(educationalPrograms),
        this.db.select().from(specialties),
        this.db.select().from(orgUnits),
        this.db
          .select({
            educationalProgramId: groups.educationalProgramId,
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${groups.isActive})::int`,
          })
          .from(groups)
          .groupBy(groups.educationalProgramId),
      ]);

    const { items } = this.buildProgramItems(
      allPrograms,
      allSpecialties,
      allUnits,
      groupStatsRows,
    );
    const found = items.find((item) => item.id === id);
    if (!found) {
      throw new NotFoundException('Освітню програму не знайдено');
    }
    return found;
  }

  async create(userId: number, dto: CreateEducationalProgramDto) {
    const actor = await this.scopeService.getAdminActor(userId);

    await this.assertDepartmentAllowed(actor, dto.orgUnitId, true);
    await this.assertSpecialtyAllowed(dto.specialtyId, true);

    try {
      const [created] = await this.db
        .insert(educationalPrograms)
        .values({
          specialtyId: dto.specialtyId,
          orgUnitId: dto.orgUnitId,
          name: dto.name,
          degreeLevel: dto.degreeLevel,
          isActive: true,
        })
        .returning();
      return created;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async update(userId: number, id: number, dto: UpdateEducationalProgramDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findProgramOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, existing.orgUnitId, {
      includeSelf: true,
    });

    const nextSpecialtyId = dto.specialtyId ?? existing.specialtyId;
    const nextOrgUnitId = dto.orgUnitId ?? existing.orgUnitId;
    const nextName = dto.name ?? existing.name;
    const nextDegreeLevel = dto.degreeLevel ?? existing.degreeLevel;

    if (
      nextSpecialtyId === existing.specialtyId &&
      nextOrgUnitId === existing.orgUnitId &&
      nextName === existing.name &&
      nextDegreeLevel === existing.degreeLevel
    ) {
      return existing;
    }

    if (nextOrgUnitId !== existing.orgUnitId) {
      await this.assertDepartmentAllowed(
        actor,
        nextOrgUnitId,
        existing.isActive,
      );
    }

    if (nextSpecialtyId !== existing.specialtyId) {
      await this.assertSpecialtyAllowed(nextSpecialtyId, existing.isActive);
    }

    try {
      const [updated] = await this.db
        .update(educationalPrograms)
        .set({
          specialtyId: nextSpecialtyId,
          orgUnitId: nextOrgUnitId,
          name: nextName,
          degreeLevel: nextDegreeLevel,
        })
        .where(eq(educationalPrograms.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async deactivate(
    userId: number,
    id: number,
    dto: DeactivateEducationalProgramDto,
  ) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findProgramOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, existing.orgUnitId, {
      includeSelf: true,
    });

    if (!existing.isActive) {
      if (
        dto.reason === undefined ||
        dto.reason === existing.deactivationReason
      ) {
        return existing;
      }

      try {
        const [updated] = await this.db
          .update(educationalPrograms)
          .set({ deactivationReason: dto.reason })
          .where(eq(educationalPrograms.id, existing.id))
          .returning();
        return updated;
      } catch (err) {
        this.rethrowPgError(err);
      }
    }

    try {
      const [updated] = await this.db
        .update(educationalPrograms)
        .set({
          isActive: false,
          deactivationReason: dto.reason ?? null,
        })
        .where(eq(educationalPrograms.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async activate(userId: number, id: number) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findProgramOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, existing.orgUnitId, {
      includeSelf: true,
    });

    if (existing.isActive) {
      return existing;
    }

    if (existing.replacedById !== null) {
      throw new ConflictException(
        `Неможливо активувати освітню програму «${existing.name}»: для неї вже вказано правонаступника`,
      );
    }

    await this.assertDepartmentAllowed(actor, existing.orgUnitId, true);
    await this.assertSpecialtyAllowed(existing.specialtyId, true);

    try {
      const [updated] = await this.db
        .update(educationalPrograms)
        .set({ isActive: true })
        .where(eq(educationalPrograms.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async replace(
    userId: number,
    id: number,
    dto: ReplaceEducationalProgramDto,
  ): Promise<ReplaceEducationalProgramResponse> {
    const actor = await this.scopeService.getAdminActor(userId);

    const hasExistingTarget = dto.targetProgramId !== undefined;
    const hasAnyNewField =
      dto.newName !== undefined ||
      dto.newSpecialtyId !== undefined ||
      dto.newOrgUnitId !== undefined ||
      dto.newDegreeLevel !== undefined;

    if (hasExistingTarget && hasAnyNewField) {
      throw new BadRequestException(
        'Вкажіть або існуючу ОП-правонаступника, або параметри нової ОП — але не обидва варіанти одночасно',
      );
    }

    if (!hasExistingTarget && !hasAnyNewField) {
      throw new BadRequestException(
        'Оберіть існуючу активну ОП-правонаступника або вкажіть оновлені параметри нової ОП',
      );
    }

    const source = await this.findProgramOrThrow(id);
    await this.scopeService.assertUnitInScope(actor, source.orgUnitId, {
      includeSelf: true,
    });

    if (source.replacedById !== null) {
      throw new ConflictException(
        `Для освітньої програми «${source.name}» вже вказано правонаступника`,
      );
    }

    let targetRow: ProgramRow;
    let sourceSpecialty: SpecialtyRow;
    let targetSpecialty: SpecialtyRow;
    let sourceDepartment: OrgUnitRow;
    let targetDepartment: OrgUnitRow;

    if (hasExistingTarget) {
      if (dto.targetProgramId === source.id) {
        throw new BadRequestException(
          'Освітня програма не може бути правонаступником самої себе',
        );
      }

      const foundTarget = await this.findProgramOrThrow(
        dto.targetProgramId!,
        'Цільову освітню програму-правонаступника не знайдено',
      );

      await this.scopeService.assertUnitInScope(
        actor,
        foundTarget.orgUnitId,
        { includeSelf: true },
        'Правонаступник має належати до кафедри у вашій зоні відповідальності',
      );

      if (!foundTarget.isActive) {
        throw new BadRequestException(
          `Правонаступником може бути лише активна освітня програма («${foundTarget.name}» неактивна)`,
        );
      }

      [sourceSpecialty, targetSpecialty, sourceDepartment, targetDepartment] =
        await Promise.all([
          this.findSpecialtyOrThrow(source.specialtyId),
          this.findSpecialtyOrThrow(foundTarget.specialtyId),
          this.findOrgUnitOrThrow(source.orgUnitId),
          this.findOrgUnitOrThrow(foundTarget.orgUnitId),
        ]);

      targetRow = foundTarget;
    } else {
      const nextSpecialtyId = dto.newSpecialtyId ?? source.specialtyId;
      const nextOrgUnitId = dto.newOrgUnitId ?? source.orgUnitId;
      const nextName = dto.newName ?? source.name;
      const nextDegreeLevel = dto.newDegreeLevel ?? source.degreeLevel;

      if (
        nextSpecialtyId === source.specialtyId &&
        nextOrgUnitId === source.orgUnitId &&
        nextName === source.name &&
        nextDegreeLevel === source.degreeLevel
      ) {
        throw new BadRequestException(
          'Нова освітня програма повинна відрізнятися від поточної назвою, спеціальністю, кафедрою або рівнем освіти',
        );
      }

      targetDepartment = await this.assertDepartmentAllowed(
        actor,
        nextOrgUnitId,
        true,
      );
      targetSpecialty = await this.assertSpecialtyAllowed(
        nextSpecialtyId,
        true,
      );
      [sourceSpecialty, sourceDepartment] = await Promise.all([
        this.findSpecialtyOrThrow(source.specialtyId),
        this.findOrgUnitOrThrow(source.orgUnitId),
      ]);

      targetRow = {
        ...source,
        specialtyId: nextSpecialtyId,
        orgUnitId: nextOrgUnitId,
        name: nextName,
        degreeLevel: nextDegreeLevel,
      };
    }

    try {
      return await this.db.transaction(async (tx) => {
        let finalTarget = targetRow;

        if (!hasExistingTarget) {
          const [createdTarget] = await tx
            .insert(educationalPrograms)
            .values({
              specialtyId: targetRow.specialtyId,
              orgUnitId: targetRow.orgUnitId,
              name: targetRow.name,
              degreeLevel: targetRow.degreeLevel,
              isActive: true,
            })
            .returning();
          finalTarget = createdTarget;
        }

        const effectiveReason =
          dto.reason !== undefined ? dto.reason : source.deactivationReason;

        const [updatedSource] = await tx
          .update(educationalPrograms)
          .set({
            isActive: false,
            replacedById: finalTarget.id,
            deactivationReason: effectiveReason ?? null,
          })
          .where(eq(educationalPrograms.id, source.id))
          .returning();

        return {
          source: {
            id: updatedSource.id,
            name: updatedSource.name,
            degreeLevel: updatedSource.degreeLevel,
            specialtyCode: sourceSpecialty.code,
            departmentName: sourceDepartment.name,
            departmentShortName: sourceDepartment.shortName,
            isActive: updatedSource.isActive,
          },
          target: {
            id: finalTarget.id,
            name: finalTarget.name,
            degreeLevel: finalTarget.degreeLevel,
            specialtyCode: targetSpecialty.code,
            departmentName: targetDepartment.name,
            departmentShortName: targetDepartment.shortName,
            isActive: finalTarget.isActive,
          },
        };
      });
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findProgramOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, existing.orgUnitId, {
      includeSelf: true,
    });

    const [groupsCount, predecessorsCount] = await Promise.all([
      this.countGroups(existing.id),
      this.countPredecessors(existing.id),
    ]);

    const blockers: string[] = [];
    if (groupsCount > 0) {
      blockers.push(`академічні групи: ${groupsCount}`);
    }
    if (predecessorsCount > 0) {
      blockers.push(`попередні ОП в історії замін: ${predecessorsCount}`);
    }

    if (blockers.length > 0) {
      throw new ConflictException(
        `Неможливо видалити освітню програму «${existing.name}»: є повʼязані записи (${blockers.join(', ')}). Використайте деактивацію або заміну.`,
      );
    }

    try {
      await this.db
        .delete(educationalPrograms)
        .where(eq(educationalPrograms.id, existing.id));
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  private async resolveScopeUnitIds(
    actor: AdminActor,
  ): Promise<Set<number> | null> {
    if (actor.isSuperAdmin) {
      return null;
    }
    if (actor.orgUnitId === null) {
      return new Set<number>();
    }
    const subtree = await this.scopeService.getSubtreeNodes(actor.orgUnitId);
    return new Set(subtree.map((node) => node.id));
  }

  private buildProgramItems(
    allPrograms: ProgramRow[],
    allSpecialties: SpecialtyRow[],
    allUnits: OrgUnitRow[],
    groupStatsRows: Array<{
      educationalProgramId: number;
      total: number;
      active: number;
    }>,
  ): {
    items: EducationalProgramItem[];
    departmentsById: Map<number, ProgramDepartmentRef>;
  } {
    const specialtiesById = new Map<number, ProgramSpecialtyRef>();
    for (const s of allSpecialties) {
      specialtiesById.set(s.id, {
        id: s.id,
        code: s.code,
        name: s.name,
        isActive: s.isActive,
      });
    }

    const unitsById = new Map<number, OrgUnitRow>();
    for (const u of allUnits) {
      unitsById.set(u.id, u);
    }

    const departmentsById = new Map<number, ProgramDepartmentRef>();
    for (const u of allUnits) {
      if (u.unitType !== 'department') continue;
      const parent = u.parentId !== null ? unitsById.get(u.parentId) : undefined;
      departmentsById.set(u.id, {
        id: u.id,
        name: u.name,
        shortName: u.shortName,
        parentName: parent?.name ?? null,
        parentShortName: parent?.shortName ?? null,
        isActive: u.isActive,
      });
    }

    const programsById = new Map<number, ProgramRow>();
    for (const p of allPrograms) {
      programsById.set(p.id, p);
    }

    const toProgramRef = (row: ProgramRow): ProgramRef => {
      const spec = specialtiesById.get(row.specialtyId);
      const dept = departmentsById.get(row.orgUnitId);
      return {
        id: row.id,
        name: row.name,
        degreeLevel: row.degreeLevel,
        specialtyCode: spec?.code ?? '?',
        departmentName: dept?.name ?? 'Невідома кафедра',
        departmentShortName: dept?.shortName ?? null,
        isActive: row.isActive,
      };
    };

    const replacedFromMap = new Map<number, ProgramRef[]>();
    for (const row of allPrograms) {
      if (row.replacedById !== null) {
        const list = replacedFromMap.get(row.replacedById) ?? [];
        list.push(toProgramRef(row));
        replacedFromMap.set(row.replacedById, list);
      }
    }

    const groupStatsMap = new Map<number, { total: number; active: number }>();
    for (const stat of groupStatsRows) {
      groupStatsMap.set(stat.educationalProgramId, {
        total: Number(stat.total),
        active: Number(stat.active),
      });
    }

    const resolveCurrentReplacement = (row: ProgramRow): ProgramRef | null => {
      if (row.replacedById === null) return null;
      const visited = new Set<number>([row.id]);
      let cursor = programsById.get(row.replacedById);
      while (cursor && cursor.replacedById !== null && !visited.has(cursor.id)) {
        visited.add(cursor.id);
        const next = programsById.get(cursor.replacedById);
        if (!next) break;
        cursor = next;
      }
      return cursor ? toProgramRef(cursor) : null;
    };

    const items: EducationalProgramItem[] = allPrograms
      .map((row): EducationalProgramItem => {
        const specialty = specialtiesById.get(row.specialtyId) ?? {
          id: row.specialtyId,
          code: '?',
          name: 'Невідома спеціальність',
          isActive: false,
        };
        const department = departmentsById.get(row.orgUnitId) ?? {
          id: row.orgUnitId,
          name: 'Невідома кафедра',
          shortName: null,
          parentName: null,
          parentShortName: null,
          isActive: false,
        };
        const replacedByRow =
          row.replacedById !== null
            ? programsById.get(row.replacedById) ?? null
            : null;
        const replacedFrom = (replacedFromMap.get(row.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name, 'uk'),
        );
        const gStats = groupStatsMap.get(row.id) ?? { total: 0, active: 0 };
        const counts = {
          groups: gStats.total,
          activeGroups: gStats.active,
          predecessors: replacedFrom.length,
        };

        return {
          id: row.id,
          specialtyId: row.specialtyId,
          orgUnitId: row.orgUnitId,
          name: row.name,
          degreeLevel: row.degreeLevel,
          isActive: row.isActive,
          replacedById: row.replacedById,
          replacedBy: replacedByRow ? toProgramRef(replacedByRow) : null,
          currentReplacement: resolveCurrentReplacement(row),
          replacedFrom,
          specialty,
          department,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deactivatedAt: row.deactivatedAt,
          deactivationReason: row.deactivationReason,
          counts,
          canDelete: counts.groups === 0 && counts.predecessors === 0,
        };
      })
      .sort((a, b) => {
        const specCmp = compareSpecialtyCodes(a.specialty.code, b.specialty.code);
        if (specCmp !== 0) return specCmp;
        const degCmp =
          DEGREE_SORT_ORDER[a.degreeLevel] - DEGREE_SORT_ORDER[b.degreeLevel];
        if (degCmp !== 0) return degCmp;
        return a.name.localeCompare(b.name, 'uk');
      });

    return { items, departmentsById };
  }

  private async assertDepartmentAllowed(
    actor: AdminActor,
    orgUnitId: number,
    requireActive: boolean,
  ): Promise<OrgUnitRow> {
    const unit = await this.findOrgUnitOrThrow(orgUnitId);
    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: true,
    });

    if (unit.unitType !== 'department') {
      throw new BadRequestException(
        `Освітню програму можна привʼязати лише до кафедри (підрозділ «${unit.name}» не є кафедрою)`,
      );
    }

    if (requireActive && !unit.isActive) {
      throw new BadRequestException(
        `Неможливо використати неактивну кафедру «${unit.name}»`,
      );
    }

    return unit;
  }

  private async assertSpecialtyAllowed(
    specialtyId: number,
    requireActive: boolean,
  ): Promise<SpecialtyRow> {
    const specialty = await this.findSpecialtyOrThrow(specialtyId);
    if (requireActive && !specialty.isActive) {
      throw new BadRequestException(
        `Неможливо привʼязати активну освітню програму до неактивної спеціальності «${specialty.code} — ${specialty.name}»`,
      );
    }
    return specialty;
  }

  private async findProgramOrThrow(
    id: number,
    notFoundMessage = 'Освітню програму не знайдено',
  ): Promise<ProgramRow> {
    const found = await this.db.query.educationalPrograms.findFirst({
      where: eq(educationalPrograms.id, id),
    });
    if (!found) {
      throw new NotFoundException(notFoundMessage);
    }
    return found;
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

  private async findOrgUnitOrThrow(id: number): Promise<OrgUnitRow> {
    const found = await this.db.query.orgUnits.findFirst({
      where: eq(orgUnits.id, id),
    });
    if (!found) {
      throw new NotFoundException('Підрозділ (кафедру) не знайдено');
    }
    return found;
  }

  private async countGroups(programId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(groups)
      .where(eq(groups.educationalProgramId, programId));
    return Number(row?.total ?? 0);
  }

  private async countPredecessors(programId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(educationalPrograms)
      .where(eq(educationalPrograms.replacedById, programId));
    return Number(row?.total ?? 0);
  }

  private rethrowPgError(err: unknown): never {
    const pgCode = getPgErrorCode(err);
    if (pgCode === '23505') {
      throw new ConflictException(
        'Освітня програма з такою назвою, рівнем освіти, спеціальністю та кафедрою вже існує',
      );
    }
    if (pgCode === '23503') {
      throw new ConflictException(
        'Операцію відхилено: на цю освітню програму посилаються інші записи в системі',
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
