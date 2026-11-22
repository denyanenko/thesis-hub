import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import {
  admins,
  educationalPrograms,
  orgUnitAllowedChildren,
  orgUnitHierarchyRules,
  orgUnits,
  supervisors,
} from '../database/schema.js';
import { OrgScopeService } from './org-scope.service.js';
import {
  ORG_UNIT_TYPES,
  ORG_UNIT_TYPE_LABELS,
  formatParentTypeLabel,
  getPgErrorCode,
  getPgErrorMessage,
  type HierarchyRuleItem,
  type OrgUnitCounts,
  type OrgUnitTreeItem,
  type OrgUnitType,
  type OrgUnitsTreeResponse,
} from './org-units.types.js';
import type { CreateOrgUnitDto } from './dto/create-org-unit.dto.js';
import type { UpdateOrgUnitDto } from './dto/update-org-unit.dto.js';
import type { MoveOrgUnitDto } from './dto/move-org-unit.dto.js';
import type { DeactivateOrgUnitDto } from './dto/deactivate-org-unit.dto.js';
import type { SetAllowedChildrenDto } from './dto/set-allowed-children.dto.js';

const TYPE_SORT_ORDER: Record<OrgUnitType, number> = {
  university: 0,
  institute: 1,
  faculty: 2,
  department: 3,
};

@Injectable()
export class OrgUnitsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scopeService: OrgScopeService,
  ) {}

  async getTree(
    userId: number,
    includeInactive: boolean,
  ): Promise<OrgUnitsTreeResponse> {
    const actor = await this.scopeService.getAdminActor(userId);

    const rulesRows = await this.db.select().from(orgUnitHierarchyRules);
    const hierarchyRules: HierarchyRuleItem[] = rulesRows.map((rule) => ({
      id: rule.id,
      childType: rule.childType,
      parentType: rule.parentType,
    }));

    const globalAllowedByParent = new Map<OrgUnitType, OrgUnitType[]>();
    for (const unitType of ORG_UNIT_TYPES) {
      globalAllowedByParent.set(unitType, []);
    }
    for (const rule of hierarchyRules) {
      if (rule.parentType !== null) {
        globalAllowedByParent.get(rule.parentType)?.push(rule.childType);
      }
    }

    let scopeIds: Set<number>;
    let unitsRows: (typeof orgUnits.$inferSelect)[];

    if (actor.isSuperAdmin) {
      unitsRows = await this.db
        .select()
        .from(orgUnits)
        .where(includeInactive ? undefined : eq(orgUnits.isActive, true));
      scopeIds = new Set(unitsRows.map((unit) => unit.id));
    } else {
      const visible = await this.scopeService.getVisibleIdsForAdmin(
        actor.orgUnitId!,
      );
      scopeIds = visible.scopeIds;
      const visibleIds = [...new Set([...visible.scopeIds, ...visible.ancestorIds])];

      if (visibleIds.length === 0) {
        return { actor, units: [], hierarchyRules };
      }

      unitsRows = await this.db
        .select()
        .from(orgUnits)
        .where(
          includeInactive
            ? inArray(orgUnits.id, visibleIds)
            : and(inArray(orgUnits.id, visibleIds), eq(orgUnits.isActive, true)),
        );
    }

    if (unitsRows.length === 0) {
      return { actor, units: [], hierarchyRules };
    }

    const unitIds = unitsRows.map((unit) => unit.id);

    const [
      allowedChildrenRows,
      childrenCountsRows,
      programsCountsRows,
      supervisorsCountsRows,
      adminsCountsRows,
    ] = await Promise.all([
      this.db
        .select()
        .from(orgUnitAllowedChildren)
        .where(inArray(orgUnitAllowedChildren.orgUnitId, unitIds)),
      this.db
        .select({
          parentId: orgUnits.parentId,
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${orgUnits.isActive})::int`,
        })
        .from(orgUnits)
        .where(inArray(orgUnits.parentId, unitIds))
        .groupBy(orgUnits.parentId),
      this.db
        .select({
          orgUnitId: educationalPrograms.orgUnitId,
          total: sql<number>`count(*)::int`,
        })
        .from(educationalPrograms)
        .where(inArray(educationalPrograms.orgUnitId, unitIds))
        .groupBy(educationalPrograms.orgUnitId),
      this.db
        .select({
          orgUnitId: supervisors.orgUnitId,
          total: sql<number>`count(*)::int`,
        })
        .from(supervisors)
        .where(inArray(supervisors.orgUnitId, unitIds))
        .groupBy(supervisors.orgUnitId),
      this.db
        .select({
          orgUnitId: admins.orgUnitId,
          total: sql<number>`count(*)::int`,
        })
        .from(admins)
        .where(inArray(admins.orgUnitId, unitIds))
        .groupBy(admins.orgUnitId),
    ]);

    const allowedByUnit = new Map<number, OrgUnitType[]>();
    for (const row of allowedChildrenRows) {
      const list = allowedByUnit.get(row.orgUnitId) ?? [];
      list.push(row.childType);
      allowedByUnit.set(row.orgUnitId, list);
    }

    const childrenCountMap = new Map<number, { total: number; active: number }>();
    for (const row of childrenCountsRows) {
      if (row.parentId !== null) {
        childrenCountMap.set(row.parentId, {
          total: Number(row.total),
          active: Number(row.active),
        });
      }
    }

    const programsCountMap = new Map<number, number>();
    for (const row of programsCountsRows) {
      programsCountMap.set(row.orgUnitId, Number(row.total));
    }

    const supervisorsCountMap = new Map<number, number>();
    for (const row of supervisorsCountsRows) {
      if (row.orgUnitId !== null) {
        supervisorsCountMap.set(row.orgUnitId, Number(row.total));
      }
    }

    const adminsCountMap = new Map<number, number>();
    for (const row of adminsCountsRows) {
      if (row.orgUnitId !== null) {
        adminsCountMap.set(row.orgUnitId, Number(row.total));
      }
    }

    const sortTypes = (types: OrgUnitType[]): OrgUnitType[] =>
      [...types].sort((a, b) => TYPE_SORT_ORDER[a] - TYPE_SORT_ORDER[b]);

    const units: OrgUnitTreeItem[] = unitsRows
      .map((unit) => {
        const inScope = actor.isSuperAdmin || scopeIds.has(unit.id);
        const canEdit = actor.isSuperAdmin || inScope;
        const canManage =
          actor.isSuperAdmin || (inScope && unit.id !== actor.orgUnitId);

        const childStats = childrenCountMap.get(unit.id) ?? {
          total: 0,
          active: 0,
        };
        const counts: OrgUnitCounts = {
          children: childStats.total,
          activeChildren: childStats.active,
          programs: programsCountMap.get(unit.id) ?? 0,
          supervisors: supervisorsCountMap.get(unit.id) ?? 0,
          admins: adminsCountMap.get(unit.id) ?? 0,
        };

        const rawLocalAllowed = allowedByUnit.get(unit.id);
        const allowedChildTypes =
          rawLocalAllowed && rawLocalAllowed.length > 0
            ? sortTypes(rawLocalAllowed)
            : null;
        const effectiveAllowedChildTypes =
          allowedChildTypes ??
          sortTypes(globalAllowedByParent.get(unit.unitType) ?? []);

        const isEmpty =
          counts.children === 0 &&
          counts.programs === 0 &&
          counts.supervisors === 0 &&
          counts.admins === 0;

        return {
          id: unit.id,
          parentId: unit.parentId,
          unitType: unit.unitType,
          name: unit.name,
          shortName: unit.shortName,
          isActive: unit.isActive,
          inScope,
          canEdit,
          canManage,
          canDelete: canManage && isEmpty,
          allowedChildTypes,
          effectiveAllowedChildTypes,
          counts,
        };
      })
      .sort((a, b) => {
        const typeDiff =
          TYPE_SORT_ORDER[a.unitType] - TYPE_SORT_ORDER[b.unitType];
        if (typeDiff !== 0) return typeDiff;
        return a.name.localeCompare(b.name, 'uk');
      });

    return { actor, units, hierarchyRules };
  }

  async create(userId: number, dto: CreateOrgUnitDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const parentId = dto.parentId ?? null;

    let parent: typeof orgUnits.$inferSelect | undefined;
    if (parentId === null) {
      this.scopeService.assertSuperAdmin(
        actor,
        'Створювати кореневі підрозділи може лише головний адміністратор',
      );
    } else {
      parent = await this.findUnitOrThrow(
        parentId,
        'Батьківський підрозділ не знайдено',
      );
      await this.scopeService.assertUnitInScope(actor, parent.id, {
        includeSelf: true,
      });
      if (!parent.isActive) {
        throw new BadRequestException(
          'Неможливо створити підрозділ у неактивному батьківському підрозділі',
        );
      }
    }

    await this.assertHierarchyPlacementAllowed(
      dto.unitType,
      parent ?? null,
    );

    try {
      const [created] = await this.db
        .insert(orgUnits)
        .values({
          parentId,
          unitType: dto.unitType,
          name: dto.name,
          shortName: dto.shortName ?? null,
          isActive: true,
        })
        .returning();
      return created;
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }
  }

  async update(userId: number, id: number, dto: UpdateOrgUnitDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    const isChangingType =
      dto.unitType !== undefined && dto.unitType !== unit.unitType;

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: !isChangingType,
    });

    const nextType = dto.unitType ?? unit.unitType;
    const nextName = dto.name ?? unit.name;
    const nextShortName =
      dto.shortName !== undefined ? dto.shortName : unit.shortName;

    let allowedTypesToKeep: OrgUnitType[] | null = null;

    if (isChangingType) {
      if (unit.unitType === 'department') {
        const [programsCount, supervisorsCount] = await Promise.all([
          this.countPrograms(unit.id),
          this.countSupervisors(unit.id),
        ]);
        if (programsCount > 0 || supervisorsCount > 0) {
          throw new ConflictException(
            'Неможливо змінити тип кафедри, доки до неї привʼязані освітні програми або наукові керівники',
          );
        }
      }

      if (unit.isActive) {
        const parent =
          unit.parentId !== null
            ? await this.findUnitOrThrow(
                unit.parentId,
                'Батьківський підрозділ не знайдено',
              )
            : null;

        await this.assertHierarchyPlacementAllowed(nextType, parent);
        await this.assertActiveChildrenCompatibleWithParentType(
          unit.id,
          nextType,
        );
      }

      const globalForNewType = await this.getGlobalAllowedChildTypes(nextType);
      const localAllowed = await this.db
        .select()
        .from(orgUnitAllowedChildren)
        .where(eq(orgUnitAllowedChildren.orgUnitId, unit.id));

      if (localAllowed.length > 0) {
        allowedTypesToKeep = localAllowed
          .map((row) => row.childType)
          .filter((childType) => globalForNewType.includes(childType));
      }
    }

    try {
      const updated = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .update(orgUnits)
          .set({
            unitType: nextType,
            name: nextName,
            shortName: nextShortName,
          })
          .where(eq(orgUnits.id, unit.id))
          .returning();

        if (isChangingType && allowedTypesToKeep !== null) {
          await tx
            .delete(orgUnitAllowedChildren)
            .where(eq(orgUnitAllowedChildren.orgUnitId, unit.id));

          if (allowedTypesToKeep.length > 0) {
            await tx.insert(orgUnitAllowedChildren).values(
              allowedTypesToKeep.map((childType) => ({
                orgUnitId: unit.id,
                childType,
              })),
            );
          }
        }

        return row;
      });
      return updated;
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }
  }

  async move(userId: number, id: number, dto: MoveOrgUnitDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: false,
    });

    const targetParentId = dto.parentId;
    if (targetParentId === unit.parentId) {
      return unit;
    }

    let targetParent: typeof orgUnits.$inferSelect | null = null;
    if (targetParentId === null) {
      this.scopeService.assertSuperAdmin(
        actor,
        'Переміщувати підрозділ на кореневий рівень може лише головний адміністратор',
      );
    } else {
      if (targetParentId === unit.id) {
        throw new BadRequestException(
          'Підрозділ не може бути підпорядкований сам собі',
        );
      }

      targetParent = await this.findUnitOrThrow(
        targetParentId,
        'Цільовий батьківський підрозділ не знайдено',
      );

      await this.scopeService.assertUnitInScope(actor, targetParent.id, {
        includeSelf: true,
      });

      const subtree = await this.scopeService.getSubtreeNodes(unit.id);
      if (subtree.some((node) => node.id === targetParent!.id)) {
        throw new BadRequestException(
          'Неможливо перемістити підрозділ всередину власного дочірнього підрозділу',
        );
      }
    }

    if (unit.isActive) {
      if (targetParent && !targetParent.isActive) {
        throw new BadRequestException(
          'Неможливо перемістити активний підрозділ під неактивний',
        );
      }
      await this.assertHierarchyPlacementAllowed(unit.unitType, targetParent);
    }

    try {
      const [updated] = await this.db
        .update(orgUnits)
        .set({ parentId: targetParentId })
        .where(eq(orgUnits.id, unit.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }
  }

  async deactivate(userId: number, id: number, dto: DeactivateOrgUnitDto) {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: false,
    });

    if (!unit.isActive) {
      return { deactivatedIds: [] as number[] };
    }

    const subtree = await this.scopeService.getSubtreeNodes(unit.id);
    const activeDescendants = subtree.filter(
      (node) => node.id !== unit.id && node.isActive,
    );

    if (activeDescendants.length > 0 && !dto.cascade) {
      throw new ConflictException(
        `Неможливо деактивувати підрозділ «${unit.name}»: у нього є активні дочірні підрозділи (${activeDescendants.length}). Оберіть каскадну деактивацію.`,
      );
    }

    // Деактивуємо знизу вгору (від найбільшої глибини до кореня),
    // щоб тригер check_org_unit_hierarchy на кожному кроці бачив відсутність активних дітей
    const activeNodesBottomUp = subtree
      .filter((node) => node.isActive)
      .sort((a, b) => b.depth - a.depth);

    try {
      await this.db.transaction(async (tx) => {
        for (const node of activeNodesBottomUp) {
          await tx
            .update(orgUnits)
            .set({ isActive: false })
            .where(eq(orgUnits.id, node.id));
        }
      });
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }

    return {
      deactivatedIds: activeNodesBottomUp.map((node) => node.id),
    };
  }

  async activate(userId: number, id: number) {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: false,
    });

    if (unit.isActive) {
      return unit;
    }

    const parent =
      unit.parentId !== null
        ? await this.findUnitOrThrow(
            unit.parentId,
            'Батьківський підрозділ не знайдено',
          )
        : null;

    if (parent && !parent.isActive) {
      throw new BadRequestException(
        `Неможливо активувати підрозділ «${unit.name}», доки батьківський підрозділ «${parent.name}» неактивний`,
      );
    }

    await this.assertHierarchyPlacementAllowed(unit.unitType, parent);

    try {
      const [updated] = await this.db
        .update(orgUnits)
        .set({ isActive: true })
        .where(eq(orgUnits.id, unit.id))
        .returning();
      return updated;
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: false,
    });

    const [childrenCount, programsCount, supervisorsCount, adminsCount] =
      await Promise.all([
        this.countChildren(unit.id),
        this.countPrograms(unit.id),
        this.countSupervisors(unit.id),
        this.countAdmins(unit.id),
      ]);

    const blockers: string[] = [];
    if (childrenCount > 0) blockers.push(`дочірні підрозділи: ${childrenCount}`);
    if (programsCount > 0) blockers.push(`освітні програми: ${programsCount}`);
    if (supervisorsCount > 0)
      blockers.push(`наукові керівники: ${supervisorsCount}`);
    if (adminsCount > 0) blockers.push(`адміністратори: ${adminsCount}`);

    if (blockers.length > 0) {
      throw new ConflictException(
        `Неможливо видалити підрозділ «${unit.name}»: є повʼязані записи (${blockers.join(', ')}). Використайте деактивацію.`,
      );
    }

    try {
      await this.db.delete(orgUnits).where(eq(orgUnits.id, unit.id));
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }
  }

  async setAllowedChildren(
    userId: number,
    id: number,
    dto: SetAllowedChildrenDto,
  ): Promise<{ allowedChildTypes: OrgUnitType[] | null }> {
    const actor = await this.scopeService.getAdminActor(userId);
    const unit = await this.findUnitOrThrow(id);

    await this.scopeService.assertUnitInScope(actor, unit.id, {
      includeSelf: true,
    });

    const uniqueTypes =
      dto.childTypes !== null
        ? [...new Set(dto.childTypes)].sort(
            (a, b) => TYPE_SORT_ORDER[a] - TYPE_SORT_ORDER[b],
          )
        : null;

    if (uniqueTypes !== null) {
      const globalAllowed = await this.getGlobalAllowedChildTypes(unit.unitType);
      const invalidTypes = uniqueTypes.filter(
        (childType) => !globalAllowed.includes(childType),
      );

      if (invalidTypes.length > 0) {
        const labels = invalidTypes
          .map((t) => ORG_UNIT_TYPE_LABELS[t])
          .join(', ');
        throw new BadRequestException(
          `Загальні правила ієрархії не дозволяють для типу «${ORG_UNIT_TYPE_LABELS[unit.unitType]}» дочірні типи: ${labels}`,
        );
      }

      const activeChildren = await this.db
        .select({
          id: orgUnits.id,
          name: orgUnits.name,
          unitType: orgUnits.unitType,
        })
        .from(orgUnits)
        .where(
          and(eq(orgUnits.parentId, unit.id), eq(orgUnits.isActive, true)),
        );

      const conflictingChildren = activeChildren.filter(
        (child) => !uniqueTypes.includes(child.unitType),
      );
      if (conflictingChildren.length > 0) {
        const preview = conflictingChildren
          .slice(0, 5)
          .map((c) => `«${c.name}» (${ORG_UNIT_TYPE_LABELS[c.unitType]})`)
          .join(', ');
        const suffix =
          conflictingChildren.length > 5
            ? ` та ще ${conflictingChildren.length - 5}`
            : '';
        throw new ConflictException(
          `Неможливо зберегти обмеження: у підрозділу вже є активні дочірні підрозділи забороненого типу: ${preview}${suffix}`,
        );
      }
    }

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .delete(orgUnitAllowedChildren)
          .where(eq(orgUnitAllowedChildren.orgUnitId, unit.id));

        if (uniqueTypes !== null) {
          await tx.insert(orgUnitAllowedChildren).values(
            uniqueTypes.map((childType) => ({
              orgUnitId: unit.id,
              childType,
            })),
          );
        }
      });
    } catch (err) {
      this.rethrowPgConstraintError(err);
    }

    return { allowedChildTypes: uniqueTypes };
  }

  private async findUnitOrThrow(
    id: number,
    notFoundMessage = 'Підрозділ не знайдено',
  ) {
    const unit = await this.db.query.orgUnits.findFirst({
      where: eq(orgUnits.id, id),
    });
    if (!unit) {
      throw new NotFoundException(notFoundMessage);
    }
    return unit;
  }

  private async getGlobalAllowedChildTypes(
    parentType: OrgUnitType,
  ): Promise<OrgUnitType[]> {
    const rules = await this.db
      .select({ childType: orgUnitHierarchyRules.childType })
      .from(orgUnitHierarchyRules)
      .where(eq(orgUnitHierarchyRules.parentType, parentType));
    return rules.map((r) => r.childType);
  }

  private async assertHierarchyPlacementAllowed(
    childType: OrgUnitType,
    parent: typeof orgUnits.$inferSelect | null,
  ): Promise<void> {
    const parentType = parent?.unitType ?? null;

    const matchingGlobal = await this.db
      .select({ id: orgUnitHierarchyRules.id })
      .from(orgUnitHierarchyRules)
      .where(
        and(
          eq(orgUnitHierarchyRules.childType, childType),
          parentType === null
            ? isNull(orgUnitHierarchyRules.parentType)
            : eq(orgUnitHierarchyRules.parentType, parentType),
        ),
      );

    if (matchingGlobal.length === 0) {
      throw new BadRequestException(
        parentType === null
          ? `Загальні правила ієрархії не дозволяють створювати «${ORG_UNIT_TYPE_LABELS[childType]}» на кореневому рівні`
          : `Загальні правила ієрархії не дозволяють підпорядковувати «${ORG_UNIT_TYPE_LABELS[childType]}» підрозділу типу «${formatParentTypeLabel(parentType)}»`,
      );
    }

    if (parent !== null) {
      const localAllowed = await this.db
        .select({ childType: orgUnitAllowedChildren.childType })
        .from(orgUnitAllowedChildren)
        .where(eq(orgUnitAllowedChildren.orgUnitId, parent.id));

      if (
        localAllowed.length > 0 &&
        !localAllowed.some((row) => row.childType === childType)
      ) {
        throw new BadRequestException(
          `Для підрозділу «${parent.name}» локальними правилами заборонено дочірні підрозділи типу «${ORG_UNIT_TYPE_LABELS[childType]}»`,
        );
      }
    }
  }

  private async assertActiveChildrenCompatibleWithParentType(
    parentId: number,
    newParentType: OrgUnitType,
  ): Promise<void> {
    const [activeChildren, globalAllowed] = await Promise.all([
      this.db
        .select({
          id: orgUnits.id,
          name: orgUnits.name,
          unitType: orgUnits.unitType,
        })
        .from(orgUnits)
        .where(
          and(eq(orgUnits.parentId, parentId), eq(orgUnits.isActive, true)),
        ),
      this.getGlobalAllowedChildTypes(newParentType),
    ]);

    const incompatible = activeChildren.filter(
      (child) => !globalAllowed.includes(child.unitType),
    );
    if (incompatible.length > 0) {
      const preview = incompatible
        .slice(0, 5)
        .map((c) => `«${c.name}» (${ORG_UNIT_TYPE_LABELS[c.unitType]})`)
        .join(', ');
      throw new ConflictException(
        `Неможливо змінити тип на «${ORG_UNIT_TYPE_LABELS[newParentType]}»: є несумісні активні дочірні підрозділи: ${preview}`,
      );
    }
  }

  private async countChildren(unitId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(orgUnits)
      .where(eq(orgUnits.parentId, unitId));
    return Number(row?.total ?? 0);
  }

  private async countPrograms(unitId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(educationalPrograms)
      .where(eq(educationalPrograms.orgUnitId, unitId));
    return Number(row?.total ?? 0);
  }

  private async countSupervisors(unitId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(supervisors)
      .where(eq(supervisors.orgUnitId, unitId));
    return Number(row?.total ?? 0);
  }

  private async countAdmins(unitId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(admins)
      .where(eq(admins.orgUnitId, unitId));
    return Number(row?.total ?? 0);
  }

  private rethrowPgConstraintError(err: unknown): never {
    const code = getPgErrorCode(err);
    if (code === '23503') {
      throw new ConflictException(
        'Операцію відхилено: на цей підрозділ посилаються інші записи в системі',
      );
    }
    if (code === 'P0001') {
      const detail = getPgErrorMessage(err);
      throw new ConflictException(
        detail
          ? `Порушення правил ієрархії бази даних: ${detail}`
          : 'Операцію відхилено через порушення правил ієрархії',
      );
    }
    throw err;
  }
}
