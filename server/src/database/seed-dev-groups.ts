import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import {
  educationalPrograms,
  groups,
  orgUnits,
  specialties,
} from './schema.js';
import {
  DEV_KPI_GROUPS,
  KPI_DEPARTMENT_GROUP_PREFIXES,
} from './kpi-groups.data.js';
import { getDevSeedConfig } from './seed-dev/seed-dev.utils.js';
import type { DegreeLevel } from '../educational-programs/educational-programs.types.js';

function makeProgramLookupKey(
  departmentName: string,
  specialtyCode: string,
  degreeLevel: string,
  programName: string,
): string {
  return `${departmentName}::${specialtyCode.toUpperCase()}::${degreeLevel}::${programName}`;
}

function makeGroupKey(educationalProgramId: number, name: string): string {
  return `${educationalProgramId}::${name}`;
}

/**
 * Повертає дволітерний шифр кафедри для коду академічної групи.
 * Якщо кафедра відсутня у довіднику КПІ (наприклад, створена вручну в dev),
 * формує детермінований дволітерний префікс зі скорочення або назви кафедри.
 */
function resolveDepartmentPrefix(
  departmentName: string,
  shortName: string | null,
): string {
  const mapped = KPI_DEPARTMENT_GROUP_PREFIXES[departmentName];
  if (mapped) return mapped;

  const lettersFromShort = (shortName ?? '')
    .toUpperCase()
    .replace(/[^А-ЯІЇЄҐ]/g, '');
  if (lettersFromShort.length >= 2) {
    return lettersFromShort.slice(0, 2);
  }

  const words = departmentName
    .replace(/^кафедра\s+/i, '')
    .toUpperCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^А-ЯІЇЄҐ]/g, ''))
    .filter((w) => w.length > 0);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`;
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2);
  }
  return 'КП';
}

function isResearchMasterProgram(programName: string): boolean {
  return /\(онп\)|\bонп\b|освітньо-науков/i.test(programName);
}

/**
 * Підбирає вільний шифр групи КПІ у форматі `<ПРЕФІКС>-<РІК><НОМЕР><СУФІКС>`
 * без колізій з уже існуючими шифрами.
 */
function pickUniqueGroupCandidate(
  prefix: string,
  degreeLevel: DegreeLevel,
  programName: string,
  usedNames: Set<string>,
): { name: string; enrollmentYear: number } {
  const suffix =
    degreeLevel === 'bachelor'
      ? ''
      : degreeLevel === 'phd'
        ? 'ф'
        : isResearchMasterProgram(programName)
          ? 'мн'
          : 'мп';

  const candidateYears =
    degreeLevel === 'bachelor' ? [2023, 2024, 2025] : [2025, 2026, 2024];

  for (const year of candidateYears) {
    const yearDigit = year % 10;
    for (let num = 1; num <= 9; num += 1) {
      const candidate = `${prefix}-${yearDigit}${num}${suffix}`;
      if (!usedNames.has(candidate)) {
        return { name: candidate, enrollmentYear: year };
      }
    }
  }

  // Резервний варіант, якщо всі номери 1..9 за трьома роками зайняті
  const fallbackYear = degreeLevel === 'bachelor' ? 2023 : 2025;
  const fallbackDigit = fallbackYear % 10;
  let num = 10;
  while (true) {
    const candidate = `${prefix}-${fallbackDigit}${num}${suffix}`;
    if (!usedNames.has(candidate)) {
      return { name: candidate, enrollmentYear: fallbackYear };
    }
    num += 1;
  }
}

async function runDevGroupsSeed() {
  const config = getDevSeedConfig();
  console.log(
    `🌱 [DEV] Наповнення академічних груп КПІ (${DEV_KPI_GROUPS.length} еталонних + покриття всіх активних ОП)...`,
  );

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const [allPrograms, allDepartments, allSpecialties] = await Promise.all([
      db
        .select({
          id: educationalPrograms.id,
          orgUnitId: educationalPrograms.orgUnitId,
          specialtyId: educationalPrograms.specialtyId,
          degreeLevel: educationalPrograms.degreeLevel,
          name: educationalPrograms.name,
          isActive: educationalPrograms.isActive,
        })
        .from(educationalPrograms),
      db
        .select({
          id: orgUnits.id,
          name: orgUnits.name,
          shortName: orgUnits.shortName,
        })
        .from(orgUnits)
        .where(eq(orgUnits.unitType, 'department')),
      db
        .select({
          id: specialties.id,
          code: specialties.code,
        })
        .from(specialties),
    ]);

    if (allPrograms.length === 0) {
      console.log(
        '⚠️ Спочатку запустіть `pnpm seed:kpi`, `pnpm seed:specialties` та `pnpm seed:dev:programs`, щоб у БД були освітні програми.',
      );
      return;
    }

    const deptById = new Map(allDepartments.map((d) => [d.id, d]));
    const specCodeById = new Map(
      allSpecialties.map((s) => [s.id, s.code.trim().toUpperCase()]),
    );

    const programIdByKey = new Map<string, number>();
    for (const prog of allPrograms) {
      const dept = deptById.get(prog.orgUnitId);
      const specCode = specCodeById.get(prog.specialtyId);
      if (!dept || !specCode) continue;
      programIdByKey.set(
        makeProgramLookupKey(dept.name, specCode, prog.degreeLevel, prog.name),
        prog.id,
      );
    }

    let explicitCreated = 0;
    let autoCreated = 0;
    let existing = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    const activePrograms = allPrograms
      .filter((prog) => prog.isActive)
      .sort((a, b) => {
        if (a.orgUnitId !== b.orgUnitId) return a.orgUnitId - b.orgUnitId;
        if (a.degreeLevel !== b.degreeLevel) {
          return a.degreeLevel.localeCompare(b.degreeLevel);
        }
        const nameCmp = a.name.localeCompare(b.name, 'uk');
        return nameCmp !== 0 ? nameCmp : a.id - b.id;
      });

    await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({
          educationalProgramId: groups.educationalProgramId,
          name: groups.name,
          isActive: groups.isActive,
        })
        .from(groups);

      const existingKeys = new Set(
        existingRows.map((row) =>
          makeGroupKey(row.educationalProgramId, row.name),
        ),
      );
      const usedNames = new Set(existingRows.map((row) => row.name));
      const programsWithActiveGroup = new Set(
        existingRows
          .filter((row) => row.isActive)
          .map((row) => row.educationalProgramId),
      );

      // Етап 1: еталонні групи КПІ (зокрема ІС-51мп, ІС-52мп та багатокурсові набори)
      for (const item of DEV_KPI_GROUPS) {
        const programId = programIdByKey.get(
          makeProgramLookupKey(
            item.departmentName,
            item.specialtyCode,
            item.degreeLevel,
            item.programName,
          ),
        );

        if (!programId) {
          skipped += 1;
          skippedReasons.push(
            `${item.name} → ${item.departmentName} / ${item.specialtyCode} (${item.degreeLevel}) / ${item.programName}`,
          );
          continue;
        }

        const key = makeGroupKey(programId, item.name);
        if (existingKeys.has(key)) {
          existing += 1;
          continue;
        }

        const isActive = item.isActive ?? true;
        await tx.insert(groups).values({
          educationalProgramId: programId,
          name: item.name,
          enrollmentYear: item.enrollmentYear,
          isActive,
        });
        existingKeys.add(key);
        usedNames.add(item.name);
        if (isActive) {
          programsWithActiveGroup.add(programId);
        }
        explicitCreated += 1;
      }

      // Етап 2: гарантуємо щонайменше 1 активну групу для кожної активної ОП
      for (const prog of activePrograms) {
        if (programsWithActiveGroup.has(prog.id)) {
          continue;
        }

        const dept = deptById.get(prog.orgUnitId);
        if (!dept) {
          skipped += 1;
          skippedReasons.push(
            `ОП #${prog.id} «${prog.name}» — кафедру не знайдено`,
          );
          continue;
        }

        const prefix = resolveDepartmentPrefix(dept.name, dept.shortName);
        const { name, enrollmentYear } = pickUniqueGroupCandidate(
          prefix,
          prog.degreeLevel,
          prog.name,
          usedNames,
        );

        await tx.insert(groups).values({
          educationalProgramId: prog.id,
          name,
          enrollmentYear,
          isActive: true,
        });
        existingKeys.add(makeGroupKey(prog.id, name));
        usedNames.add(name);
        programsWithActiveGroup.add(prog.id);
        autoCreated += 1;
      }
    });

    if (skippedReasons.length > 0) {
      console.warn('⚠️ Пропущені записи:');
      for (const reason of skippedReasons) {
        console.warn(`   - ${reason}`);
      }
    }

    const totalCreated = explicitCreated + autoCreated;
    console.log(
      `✅ [DEV] Готово! Створено груп: ${totalCreated} (еталонних: ${explicitCreated}, для решти ОП: ${autoCreated}), еталонних уже існувало: ${existing}, пропущено: ${skipped}. Активних ОП у БД: ${activePrograms.length}.`,
    );
  } catch (error) {
    console.error('❌ Помилка під час dev-сіду академічних груп:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevGroupsSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-groups:', err);
  process.exit(1);
});
