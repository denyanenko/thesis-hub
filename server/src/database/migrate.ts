import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';

interface MigrationFile {
  filename: string;
  fullPath: string;
  sql: string;
  checksum: string;
}

interface AppliedMigrationRow {
  filename: string;
  checksum: string;
  applied_at: Date;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), '..', 'database', 'migrations');
const DEFAULT_BASELINE_FILE = '0001_initial_schema.sql';

function computeChecksum(sql: string): string {
  const normalized = sql.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const migrations: MigrationFile[] = [];
  for (const filename of sqlFiles) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sql = await readFile(fullPath, 'utf8');
    migrations.push({
      filename,
      fullPath,
      sql,
      checksum: computeChecksum(sql),
    });
  }

  return migrations;
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS meta;`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS meta.schema_migrations (
      id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(
  client: PoolClient,
): Promise<Map<string, AppliedMigrationRow>> {
  const result = await client.query<AppliedMigrationRow>(
    `SELECT filename, checksum, applied_at
     FROM meta.schema_migrations
     ORDER BY filename ASC;`,
  );

  return new Map(result.rows.map((row) => [row.filename, row]));
}

async function hasExistingPublicTables(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE';`,
  );
  return Number(result.rows[0]?.count ?? '0') > 0;
}

function parseArgs(argv: readonly string[]): {
  mode: 'migrate' | 'baseline' | 'status';
  upTo?: string;
} {
  if (argv.includes('--status')) {
    return { mode: 'status' };
  }

  if (argv.includes('--baseline')) {
    const upToIndex = argv.indexOf('--up-to');
    const upTo =
      upToIndex !== -1 && argv[upToIndex + 1]
        ? argv[upToIndex + 1]
        : DEFAULT_BASELINE_FILE;
    return { mode: 'baseline', upTo };
  }

  return { mode: 'migrate' };
}

async function runStatus(
  client: PoolClient,
  files: readonly MigrationFile[],
): Promise<void> {
  await ensureMigrationsTable(client);
  const applied = await getAppliedMigrations(client);

  console.log(`📂 Директорія міграцій: ${MIGRATIONS_DIR}`);
  if (files.length === 0) {
    console.log('ℹ️ Файлів міграцій не знайдено.');
    return;
  }

  for (const file of files) {
    const record = applied.get(file.filename);
    if (!record) {
      console.log(`⏳ [PENDING]  ${file.filename}`);
    } else if (record.checksum !== file.checksum) {
      console.log(
        `⚠️ [MODIFIED] ${file.filename} (застосовано ${record.applied_at.toISOString()}, але checksum файлу змінився!)`,
      );
    } else {
      console.log(
        `✅ [APPLIED]  ${file.filename} (${record.applied_at.toISOString()})`,
      );
    }
  }
}

async function runBaseline(
  client: PoolClient,
  files: readonly MigrationFile[],
  upTo: string,
): Promise<void> {
  await ensureMigrationsTable(client);

  const hasPublic = await hasExistingPublicTables(client);
  if (!hasPublic) {
    throw new Error(
      'Схема public порожня — baseline потрібен лише для вже розгорнутої БД. Для чистої БД запустіть `pnpm db:migrate`.',
    );
  }

  const targetIndex = files.findIndex((f) => f.filename === upTo);
  if (targetIndex === -1) {
    throw new Error(
      `Файл міграції "${upTo}" не знайдено у ${MIGRATIONS_DIR}.`,
    );
  }

  const toMark = files.slice(0, targetIndex + 1);
  let markedCount = 0;

  await client.query('BEGIN');
  try {
    for (const file of toMark) {
      const res = await client.query(
        `INSERT INTO meta.schema_migrations (filename, checksum)
         VALUES ($1, $2)
         ON CONFLICT (filename) DO NOTHING;`,
        [file.filename, file.checksum],
      );
      if ((res.rowCount ?? 0) > 0) {
        markedCount += 1;
        console.log(`📌 [BASELINE] Позначено як застосовану: ${file.filename}`);
      } else {
        console.log(`ℹ️ [BASELINE] Уже була позначена: ${file.filename}`);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  console.log(
    `✅ Baseline завершено! Нових позначених міграцій: ${markedCount}.`,
  );
}

async function runMigrate(
  client: PoolClient,
  files: readonly MigrationFile[],
): Promise<void> {
  await ensureMigrationsTable(client);
  const applied = await getAppliedMigrations(client);

  // Захист від випадкового накату 0001_initial_schema.sql на вже існуючу БД без baseline
  if (applied.size === 0 && (await hasExistingPublicTables(client))) {
    throw new Error(
      'У БД вже існують таблиці в схемі public, але meta.schema_migrations порожня. Спочатку виконайте `pnpm db:migrate:baseline`, щоб зафіксувати поточну схему без втрати даних.',
    );
  }

  // Перевіряємо цілісність уже застосованих міграцій
  for (const file of files) {
    const existing = applied.get(file.filename);
    if (existing && existing.checksum !== file.checksum) {
      throw new Error(
        `Checksum уже застосованої міграції "${file.filename}" не збігається! Не редагуйте старі міграції — створіть новий файл міграції.`,
      );
    }
  }

  const pending = files.filter((f) => !applied.has(f.filename));
  if (pending.length === 0) {
    console.log('✅ Усі міграції вже застосовані. База даних актуальна.');
    return;
  }

  for (const file of pending) {
    console.log(`🚀 Застосування міграції: ${file.filename}...`);
    await client.query('BEGIN');
    try {
      await client.query(file.sql);
      await client.query(
        `INSERT INTO meta.schema_migrations (filename, checksum)
         VALUES ($1, $2);`,
        [file.filename, file.checksum],
      );
      await client.query('COMMIT');
      console.log(`✅ Міграцію ${file.filename} успішно застосовано.`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Помилка під час застосування ${file.filename}:`);
      throw error;
    }
  }

  console.log(`🎉 Готово! Застосовано міграцій: ${pending.length}.`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL не вказано в .env');
  }

  const { mode, upTo } = parseArgs(process.argv.slice(2));
  const files = await loadMigrationFiles();

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    if (mode === 'status') {
      await runStatus(client, files);
    } else if (mode === 'baseline') {
      await runBaseline(client, files, upTo ?? DEFAULT_BASELINE_FILE);
    } else {
      await runMigrate(client, files);
    }
  } catch (error) {
    console.error('❌ Помилка міграції:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Критична помилка запуску migrate:', err);
  process.exit(1);
});
