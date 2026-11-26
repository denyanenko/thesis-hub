import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { specialties } from './schema.js';
import { MON_2024_SPECIALTIES } from './mon-specialties.data.js';

async function runSpecialtiesSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL не вказано в .env');
  }

  console.log(
    '🌱 Наповнення довідника спеціальностей МОН (Постанова КМУ № 1021 від 30.08.2024)...',
  );

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    let created = 0;
    let existing = 0;

    await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({ code: specialties.code })
        .from(specialties);
      const existingCodes = new Set(
        existingRows.map((row) => row.code.trim().toUpperCase()),
      );

      for (const item of MON_2024_SPECIALTIES) {
        const normalizedCode = item.code.trim().toUpperCase();
        if (existingCodes.has(normalizedCode)) {
          existing += 1;
          continue;
        }

        await tx.insert(specialties).values({
          code: normalizedCode,
          name: item.name.trim(),
          isActive: true,
        });
        existingCodes.add(normalizedCode);
        created += 1;
      }
    });

    console.log(
      `✅ Готово! Додано нових спеціальностей: ${created}, уже існувало: ${existing} (усього в класифікаторі: ${MON_2024_SPECIALTIES.length}).`,
    );
  } catch (error) {
    console.error('❌ Помилка під час наповнення довідника спеціальностей:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSpecialtiesSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-specialties:', err);
  process.exit(1);
});
