import 'dotenv/config';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { users } from './schema.js';
import { getDevSeedConfig } from './seed-dev/seed-dev.utils.js';

async function runDevCleanup() {
  const config = getDevSeedConfig();
  console.log(
    `🧹 [DEV] Видалення тестових користувачів з доменом @${config.emailDomain}...`,
  );

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const deleted = await db
      .delete(users)
      .where(ilike(users.email, `%@${config.emailDomain}`))
      .returning({ id: users.id, role: users.role });

    const adminCount = deleted.filter((u) => u.role === 'admin').length;
    const supervisorCount = deleted.filter((u) => u.role === 'supervisor').length;
    const studentCount = deleted.filter((u) => u.role === 'student').length;

    await Promise.all([
      rm(path.join(config.outputDir, 'dev-admins.md'), { force: true }),
      rm(path.join(config.outputDir, 'dev-supervisors.md'), { force: true }),
      rm(path.join(config.outputDir, 'dev-students.md'), { force: true }),
    ]);

    console.log(
      `✅ [DEV] Видалено користувачів: ${deleted.length} (адмінів: ${adminCount}, керівників: ${supervisorCount}, студентів: ${studentCount}).`,
    );
  } catch (error) {
    console.error('❌ Помилка під час очищення dev-користувачів:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevCleanup().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-cleanup:', err);
  process.exit(1);
});
