import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import {
  orgUnitAllowedChildren,
  orgUnitHierarchyRules,
  orgUnits,
} from '../database/schema.js';
import { OrgScopeService } from './org-scope.service.js';
import {
  ORG_UNIT_TYPE_LABELS,
  formatParentTypeLabel,
  getPgErrorCode,
  getPgErrorMessage,
  type HierarchyRuleItem,
  type OrgUnitType,
} from './org-units.types.js';
import type {
  HierarchyRuleInputDto,
  ReplaceHierarchyRulesDto,
} from './dto/replace-hierarchy-rules.dto.js';

const TYPE_SORT_ORDER: Record<OrgUnitType, number> = {
  university: 0,
  institute: 1,
  faculty: 2,
  department: 3,
};

function ruleKey(
  childType: OrgUnitType,
  parentType: OrgUnitType | null,
): string {
  return `${parentType ?? 'ROOT'}->${childType}`;
}

@Injectable()
export class OrgHierarchyRulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scopeService: OrgScopeService,
  ) {}

  async getAll(): Promise<HierarchyRuleItem[]> {
    const rows = await this.db.select().from(orgUnitHierarchyRules);
    return rows
      .map((row) => ({
        id: row.id,
        childType: row.childType,
        parentType: row.parentType,
      }))
      .sort((a, b) => {
        const parentA = a.parentType === null ? -1 : TYPE_SORT_ORDER[a.parentType];
        const parentB = b.parentType === null ? -1 : TYPE_SORT_ORDER[b.parentType];
        if (parentA !== parentB) return parentA - parentB;
        return TYPE_SORT_ORDER[a.childType] - TYPE_SORT_ORDER[b.childType];
      });
  }

  async replaceAll(
    userId: number,
    dto: ReplaceHierarchyRulesDto,
  ): Promise<HierarchyRuleItem[]> {
    const actor = await this.scopeService.getAdminActor(userId);
    this.scopeService.assertSuperAdmin(
      actor,
      'Змінювати загальні правила ієрархії може лише головний адміністратор',
    );

    // Дедуплікуємо вхідні правила (важливо, зокрема, для пар із parentType = null)
    const uniqueRulesMap = new Map<string, HierarchyRuleInputDto>();
    for (const rule of dto.rules) {
      uniqueRulesMap.set(ruleKey(rule.childType, rule.parentType), {
        childType: rule.childType,
        parentType: rule.parentType,
      });
    }
    const desiredRules = [...uniqueRulesMap.values()];
    const desiredKeys = new Set(uniqueRulesMap.keys());

    // Явна перевірка: чи не стануть невалідними наявні активні org_units
    const allUnits = await this.db
      .select({
        id: orgUnits.id,
        parentId: orgUnits.parentId,
        unitType: orgUnits.unitType,
        name: orgUnits.name,
        isActive: orgUnits.isActive,
      })
      .from(orgUnits);

    const unitsById = new Map(allUnits.map((u) => [u.id, u]));
    const activeConflicts: string[] = [];

    for (const unit of allUnits) {
      if (!unit.isActive) continue;
      const parentType =
        unit.parentId !== null
          ? (unitsById.get(unit.parentId)?.unitType ?? null)
          : null;
      if (!desiredKeys.has(ruleKey(unit.unitType, parentType))) {
        activeConflicts.push(
          `«${unit.name}» (${ORG_UNIT_TYPE_LABELS[unit.unitType]} у ${formatParentTypeLabel(parentType)})`,
        );
      }
    }

    if (activeConflicts.length > 0) {
      const preview = activeConflicts.slice(0, 5).join(', ');
      const suffix =
        activeConflicts.length > 5
          ? ` та ще ${activeConflicts.length - 5}`
          : '';
      throw new ConflictException(
        `Неможливо зберегти правила: суперечать наявним активним підрозділам: ${preview}${suffix}`,
      );
    }

    // Визначаємо локальні обмеження, які стануть застарілими після видалення глобального правила
    const existingLocalRules = await this.db
      .select()
      .from(orgUnitAllowedChildren);
    const staleLocalRules = existingLocalRules.filter((localRule) => {
      const unit = unitsById.get(localRule.orgUnitId);
      if (!unit) return false;
      return !desiredKeys.has(ruleKey(localRule.childType, unit.unitType));
    });

    try {
      await this.db.transaction(async (tx) => {
        for (const stale of staleLocalRules) {
          await tx
            .delete(orgUnitAllowedChildren)
            .where(
              and(
                eq(orgUnitAllowedChildren.orgUnitId, stale.orgUnitId),
                eq(orgUnitAllowedChildren.childType, stale.childType),
              ),
            );
        }

        await tx.delete(orgUnitHierarchyRules);

        if (desiredRules.length > 0) {
          await tx.insert(orgUnitHierarchyRules).values(
            desiredRules.map((rule) => ({
              childType: rule.childType,
              parentType: rule.parentType,
            })),
          );
        }
      });
    } catch (err) {
      const code = getPgErrorCode(err);
      if (code === 'P0001') {
        const detail = getPgErrorMessage(err);
        throw new ConflictException(
          detail
            ? `Порушення правил ієрархії бази даних: ${detail}`
            : 'Неможливо застосувати правила ієрархії через конфлікт із наявними підрозділами',
        );
      }
      throw err;
    }

    return this.getAll();
  }
}
