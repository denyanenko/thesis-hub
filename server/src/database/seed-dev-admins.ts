import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq, ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { admins, orgUnits, users } from './schema.js';
import {
  UNIT_TYPE_LABELS_UA,
  UNIT_TYPE_SORT_ORDER,
  buildOrgPathMap,
  buildUniqueEmail,
  chunkArray,
  escapeMdCell,
  formatFullName,
  getDevSeedConfig,
  transliterateToSlug,
  writeSeedMarkdown,
} from './seed-dev/seed-dev.utils.js';
import {
  generateAdminPosition,
  generateUkrainianPerson,
} from './seed-dev/ukrainian-names.data.js';

const INSERT_BATCH_SIZE = 500;

interface PendingAdmin {
  orgUnitId: number;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  position: string;
}

async function runDevAdminsSeed() {
  const config = getDevSeedConfig();
  console.log('🌱 [DEV] Запуск сіду адміністраторів для орг-одиниць...');

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const allUnits = await db
      .select({
        id: orgUnits.id,
        parentId: orgUnits.parentId,
        unitType: orgUnits.unitType,
        name: orgUnits.name,
        shortName: orgUnits.shortName,
        isActive: orgUnits.isActive,
      })
      .from(orgUnits);

    const activeUnits = allUnits.filter((u) => u.isActive);

    if (activeUnits.length === 0) {
      console.log(
        '⚠️ У базі немає активних орг-одиниць. Спочатку запустіть `pnpm seed:kpi`.',
      );
      return;
    }

    const existingUsers = await db
      .select({ email: users.email })
      .from(users);
    const usedEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const existingUnitAdmins = await db
      .select({ orgUnitId: admins.orgUnitId })
      .from(admins);
    const coveredUnitIds = new Set(
      existingUnitAdmins
        .map((a) => a.orgUnitId)
        .filter((id): id is number => id !== null),
    );

    const usedFullNames = new Set<string>();
    const pending: PendingAdmin[] = [];

    for (const unit of activeUnits) {
      if (coveredUnitIds.has(unit.id)) {
        continue;
      }

      const person = generateUkrainianPerson(undefined, usedFullNames);
      const position = generateAdminPosition(unit.unitType);
      const unitSlug =
        transliterateToSlug(unit.shortName ?? unit.name, 24) ||
        `unit-${unit.id}`;
      const lastNameSlug = transliterateToSlug(person.lastName, 24) || 'admin';

      const email = buildUniqueEmail(
        [
          `admin.${unitSlug}`,
          `admin.${unitSlug}.${lastNameSlug}`,
          `admin.${unit.unitType}.${unit.id}`,
        ],
        config.emailDomain,
        usedEmails,
      );

      pending.push({
        orgUnitId: unit.id,
        email,
        firstName: person.firstName,
        lastName: person.lastName,
        patronymic: person.patronymic,
        position,
      });
    }

    if (pending.length > 0) {
      const passwordHash = await argon2.hash(config.password);

      await db.transaction(async (tx) => {
        for (const batch of chunkArray(pending, INSERT_BATCH_SIZE)) {
          const insertedUsers = await tx
            .insert(users)
            .values(
              batch.map((item) => ({
                email: item.email,
                passwordHash,
                role: 'admin' as const,
                firstName: item.firstName,
                lastName: item.lastName,
                patronymic: item.patronymic,
                isActive: true,
              })),
            )
            .returning({ id: users.id, email: users.email });

          const idByEmail = new Map(
            insertedUsers.map((u) => [u.email.toLowerCase(), u.id]),
          );

          await tx.insert(admins).values(
            batch.map((item) => {
              const userId = idByEmail.get(item.email.toLowerCase());
              if (userId === undefined) {
                throw new Error(`Не знайдено userId для ${item.email}`);
              }
              return {
                userId,
                orgUnitId: item.orgUnitId,
                position: item.position,
              };
            }),
          );
        }
      });
    }

    // Формуємо актуальний Markdown-файл для всіх dev-seed адміністраторів у БД
    const seededAdmins = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        patronymic: users.patronymic,
        position: admins.position,
        orgUnitId: admins.orgUnitId,
      })
      .from(admins)
      .innerJoin(users, eq(users.id, admins.userId))
      .where(ilike(users.email, `%@${config.emailDomain}`));

    const unitById = new Map(allUnits.map((u) => [u.id, u]));
    const pathMap = buildOrgPathMap(allUnits);

    seededAdmins.sort((a, b) => {
      const unitA = a.orgUnitId !== null ? unitById.get(a.orgUnitId) : undefined;
      const unitB = b.orgUnitId !== null ? unitById.get(b.orgUnitId) : undefined;
      const orderA = unitA ? UNIT_TYPE_SORT_ORDER[unitA.unitType] : -1;
      const orderB = unitB ? UNIT_TYPE_SORT_ORDER[unitB.unitType] : -1;
      if (orderA !== orderB) return orderA - orderB;

      const pathA = a.orgUnitId !== null ? (pathMap.get(a.orgUnitId) ?? '') : '';
      const pathB = b.orgUnitId !== null ? (pathMap.get(b.orgUnitId) ?? '') : '';
      return pathA.localeCompare(pathB, 'uk');
    });

    const lines: string[] = [
      '# Тестові адміністратори підрозділів (DEV Seed)',
      '',
      `- **Згенеровано:** ${new Date().toISOString()}`,
      `- **Усього dev-адміністраторів:** ${seededAdmins.length}`,
      `- **Додано під час цього запуску:** ${pending.length}`,
      `- **Пропущено (вже мали адміна):** ${activeUnits.length - pending.length}`,
      `- **Спільний пароль для всіх тестових акаунтів:** \`${config.password}\``,
      `- **Домен email:** \`@${config.emailDomain}\``,
      '',
      '| № | Тип | Шлях у структурі | Назва підрозділу | ПІБ | Посада | Email | Пароль |',
      '|---:|---|---|---|---|---|---|---|',
    ];

    seededAdmins.forEach((row, idx) => {
      const unit =
        row.orgUnitId !== null ? unitById.get(row.orgUnitId) : undefined;
      const unitTypeLabel = unit
        ? UNIT_TYPE_LABELS_UA[unit.unitType]
        : 'Головний';
      const unitPath =
        row.orgUnitId !== null ? (pathMap.get(row.orgUnitId) ?? '—') : '—';
      const unitName = unit ? unit.name : 'Уся система';
      const fullName = formatFullName(row.lastName, row.firstName, row.patronymic);

      lines.push(
        `| ${idx + 1} | ${escapeMdCell(unitTypeLabel)} | ${escapeMdCell(unitPath)} | ${escapeMdCell(unitName)} | ${escapeMdCell(fullName)} | ${escapeMdCell(row.position)} | \`${row.email}\` | \`${config.password}\` |`,
      );
    });

    lines.push('');

    const outputPath = await writeSeedMarkdown(
      config.outputDir,
      'dev-admins.md',
      lines.join('\n'),
    );

    console.log(
      `✅ [DEV] Адміністратори готові! Створено: ${pending.length}, пропущено: ${activeUnits.length - pending.length}.`,
    );
    console.log(`📄 Файл з обліковими даними: ${outputPath}`);
  } catch (error) {
    console.error('❌ Помилка під час виконання dev-сіду адміністраторів:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevAdminsSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-admins:', err);
  process.exit(1);
});
