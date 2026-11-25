import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq, ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { orgUnits, supervisors, users } from './schema.js';
import {
  buildOrgPathMap,
  buildUniqueEmail,
  chunkArray,
  escapeMdCell,
  formatFullName,
  getDevSeedConfig,
  sampleGaussianInt,
  transliterateToSlug,
  writeSeedMarkdown,
} from './seed-dev/seed-dev.utils.js';
import {
  generateSupervisorProfile,
  generateUkrainianPerson,
} from './seed-dev/ukrainian-names.data.js';

const INSERT_BATCH_SIZE = 500;

const SUPERVISORS_PER_DEPT_MIN = 20;
const SUPERVISORS_PER_DEPT_AVG = 32;
const SUPERVISORS_PER_DEPT_STDDEV = 8;
const SUPERVISORS_PER_DEPT_MAX = 58;

interface PendingSupervisor {
  orgUnitId: number;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  position: string;
  academicDegree: string | null;
  academicTitle: string | null;
}

async function runDevSupervisorsSeed() {
  const config = getDevSeedConfig();

  console.log(
    `🌱 [DEV] Запуск сіду наукових керівників (на кафедру: avg=${SUPERVISORS_PER_DEPT_AVG}, stdDev=${SUPERVISORS_PER_DEPT_STDDEV}, range=[${SUPERVISORS_PER_DEPT_MIN}..${SUPERVISORS_PER_DEPT_MAX}])...`,
  );

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

    const activeDepartments = allUnits.filter(
      (u) => u.isActive && u.unitType === 'department',
    );

    if (activeDepartments.length === 0) {
      console.log(
        '⚠️ У базі немає активних кафедр. Спочатку запустіть `pnpm seed:kpi`.',
      );
      return;
    }

    const existingUsers = await db
      .select({ email: users.email })
      .from(users);
    const usedEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const existingDeptRows = await db
      .select({ orgUnitId: supervisors.orgUnitId })
      .from(supervisors);
    const coveredDepartmentIds = new Set(
      existingDeptRows
        .map((r) => r.orgUnitId)
        .filter((id): id is number => id !== null),
    );

    const usedGlobalFullNames = new Set<string>();
    const pending: PendingSupervisor[] = [];
    let skippedDepartments = 0;

    for (const dept of activeDepartments) {
      if (coveredDepartmentIds.has(dept.id)) {
        skippedDepartments += 1;
        continue;
      }

      const targetCount = sampleGaussianInt(
        SUPERVISORS_PER_DEPT_AVG,
        SUPERVISORS_PER_DEPT_STDDEV,
        SUPERVISORS_PER_DEPT_MIN,
        SUPERVISORS_PER_DEPT_MAX,
      );
      const usedDeptLastNameKeys = new Set<string>();

      for (let i = 0; i < targetCount; i += 1) {
        const person = generateUkrainianPerson(
          usedDeptLastNameKeys,
          usedGlobalFullNames,
        );
        const academicProfile = generateSupervisorProfile(i === 0);

        const lastSlug = transliterateToSlug(person.lastName, 24) || 'lecturer';
        const firstSlug = transliterateToSlug(person.firstName, 16) || 'u';
        const firstInitial = firstSlug[0] ?? 'u';
        const patronymicInitial =
          transliterateToSlug(person.patronymic, 8)[0] ?? 'x';

        const email = buildUniqueEmail(
          [
            `${firstInitial}.${lastSlug}`,
            `${firstInitial}.${patronymicInitial}.${lastSlug}`,
            `${firstSlug}.${lastSlug}`,
          ],
          config.emailDomain,
          usedEmails,
        );

        pending.push({
          orgUnitId: dept.id,
          email,
          firstName: person.firstName,
          lastName: person.lastName,
          patronymic: person.patronymic,
          position: academicProfile.position,
          academicDegree: academicProfile.academicDegree,
          academicTitle: academicProfile.academicTitle,
        });
      }
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
                role: 'supervisor' as const,
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

          await tx.insert(supervisors).values(
            batch.map((item) => {
              const userId = idByEmail.get(item.email.toLowerCase());
              if (userId === undefined) {
                throw new Error(`Не знайдено userId для ${item.email}`);
              }
              return {
                userId,
                orgUnitId: item.orgUnitId,
                position: item.position,
                academicDegree: item.academicDegree,
                academicTitle: item.academicTitle,
              };
            }),
          );
        }
      });
    }

    // Формуємо актуальний Markdown-файл для всіх dev-seed керівників у БД
    const seededSupervisors = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        patronymic: users.patronymic,
        position: supervisors.position,
        academicDegree: supervisors.academicDegree,
        academicTitle: supervisors.academicTitle,
        orgUnitId: supervisors.orgUnitId,
      })
      .from(supervisors)
      .innerJoin(users, eq(users.id, supervisors.userId))
      .where(ilike(users.email, `%@${config.emailDomain}`));

    const unitById = new Map(allUnits.map((u) => [u.id, u]));
    const pathMap = buildOrgPathMap(allUnits);

    const byDept = new Map<number, typeof seededSupervisors>();
    for (const row of seededSupervisors) {
      if (row.orgUnitId === null) continue;
      const list = byDept.get(row.orgUnitId) ?? [];
      list.push(row);
      byDept.set(row.orgUnitId, list);
    }

    const sortedDeptIds = [...byDept.keys()].sort((a, b) =>
      (pathMap.get(a) ?? '').localeCompare(pathMap.get(b) ?? '', 'uk'),
    );

    const counts = sortedDeptIds.map((id) => byDept.get(id)?.length ?? 0);
    const minActual = counts.length > 0 ? Math.min(...counts) : 0;
    const maxActual = counts.length > 0 ? Math.max(...counts) : 0;
    const avgActual =
      counts.length > 0
        ? (
            counts.reduce((sum, c) => sum + c, 0) / counts.length
          ).toFixed(1)
        : '0';

    const lines: string[] = [
      '# Тестові наукові керівники по кафедрах (DEV Seed)',
      '',
      `- **Згенеровано:** ${new Date().toISOString()}`,
      `- **Кафедр із dev-керівниками:** ${sortedDeptIds.length} (активних усього: ${activeDepartments.length})`,
      `- **Усього dev-керівників:** ${seededSupervisors.length}`,
      `- **Додано під час цього запуску:** ${pending.length} (пропущено кафедр, що вже мали керівників: ${skippedDepartments})`,
      `- **Розподіл по кафедрах:** min = ${minActual}, avg = ${avgActual}, max = ${maxActual}`,
      `- **Спільний пароль для всіх тестових акаунтів:** \`${config.password}\``,
      `- **Домен email:** \`@${config.emailDomain}\``,
      '',
      '## Зведена статистика по кафедрах',
      '',
      '| № | Шлях | Кафедра | Кількість |',
      '|---:|---|---|---:|',
    ];

    sortedDeptIds.forEach((deptId, idx) => {
      const dept = unitById.get(deptId);
      const deptList = byDept.get(deptId) ?? [];
      lines.push(
        `| ${idx + 1} | ${escapeMdCell(pathMap.get(deptId))} | ${escapeMdCell(dept?.name)} | ${deptList.length} |`,
      );
    });

    lines.push('', '## Облікові дані по кафедрах', '');

    for (const deptId of sortedDeptIds) {
      const dept = unitById.get(deptId);
      const deptList = [...(byDept.get(deptId) ?? [])];
      deptList.sort((a, b) => {
        const aHead = a.position === 'Завідувач кафедри' ? 0 : 1;
        const bHead = b.position === 'Завідувач кафедри' ? 0 : 1;
        if (aHead !== bHead) return aHead - bHead;
        return a.lastName.localeCompare(b.lastName, 'uk');
      });

      const deptTitle = dept?.shortName
        ? `${dept.name} (${dept.shortName})`
        : (dept?.name ?? `Кафедра #${deptId}`);

      lines.push(`### ${deptTitle} — ${deptList.length} керівників`);
      lines.push('');
      lines.push(`> Шлях: \`${pathMap.get(deptId) ?? '—'}\``);
      lines.push('');
      lines.push('| № | ПІБ | Посада | Науковий ступінь | Вчене звання | Email | Пароль |');
      lines.push('|---:|---|---|---|---|---|---|');

      deptList.forEach((row, idx) => {
        const fullName = formatFullName(
          row.lastName,
          row.firstName,
          row.patronymic,
        );
        lines.push(
          `| ${idx + 1} | ${escapeMdCell(fullName)} | ${escapeMdCell(row.position)} | ${escapeMdCell(row.academicDegree)} | ${escapeMdCell(row.academicTitle)} | \`${row.email}\` | \`${config.password}\` |`,
        );
      });

      lines.push('');
    }

    const outputPath = await writeSeedMarkdown(
      config.outputDir,
      'dev-supervisors.md',
      lines.join('\n'),
    );

    console.log(
      `✅ [DEV] Наукові керівники готові! Створено: ${pending.length} (по кафедрах: min=${minActual}, avg=${avgActual}, max=${maxActual}).`,
    );
    console.log(`📄 Файл з обліковими даними: ${outputPath}`);
  } catch (error) {
    console.error('❌ Помилка під час виконання dev-сіду керівників:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevSupervisorsSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-supervisors:', err);
  process.exit(1);
});
