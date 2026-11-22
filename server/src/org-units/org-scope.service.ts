import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { admins } from '../database/schema.js';
import type { AdminActor } from './org-units.types.js';

export interface SubtreeNode {
  id: number;
  isActive: boolean;
  depth: number;
}

@Injectable()
export class OrgScopeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getAdminActor(userId: number): Promise<AdminActor> {
    const admin = await this.db.query.admins.findFirst({
      where: eq(admins.userId, userId),
    });

    if (!admin) {
      throw new ForbiddenException('Профіль адміністратора не знайдено');
    }

    return {
      userId,
      isSuperAdmin: admin.orgUnitId === null,
      orgUnitId: admin.orgUnitId,
    };
  }

  assertSuperAdmin(actor: AdminActor, message?: string): void {
    if (!actor.isSuperAdmin) {
      throw new ForbiddenException(
        message ?? 'Ця дія доступна лише головному адміністратору',
      );
    }
  }

  /**
   * Повертає id самої одиниці та всіх її предків догори до кореня.
   */
  async getAncestorIds(unitId: number): Promise<number[]> {
    const result = await this.db.execute<{ id: string | number }>(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 0 AS depth
        FROM org_units
        WHERE id = ${unitId}
        UNION ALL
        SELECT ou.id, ou.parent_id, a.depth + 1
        FROM org_units ou
        INNER JOIN ancestors a ON ou.id = a.parent_id
        WHERE a.depth < 64
      )
      SELECT id FROM ancestors
    `);

    return result.rows.map((row) => Number(row.id));
  }

  /**
   * Повертає саму одиницю та все її піддерево з глибиною (depth = 0 для кореня піддерева).
   */
  async getSubtreeNodes(rootUnitId: number): Promise<SubtreeNode[]> {
    const result = await this.db.execute<{
      id: string | number;
      is_active: boolean;
      depth: string | number;
    }>(sql`
      WITH RECURSIVE subtree AS (
        SELECT id, is_active, 0 AS depth
        FROM org_units
        WHERE id = ${rootUnitId}
        UNION ALL
        SELECT ou.id, ou.is_active, s.depth + 1
        FROM org_units ou
        INNER JOIN subtree s ON ou.parent_id = s.id
        WHERE s.depth < 64
      )
      SELECT id, is_active, depth FROM subtree
    `);

    return result.rows.map((row) => ({
      id: Number(row.id),
      isActive: Boolean(row.is_active),
      depth: Number(row.depth),
    }));
  }

  async isUnitInScope(
    actor: AdminActor,
    targetUnitId: number,
    options: { includeSelf: boolean },
  ): Promise<boolean> {
    if (actor.isSuperAdmin) {
      return true;
    }
    if (actor.orgUnitId === null) {
      return false;
    }
    if (!options.includeSelf && targetUnitId === actor.orgUnitId) {
      return false;
    }

    const ancestorIds = await this.getAncestorIds(targetUnitId);
    return ancestorIds.includes(actor.orgUnitId);
  }

  async assertUnitInScope(
    actor: AdminActor,
    targetUnitId: number,
    options: { includeSelf: boolean },
    message?: string,
  ): Promise<void> {
    const allowed = await this.isUnitInScope(actor, targetUnitId, options);
    if (!allowed) {
      throw new ForbiddenException(
        message ??
          (options.includeSelf
            ? 'Недостатньо прав для роботи з цим підрозділом'
            : 'Недостатньо прав: цю дію можна виконувати лише з підпорядкованими підрозділами'),
      );
    }
  }

  /**
   * Для локального адміна повертає множину одиниць у його зоні відповідальності
   * (власна одиниця + піддерево) та множину предків вище (лише для довідки).
   */
  async getVisibleIdsForAdmin(rootUnitId: number): Promise<{
    scopeIds: Set<number>;
    ancestorIds: Set<number>;
  }> {
    const [subtree, ancestors] = await Promise.all([
      this.getSubtreeNodes(rootUnitId),
      this.getAncestorIds(rootUnitId),
    ]);

    const scopeIds = new Set(subtree.map((node) => node.id));
    const ancestorIds = new Set(ancestors.filter((id) => id !== rootUnitId));

    return { scopeIds, ancestorIds };
  }
}
