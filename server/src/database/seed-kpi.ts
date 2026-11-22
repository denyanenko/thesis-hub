import 'dotenv/config';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { orgUnits } from './schema.js';
import {
  KPI_ORG_STRUCTURE,
  type SeedOrgUnitNode,
} from './kpi-structure.data.js';

interface SeedStats {
  created: number;
  existing: number;
}

type DbExecutor = Pick<ReturnType<typeof drizzle<typeof schema>>, 'select' | 'insert'>;

async function ensureNode(
  tx: DbExecutor,
  node: SeedOrgUnitNode,
  parentId: number | null,
  stats: SeedStats,
): Promise<number> {
  const [existing] = await tx
    .select({ id: orgUnits.id })
    .from(orgUnits)
    .where(
      and(
        parentId === null
          ? isNull(orgUnits.parentId)
          : eq(orgUnits.parentId, parentId),
        eq(orgUnits.unitType, node.unitType),
        eq(orgUnits.name, node.name),
      ),
    )
    .limit(1);

  let currentId: number;
  if (existing) {
    currentId = existing.id;
    stats.existing += 1;
  } else {
    const [inserted] = await tx
      .insert(orgUnits)
      .values({
        parentId,
        unitType: node.unitType,
        name: node.name,
        shortName: node.shortName,
        isActive: true,
      })
      .returning({ id: orgUnits.id });
    currentId = inserted.id;
    stats.created += 1;
  }

  for (const child of node.children ?? []) {
    await ensureNode(tx, child, currentId, stats);
  }

  return currentId;
}

async function runKpiSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL не вказано в .env');
  }

  console.log('🌱 Наповнення організаційної структури КПІ ім. Ігоря Сікорського...');

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const stats: SeedStats = { created: 0, existing: 0 };

    await db.transaction(async (tx) => {
      await ensureNode(tx, KPI_ORG_STRUCTURE, null, stats);
    });

    console.log(
      `✅ Готово! Додано нових підрозділів: ${stats.created}, уже існувало: ${stats.existing} (усього в структурі: ${stats.created + stats.existing}).`,
    );
  } catch (error) {
    console.error('❌ Помилка під час наповнення структури КПІ:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runKpiSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-kpi:', err);
  process.exit(1);
});
