import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq, ilike } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { DegreeLevel } from '../educational-programs/educational-programs.types.js';
import * as schema from './schema.js';
import {
  educationalPrograms,
  groups,
  orgUnits,
  students,
  users,
} from './schema.js';
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
import { generateUkrainianPerson } from './seed-dev/ukrainian-names.data.js';

const INSERT_BATCH_SIZE = 500;

const STUDENTS_PER_GROUP_BY_DEGREE: Record<
  DegreeLevel,
  { min: number; avg: number; stdDev: number; max: number }
> = {
  bachelor: { min: 12, avg: 20, stdDev: 4, max: 28 },
  master: { min: 8, avg: 14, stdDev: 3, max: 22 },
  phd: { min: 2, avg: 5, stdDev: 2, max: 9 },
};

const DEGREE_LABELS_UA: Record<DegreeLevel, string> = {
  bachelor: 'Бакалавр',
  master: 'Магістр',
  phd: 'PhD',
};

const PINNED_STUDENT = {
  groupName: 'ІС-51мп',
  lastName: 'Яненко',
  firstName: 'Денис',
  patronymic: 'Олександрович',
} as const;

interface PendingStudent {
  groupId: number;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  studentNumber: string;
}

function nextStudentNumber(
  enrollmentYear: number | null,
  usedStudentNumbers: Set<string>,
  counterRef: { value: number },
): string {
  const yearSuffix = String((enrollmentYear ?? 2024) % 100).padStart(2, '0');
  while (true) {
    counterRef.value += 1;
    const candidate = `КВ${yearSuffix}${String(counterRef.value).padStart(6, '0')}`;
    if (!usedStudentNumbers.has(candidate)) {
      usedStudentNumbers.add(candidate);
      return candidate;
    }
  }
}

async function runDevStudentsSeed() {
  const config = getDevSeedConfig();
  console.log('🌱 [DEV] Запуск сіду студентів для всіх академічних груп...');

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const [allUnits, allPrograms, allGroups] = await Promise.all([
      db
        .select({
          id: orgUnits.id,
          parentId: orgUnits.parentId,
          unitType: orgUnits.unitType,
          name: orgUnits.name,
          shortName: orgUnits.shortName,
          isActive: orgUnits.isActive,
        })
        .from(orgUnits),
      db
        .select({
          id: educationalPrograms.id,
          name: educationalPrograms.name,
          degreeLevel: educationalPrograms.degreeLevel,
          orgUnitId: educationalPrograms.orgUnitId,
        })
        .from(educationalPrograms),
      db
        .select({
          id: groups.id,
          name: groups.name,
          enrollmentYear: groups.enrollmentYear,
          educationalProgramId: groups.educationalProgramId,
          isActive: groups.isActive,
        })
        .from(groups),
    ]);

    if (allGroups.length === 0) {
      console.log(
        '⚠️ У базі немає академічних груп. Спочатку запустіть `pnpm seed:dev:groups`.',
      );
      return;
    }

    const programById = new Map(allPrograms.map((p) => [p.id, p]));

    const [existingUsers, existingStudents] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          patronymic: users.patronymic,
        })
        .from(users),
      db
        .select({
          userId: students.userId,
          groupId: students.groupId,
          studentNumber: students.studentNumber,
        })
        .from(students),
    ]);

    const usedEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const usedStudentNumbers = new Set(
      existingStudents.map((s) => s.studentNumber),
    );
    const userById = new Map(existingUsers.map((u) => [u.id, u]));

    const coveredGroupIds = new Set(
      existingStudents
        .map((s) => s.groupId)
        .filter((id): id is number => id !== null),
    );

    const pinnedGroup = allGroups.find(
      (g) => g.name.toLowerCase() === PINNED_STUDENT.groupName.toLowerCase(),
    );

    const pinnedAlreadyExists =
      pinnedGroup !== undefined &&
      existingStudents.some((s) => {
        if (s.groupId !== pinnedGroup.id) return false;
        const u = userById.get(s.userId);
        return (
          u !== undefined &&
          u.lastName === PINNED_STUDENT.lastName &&
          u.firstName === PINNED_STUDENT.firstName &&
          (u.patronymic ?? '') === PINNED_STUDENT.patronymic
        );
      });

    const studentNumberCounter = { value: existingStudents.length };
    const usedGlobalFullNames = new Set<string>();
    const pending: PendingStudent[] = [];
    let skippedGroups = 0;

    if (pinnedGroup && !pinnedAlreadyExists) {
      const pinnedKey =
        `${PINNED_STUDENT.lastName}|${PINNED_STUDENT.firstName}|${PINNED_STUDENT.patronymic}`.toLowerCase();
      usedGlobalFullNames.add(pinnedKey);

      const pinnedEmail = buildUniqueEmail(
        ['d.yanenko', 'd.o.yanenko', 'denys.yanenko'],
        config.emailDomain,
        usedEmails,
      );

      pending.push({
        groupId: pinnedGroup.id,
        email: pinnedEmail,
        firstName: PINNED_STUDENT.firstName,
        lastName: PINNED_STUDENT.lastName,
        patronymic: PINNED_STUDENT.patronymic,
        studentNumber: nextStudentNumber(
          pinnedGroup.enrollmentYear,
          usedStudentNumbers,
          studentNumberCounter,
        ),
      });
    } else if (!pinnedGroup) {
      console.log(
        `⚠️ Групу «${PINNED_STUDENT.groupName}» не знайдено серед груп у БД — обовʼязкового студента не додано.`,
      );
    }

    for (const group of allGroups) {
      if (coveredGroupIds.has(group.id)) {
        skippedGroups += 1;
        continue;
      }

      const program = programById.get(group.educationalProgramId);
      const degreeLevel: DegreeLevel = program?.degreeLevel ?? 'bachelor';
      const dist = STUDENTS_PER_GROUP_BY_DEGREE[degreeLevel];

      let targetCount = sampleGaussianInt(
        dist.avg,
        dist.stdDev,
        dist.min,
        dist.max,
      );

      const usedGroupLastNameKeys = new Set<string>();
      if (pinnedGroup && group.id === pinnedGroup.id && !pinnedAlreadyExists) {
        usedGroupLastNameKeys.add(
          `${PINNED_STUDENT.lastName.toLowerCase()}|${PINNED_STUDENT.firstName.toLowerCase()}`,
        );
        targetCount = Math.max(0, targetCount - 1);
      }

      const groupSlug =
        transliterateToSlug(group.name, 16) || `grp-${group.id}`;

      for (let i = 0; i < targetCount; i += 1) {
        const person = generateUkrainianPerson(
          usedGroupLastNameKeys,
          usedGlobalFullNames,
        );

        const lastSlug = transliterateToSlug(person.lastName, 20) || 'student';
        const firstSlug = transliterateToSlug(person.firstName, 14) || 's';
        const firstInitial = firstSlug[0] ?? 's';
        const patronymicInitial =
          transliterateToSlug(person.patronymic, 8)[0] ?? 'x';

        const email = buildUniqueEmail(
          [
            `${firstInitial}.${lastSlug}.${groupSlug}`,
            `${firstInitial}.${patronymicInitial}.${lastSlug}.${groupSlug}`,
            `${firstSlug}.${lastSlug}.${groupSlug}`,
          ],
          config.emailDomain,
          usedEmails,
        );

        pending.push({
          groupId: group.id,
          email,
          firstName: person.firstName,
          lastName: person.lastName,
          patronymic: person.patronymic,
          studentNumber: nextStudentNumber(
            group.enrollmentYear,
            usedStudentNumbers,
            studentNumberCounter,
          ),
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
                role: 'student' as const,
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

          await tx.insert(students).values(
            batch.map((item) => {
              const userId = idByEmail.get(item.email.toLowerCase());
              if (userId === undefined) {
                throw new Error(`Не знайдено userId для ${item.email}`);
              }
              return {
                userId,
                groupId: item.groupId,
                studentNumber: item.studentNumber,
              };
            }),
          );
        }
      });
    }

    // Формуємо актуальний Markdown-файл для всіх dev-seed студентів у БД
    const seededStudents = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        patronymic: users.patronymic,
        studentNumber: students.studentNumber,
        groupId: students.groupId,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(ilike(users.email, `%@${config.emailDomain}`));

    const groupById = new Map(allGroups.map((g) => [g.id, g]));
    const pathMap = buildOrgPathMap(allUnits);

    const byGroup = new Map<number, typeof seededStudents>();
    for (const row of seededStudents) {
      if (row.groupId === null) continue;
      const list = byGroup.get(row.groupId) ?? [];
      list.push(row);
      byGroup.set(row.groupId, list);
    }

    const sortedGroupIds = [...byGroup.keys()].sort((a, b) =>
      (groupById.get(a)?.name ?? '').localeCompare(
        groupById.get(b)?.name ?? '',
        'uk',
      ),
    );

    const counts = sortedGroupIds.map((id) => byGroup.get(id)?.length ?? 0);
    const minActual = counts.length > 0 ? Math.min(...counts) : 0;
    const maxActual = counts.length > 0 ? Math.max(...counts) : 0;
    const avgActual =
      counts.length > 0
        ? (
            counts.reduce((sum, c) => sum + c, 0) / counts.length
          ).toFixed(1)
        : '0';

    const pinnedRow =
      pinnedGroup !== undefined
        ? (byGroup.get(pinnedGroup.id) ?? []).find(
            (s) =>
              s.lastName === PINNED_STUDENT.lastName &&
              s.firstName === PINNED_STUDENT.firstName,
          )
        : undefined;

    const lines: string[] = [
      '# Тестові студенти по академічних групах (DEV Seed)',
      '',
      `- **Згенеровано:** ${new Date().toISOString()}`,
      `- **Груп із dev-студентами:** ${sortedGroupIds.length} (усього груп у БД: ${allGroups.length})`,
      `- **Усього dev-студентів:** ${seededStudents.length}`,
      `- **Додано під час цього запуску:** ${pending.length} (пропущено груп, що вже мали студентів: ${skippedGroups})`,
      `- **Розподіл по групах:** min = ${minActual}, avg = ${avgActual}, max = ${maxActual}`,
      `- **Спільний пароль для всіх тестових акаунтів:** \`${config.password}\``,
      `- **Домен email:** \`@${config.emailDomain}\``,
    ];

    if (pinnedRow) {
      lines.push(
        `- **Закріплений студент (${PINNED_STUDENT.groupName}):** ${formatFullName(pinnedRow.lastName, pinnedRow.firstName, pinnedRow.patronymic)} — \`${pinnedRow.email}\` / \`${config.password}\` (квиток: \`${pinnedRow.studentNumber}\`)`,
      );
    }

    lines.push(
      '',
      '## Зведена статистика по групах',
      '',
      '| № | Група | Рівень | Освітня програма | Кафедра | Студентів |',
      '|---:|---|---|---|---|---:|',
    );

    sortedGroupIds.forEach((groupId, idx) => {
      const group = groupById.get(groupId);
      const program = group
        ? programById.get(group.educationalProgramId)
        : undefined;
      const deptPath = program ? pathMap.get(program.orgUnitId) : undefined;
      const groupList = byGroup.get(groupId) ?? [];

      lines.push(
        `| ${idx + 1} | ${escapeMdCell(group?.name)} | ${program ? DEGREE_LABELS_UA[program.degreeLevel] : '—'} | ${escapeMdCell(program?.name)} | ${escapeMdCell(deptPath)} | ${groupList.length} |`,
      );
    });

    lines.push('', '## Облікові дані по групах', '');

    for (const groupId of sortedGroupIds) {
      const group = groupById.get(groupId);
      const program = group
        ? programById.get(group.educationalProgramId)
        : undefined;
      const deptPath = program ? pathMap.get(program.orgUnitId) : undefined;
      const groupList = [...(byGroup.get(groupId) ?? [])].sort((a, b) =>
        a.lastName.localeCompare(b.lastName, 'uk'),
      );

      lines.push(
        `### ${group?.name ?? `Група #${groupId}`} — ${groupList.length} студентів`,
      );
      lines.push('');
      lines.push(
        `> ОП: **${program?.name ?? '—'}** (${program ? DEGREE_LABELS_UA[program.degreeLevel] : '—'}) · Кафедра: \`${deptPath ?? '—'}\``,
      );
      lines.push('');
      lines.push('| № | ПІБ | Номер студентського | Email | Пароль |');
      lines.push('|---:|---|---|---|---|');

      groupList.forEach((row, idx) => {
        const fullName = formatFullName(
          row.lastName,
          row.firstName,
          row.patronymic,
        );
        lines.push(
          `| ${idx + 1} | ${escapeMdCell(fullName)} | \`${row.studentNumber}\` | \`${row.email}\` | \`${config.password}\` |`,
        );
      });

      lines.push('');
    }

    const outputPath = await writeSeedMarkdown(
      config.outputDir,
      'dev-students.md',
      lines.join('\n'),
    );

    console.log(
      `✅ [DEV] Студенти готові! Створено: ${pending.length} (груп покрито: ${sortedGroupIds.length}/${allGroups.length}; по групах: min=${minActual}, avg=${avgActual}, max=${maxActual}).`,
    );
    if (pinnedRow) {
      console.log(
        `🎓 Закріплений студент у ${PINNED_STUDENT.groupName}: ${formatFullName(pinnedRow.lastName, pinnedRow.firstName, pinnedRow.patronymic)} (${pinnedRow.email}, квиток ${pinnedRow.studentNumber})`,
      );
    }
    console.log(`📄 Файл з обліковими даними: ${outputPath}`);
  } catch (error) {
    console.error('❌ Помилка під час виконання dev-сіду студентів:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevStudentsSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-students:', err);
  process.exit(1);
});
