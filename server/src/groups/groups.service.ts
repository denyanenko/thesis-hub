import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import {
  educationalPrograms,
  groups,
  orgUnits,
  specialties,
  students,
  users,
} from '../database/schema.js';
import type {
  DegreeLevel,
  ProgramDepartmentRef,
  ProgramSpecialtyRef,
} from '../educational-programs/educational-programs.types.js';
import { OrgScopeService } from '../org-units/org-scope.service.js';
import {
  getPgErrorCode,
  getPgErrorMessage,
  type AdminActor,
} from '../org-units/org-units.types.js';
import type { CreateGroupDto } from './dto/create-group.dto.js';
import type { UpdateGroupDto } from './dto/update-group.dto.js';
import type {
  GroupItem,
  GroupProgramRef,
  GroupsListResponse,
} from './groups.types.js';

type GroupRow = typeof groups.$inferSelect;
type ProgramRow = typeof educationalPrograms.$inferSelect;
type SpecialtyRow = typeof specialties.$inferSelect;
type OrgUnitRow = typeof orgUnits.$inferSelect;

const DEGREE_SORT_ORDER: Record<DegreeLevel, number> = {
  bachelor: 0,
  master: 1,
  phd: 2,
};

function compareGroupNames(a: string, b: string): number {
  return a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' });
}

function compareSpecialtyCodes(a: string, b: string): number {
  return a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' });
}

@Injectable()
export class GroupsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scopeService: OrgScopeService,
  ) {}

  async findAll(
    userId: number,
    includeInactive: boolean,
  ): Promise<GroupsListResponse> {
    const actor = await this.scopeService.getAdminActor(userId);
    const scopeUnitIds = await this.resolveScopeUnitIds(actor);

    const [
      allGroups,
      allPrograms,
      allSpecialties,
      allUnits,
      studentStatsRows,
    ] = await Promise.all([
      this.db.select().from(groups),
      this.db.select().from(educationalPrograms),
      this.db.select().from(specialties),
      this.db.select().from(orgUnits),
      this.db
        .select({
          groupId: students.groupId,
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${users.isActive})::int`,
        })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(isNotNull(students.groupId))
        .groupBy(students.groupId),
    ]);

    const { items, programsById, departmentsById } = this.buildGroupItems(
      allGroups,
      allPrograms,
      allSpecialties,
      allUnits,
      studentStatsRows,
    );

    const scopedGroups = items.filter((item) => {
      if (
        scopeUnitIds !== null &&
        !scopeUnitIds.has(item.program.department.id)
      ) {
        return false;
      }
      return includeInactive ? true : item.isActive;
    });

    const availablePrograms = [...programsById.values()]
      .filter(
        (program) =>
          scopeUnitIds === null || scopeUnitIds.has(program.department.id),
      )
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        const specCmp = compareSpecialtyCodes(
          a.specialty.code,
          b.specialty.code,
        );
        if (specCmp !== 0) return specCmp;
        const degCmp =
          DEGREE_SORT_ORDER[a.degreeLevel] - DEGREE_SORT_ORDER[b.degreeLevel];
        if (degCmp !== 0) return degCmp;
        const nameCmp = a.name.localeCompare(b.name, 'uk');
        if (nameCmp !== 0) return nameCmp;
        return a.department.name.localeCompare(b.department.name, 'uk');
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

    return {
      actor,
      groups: scopedGroups,
      availablePrograms,
      availableDepartments,
    };
  }

  async findOne(userId: number, id: number): Promise<GroupItem> {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findGroupOrThrow(id);
    const program = await this.findProgramOrThrow(
      existing.educationalProgramId,
    );

    await this.scopeService.assertUnitInScope(actor, program.orgUnitId, {
      includeSelf: true,
    });

    const [
      allGroups,
      allPrograms,
      allSpecialties,
      allUnits,
      studentStatsRows,
    ] = await Promise.all([
      this.db.select().from(groups),
      this.db.select().from(educationalPrograms),
      this.db.select().from(specialties),
      this.db.select().from(orgUnits),
      this.db
        .select({
          groupId: students.groupId,
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${users.isActive})::int`,
        })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(isNotNull(students.groupId))
        .groupBy(students.groupId),
    ]);

    const { items } = this.buildGroupItems(
      allGroups,
      allPrograms,
      allSpecialties,
      allUnits,
      studentStatsRows,
    );
    const found = items.find((item) => item.id === id);
    if (!found) {
      throw new NotFoundException('Академічну групу не знайдено');
    }
    return found;
  }

  async create(userId: number, dto: CreateGroupDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    await this.assertProgramAllowed(actor, dto.educationalProgramId, true);

    try {
      const [created] = await this.db
        .insert(groups)
        .values({
          educationalProgramId: dto.educationalProgramId,
          name: dto.name,
          enrollmentYear: dto.enrollmentYear ?? null,
          isActive: true,
        })
        .returning();
      return created;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async update(userId: number, id: number, dto: UpdateGroupDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findGroupOrThrow(id);
    const currentProgram = await this.findProgramOrThrow(
      existing.educationalProgramId,
    );

    await this.scopeService.assertUnitInScope(actor, currentProgram.orgUnitId, {
      includeSelf: true,
    });

    const nextProgramId =
      dto.educationalProgramId ?? existing.educationalProgramId;
    const nextName = dto.name ?? existing.name;
    const nextEnrollmentYear =
      dto.enrollmentYear !== undefined
        ? dto.enrollmentYear
        : existing.enrollmentYear;

    if (
      nextProgramId === existing.educationalProgramId &&
      nextName === existing.name &&
      nextEnrollmentYear === existing.enrollmentYear
    ) {
      return existing;
    }

    if (nextProgramId !== existing.educationalProgramId) {
      await this.assertProgramAllowed(actor, nextProgramId, existing.isActive);
    }

    try {
      const [updated] = await this.db
        .update(groups)
        .set({
          educationalProgramId: nextProgramId,
          name: nextName,
          enrollmentYear: nextEnrollmentYear,
        })
        .where(eq(groups.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async deactivate(userId: number, id: number) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findGroupOrThrow(id);
    const program = await this.findProgramOrThrow(
      existing.educationalProgramId,
    );

    await this.scopeService.assertUnitInScope(actor, program.orgUnitId, {
      includeSelf: true,
    });

    if (!existing.isActive) {
      return existing;
    }

    try {
      const [updated] = await this.db
        .update(groups)
        .set({ isActive: false })
        .where(eq(groups.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async activate(userId: number, id: number) {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findGroupOrThrow(id);

    await this.assertProgramAllowed(actor, existing.educationalProgramId, true);

    if (existing.isActive) {
      return existing;
    }

    try {
      const [updated] = await this.db
        .update(groups)
        .set({ isActive: true })
        .where(eq(groups.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    const actor = await this.scopeService.getAdminActor(userId);
    const existing = await this.findGroupOrThrow(id);
    const program = await this.findProgramOrThrow(
      existing.educationalProgramId,
    );

    await this.scopeService.assertUnitInScope(actor, program.orgUnitId, {
      includeSelf: true,
    });

    const [{ count: studentsCount }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.groupId, existing.id));

    if (studentsCount > 0) {
      throw new ConflictException(
        'Не можна видалити групу, до якої привʼязані студенти. Замість видалення переведіть її в архів (деактивуйте).',
      );
    }

    try {
      await this.db.delete(groups).where(eq(groups.id, existing.id));
    } catch (err) {
      this.rethrowPgError(err);
    }
  }

  private async resolveScopeUnitIds(
    actor: AdminActor,
  ): Promise<Set<number> | null> {
    if (actor.isSuperAdmin) return null;
    if (actor.orgUnitId === null) return new Set();
    const nodes = await this.scopeService.getSubtreeNodes(actor.orgUnitId);
    return new Set(nodes.map((node) => node.id));
  }

  private async findGroupOrThrow(id: number): Promise<GroupRow> {
    const [row] = await this.db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Академічну групу не знайдено');
    }
    return row;
  }

  private async findProgramOrThrow(id: number): Promise<ProgramRow> {
    const [row] = await this.db
      .select()
      .from(educationalPrograms)
      .where(eq(educationalPrograms.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Освітню програму не знайдено');
    }
    return row;
  }

  private async assertProgramAllowed(
    actor: AdminActor,
    educationalProgramId: number,
    requireActive: boolean,
  ): Promise<ProgramRow> {
    const program = await this.findProgramOrThrow(educationalProgramId);

    await this.scopeService.assertUnitInScope(actor, program.orgUnitId, {
      includeSelf: true,
    });

    if (requireActive && !program.isActive) {
      throw new BadRequestException(
        'Не можна створити або активувати групу для неактивної освітньої програми',
      );
    }

    const [dept] = await this.db
      .select()
      .from(orgUnits)
      .where(eq(orgUnits.id, program.orgUnitId))
      .limit(1);

    if (!dept) {
      throw new NotFoundException('Випускову кафедру не знайдено');
    }

    if (requireActive && !dept.isActive) {
      throw new BadRequestException(
        'Не можна створити або активувати групу на неактивній кафедрі',
      );
    }

    return program;
  }

  private buildGroupItems(
    allGroups: GroupRow[],
    allPrograms: ProgramRow[],
    allSpecialties: SpecialtyRow[],
    allUnits: OrgUnitRow[],
    studentStatsRows: {
      groupId: number | null;
      total: number;
      active: number;
    }[],
  ): {
    items: GroupItem[];
    programsById: Map<number, GroupProgramRef>;
    departmentsById: Map<number, ProgramDepartmentRef>;
  } {
    const unitsById = new Map(allUnits.map((u) => [u.id, u]));
    const departmentsById = new Map<number, ProgramDepartmentRef>();
    for (const unit of allUnits) {
      if (unit.unitType !== 'department') continue;
      const parent =
        unit.parentId !== null ? (unitsById.get(unit.parentId) ?? null) : null;
      departmentsById.set(unit.id, {
        id: unit.id,
        name: unit.name,
        shortName: unit.shortName,
        parentName: parent?.name ?? null,
        parentShortName: parent?.shortName ?? null,
        isActive: unit.isActive,
      });
    }

    const specialtiesById = new Map<number, ProgramSpecialtyRef>(
      allSpecialties.map((s) => [
        s.id,
        {
          id: s.id,
          code: s.code,
          name: s.name,
          isActive: s.isActive,
        },
      ]),
    );

    const programsById = new Map<number, GroupProgramRef>();
    for (const program of allPrograms) {
      const specialty = specialtiesById.get(program.specialtyId) ?? {
        id: program.specialtyId,
        code: '?',
        name: 'Невідома спеціальність',
        isActive: false,
      };
      const department = departmentsById.get(program.orgUnitId) ?? {
        id: program.orgUnitId,
        name: 'Невідома кафедра',
        shortName: null,
        parentName: null,
        parentShortName: null,
        isActive: false,
      };
      programsById.set(program.id, {
        id: program.id,
        name: program.name,
        degreeLevel: program.degreeLevel,
        isActive: program.isActive,
        specialty,
        department,
      });
    }

    const studentStatsByGroupId = new Map<
      number,
      { total: number; active: number }
    >();
    for (const stat of studentStatsRows) {
      if (stat.groupId !== null) {
        studentStatsByGroupId.set(stat.groupId, {
          total: Number(stat.total),
          active: Number(stat.active),
        });
      }
    }

    const items: GroupItem[] = allGroups
      .map((row) => {
        const program = programsById.get(row.educationalProgramId) ?? {
          id: row.educationalProgramId,
          name: 'Невідома освітня програма',
          degreeLevel: 'bachelor' as DegreeLevel,
          isActive: false,
          specialty: {
            id: 0,
            code: '?',
            name: 'Невідома спеціальність',
            isActive: false,
          },
          department: {
            id: 0,
            name: 'Невідома кафедра',
            shortName: null,
            parentName: null,
            parentShortName: null,
            isActive: false,
          },
        };
        const stat = studentStatsByGroupId.get(row.id) ?? {
          total: 0,
          active: 0,
        };

        return {
          id: row.id,
          educationalProgramId: row.educationalProgramId,
          name: row.name,
          enrollmentYear: row.enrollmentYear,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deactivatedAt: row.deactivatedAt,
          program,
          counts: {
            students: stat.total,
            activeStudents: stat.active,
          },
          canDelete: stat.total === 0,
        };
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        const yearA = a.enrollmentYear ?? -1;
        const yearB = b.enrollmentYear ?? -1;
        if (yearA !== yearB) return yearB - yearA;
        const nameCmp = compareGroupNames(a.name, b.name);
        if (nameCmp !== 0) return nameCmp;
        return a.id - b.id;
      });

    return { items, programsById, departmentsById };
  }

  private rethrowPgError(err: unknown): never {
    const code = getPgErrorCode(err);
    const message = getPgErrorMessage(err);

    if (code === '23505') {
      throw new ConflictException(
        'У межах цієї освітньої програми вже існує група з такою назвою',
      );
    }
    if (code === '23503') {
      throw new ConflictException(
        'Неможливо виконати операцію через повʼязані записи у базі даних',
      );
    }
    if (code === '23514' || code === 'P0001') {
      throw new BadRequestException(
        message || 'Порушено обмеження цілісності даних академічної групи',
      );
    }
    throw err;
  }
}
