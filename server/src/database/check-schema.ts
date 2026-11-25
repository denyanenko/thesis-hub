import 'dotenv/config';
import { is } from 'drizzle-orm';
import { PgTable, getTableConfig, isPgEnum } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

import * as schema from './schema.js';

interface DbColumnRow {
  table_name: string;
  column_name: string;
  sql_type: string;
  not_null: boolean;
}

interface DbEnumRow {
  enum_name: string;
  enum_value: string;
}

interface DrizzleColumnMeta {
  name: string;
  sqlType: string;
  notNull: boolean;
}

function normalizeSqlType(rawType: string): string {
  const cleaned = rawType
    .trim()
    .toLowerCase()
    .replace(/^public\./, '')
    .replace(/^"(.+)"$/, '$1')
    .replace(/\s+/g, ' ');

  const aliases: Record<string, string> = {
    int2: 'smallint',
    int4: 'integer',
    int8: 'bigint',
    bool: 'boolean',
    timestamptz: 'timestamp with time zone',
    timestamp: 'timestamp without time zone',
    varchar: 'character varying',
  };

  return aliases[cleaned] ?? cleaned;
}

function extractDrizzleMetadata(): {
  tables: Map<string, Map<string, DrizzleColumnMeta>>;
  enums: Map<string, string[]>;
} {
  const tables = new Map<string, Map<string, DrizzleColumnMeta>>();
  const enums = new Map<string, string[]>();

  for (const exported of Object.values(schema)) {
    if (isPgEnum(exported)) {
      enums.set(exported.enumName, [...exported.enumValues]);
      continue;
    }

    if (is(exported, PgTable)) {
      const config = getTableConfig(exported);
      const colMap = new Map<string, DrizzleColumnMeta>();
      for (const col of config.columns) {
        colMap.set(col.name, {
          name: col.name,
          sqlType: normalizeSqlType(col.getSQLType()),
          notNull: col.notNull,
        });
      }
      tables.set(config.name, colMap);
    }
  }

  return { tables, enums };
}

async function runSchemaCheck() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL не вказано в .env');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const [columnsRes, enumsRes] = await Promise.all([
      pool.query<DbColumnRow>(`
        SELECT
          c.relname AS table_name,
          a.attname AS column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) AS sql_type,
          a.attnotnull AS not_null
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum;
      `),
      pool.query<DbEnumRow>(`
        SELECT
          t.typname AS enum_name,
          e.enumlabel AS enum_value
        FROM pg_catalog.pg_type t
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public'
          AND t.typtype = 'e'
        ORDER BY t.typname, e.enumsortorder;
      `),
    ]);

    const dbTables = new Map<string, Map<string, DrizzleColumnMeta>>();
    for (const row of columnsRes.rows) {
      let colMap = dbTables.get(row.table_name);
      if (!colMap) {
        colMap = new Map();
        dbTables.set(row.table_name, colMap);
      }
      colMap.set(row.column_name, {
        name: row.column_name,
        sqlType: normalizeSqlType(row.sql_type),
        notNull: row.not_null,
      });
    }

    const dbEnums = new Map<string, string[]>();
    for (const row of enumsRes.rows) {
      const values = dbEnums.get(row.enum_name) ?? [];
      values.push(row.enum_value);
      dbEnums.set(row.enum_name, values);
    }

    const { tables: drizzleTables, enums: drizzleEnums } =
      extractDrizzleMetadata();

    const issues: string[] = [];

    // 1. Порівняння enum-ів
    for (const [enumName, dbValues] of dbEnums.entries()) {
      const drValues = drizzleEnums.get(enumName);
      if (!drValues) {
        issues.push(
          `[ENUM] У PostgreSQL є enum "${enumName}", але його немає в schema.ts`,
        );
        continue;
      }
      if (dbValues.join('|') !== drValues.join('|')) {
        issues.push(
          `[ENUM] Розбіжність значень enum "${enumName}": БД=[${dbValues.join(', ')}], schema.ts=[${drValues.join(', ')}]`,
        );
      }
    }
    for (const enumName of drizzleEnums.keys()) {
      if (!dbEnums.has(enumName)) {
        issues.push(
          `[ENUM] У schema.ts є enum "${enumName}", але його немає в PostgreSQL`,
        );
      }
    }

    // 2. Порівняння таблиць і колонок
    for (const [tableName, dbCols] of dbTables.entries()) {
      const drCols = drizzleTables.get(tableName);
      if (!drCols) {
        issues.push(
          `[TABLE] У PostgreSQL є таблиця "${tableName}", але її немає в schema.ts`,
        );
        continue;
      }

      for (const [colName, dbCol] of dbCols.entries()) {
        const drCol = drCols.get(colName);
        if (!drCol) {
          issues.push(
            `[COLUMN] У БД є колонка "${tableName}.${colName}" (${dbCol.sqlType}), але її немає в schema.ts`,
          );
          continue;
        }

        if (dbCol.sqlType !== drCol.sqlType) {
          issues.push(
            `[TYPE] "${tableName}.${colName}": БД="${dbCol.sqlType}", schema.ts="${drCol.sqlType}"`,
          );
        }

        if (dbCol.notNull !== drCol.notNull) {
          issues.push(
            `[NULLABLE] "${tableName}.${colName}": БД=${dbCol.notNull ? 'NOT NULL' : 'NULL'}, schema.ts=${drCol.notNull ? 'NOT NULL' : 'NULL'}`,
          );
        }
      }

      for (const colName of drCols.keys()) {
        if (!dbCols.has(colName)) {
          issues.push(
            `[COLUMN] У schema.ts є колонка "${tableName}.${colName}", але її немає в PostgreSQL`,
          );
        }
      }
    }

    for (const tableName of drizzleTables.keys()) {
      if (!dbTables.has(tableName)) {
        issues.push(
          `[TABLE] У schema.ts є таблиця "${tableName}", але її немає в PostgreSQL`,
        );
      }
    }

    if (issues.length > 0) {
      console.error(
        `❌ Виявлено розбіжності між PostgreSQL (public) та server/src/database/schema.ts (${issues.length}):`,
      );
      for (const issue of issues) {
        console.error(`  - ${issue}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `✅ Схема Drizzle повністю синхронізована з PostgreSQL (${dbTables.size} таблиць, ${columnsRes.rows.length} колонок, ${dbEnums.size} enum-ів).`,
    );
  } catch (error) {
    console.error('❌ Помилка під час перевірки схеми:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSchemaCheck().catch((err) => {
  console.error('❌ Критична помилка запуску check-schema:', err);
  process.exit(1);
});
