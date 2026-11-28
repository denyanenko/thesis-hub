import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { educationalPrograms, orgUnits, specialties } from './schema.js';
import {
  DEV_REPLACED_PROGRAM_PAIRS,
  KPI_EDUCATIONAL_PROGRAMS,
} from './kpi-programs.data.js';
import { getDevSeedConfig } from './seed-dev/seed-dev.utils.js';

function makeProgramKey(
  specialtyId: number,
  orgUnitId: number,
  degreeLevel: string,
  name: string,
): string {
  return `${specialtyId}:${orgUnitId}:${degreeLevel}:${name}`;
}

async function runDevProgramsSeed() {
  const config = getDevSeedConfig();
  console.log(
    `🌱 [DEV] Наповнення освітніх програм КПІ (активних: ${KPI_EDUCATIONAL_PROGRAMS.length}, архівних: ${DEV_REPLACED_PROGRAM_PAIRS.length})...`,
  );

  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    const [allDepartments, allSpecialties] = await Promise.all([
      db
        .select({
          id: orgUnits.id,
          name: orgUnits.name,
          isActive: orgUnits.isActive,
        })
        .from(orgUnits)
        .where(eq(orgUnits.unitType, 'department')),
      db
        .select({
          id: specialties.id,
          code: specialties.code,
          isActive: specialties.isActive,
        })
        .from(specialties),
    ]);

    if (allDepartments.length === 0 || allSpecialties.length === 0) {
      console.log(
        '⚠️ Спочатку запустіть `pnpm seed:kpi` та `pnpm seed:specialties`, щоб у БД були кафедри й спеціальності.',
      );
      return;
    }

    const deptByName = new Map(
      allDepartments.filter((d) => d.isActive).map((d) => [d.name, d.id]),
    );
    const specByCode = new Map(
      allSpecialties
        .filter((s) => s.isActive)
        .map((s) => [s.code.trim().toUpperCase(), s.id]),
    );

    let created = 0;
    let existing = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    await db.transaction(async (tx) => {
      const existingRows = await tx
        .select({
          id: educationalPrograms.id,
          specialtyId: educationalPrograms.specialtyId,
          orgUnitId: educationalPrograms.orgUnitId,
          degreeLevel: educationalPrograms.degreeLevel,
          name: educationalPrograms.name,
          isActive: educationalPrograms.isActive,
        })
        .from(educationalPrograms);

      const existingMap = new Map(
        existingRows.map((row) => [
          makeProgramKey(
            row.specialtyId,
            row.orgUnitId,
            row.degreeLevel,
            row.name,
          ),
          row,
        ]),
      );

      for (const item of KPI_EDUCATIONAL_PROGRAMS) {
        const orgUnitId = deptByName.get(item.departmentName);
        const specialtyId = specByCode.get(item.specialtyCode.toUpperCase());

        if (!orgUnitId || !specialtyId) {
          skipped += 1;
          skippedReasons.push(
            `${item.departmentName} / ${item.specialtyCode} / ${item.name}`,
          );
          continue;
        }

        const key = makeProgramKey(
          specialtyId,
          orgUnitId,
          item.degreeLevel,
          item.name,
        );
        if (existingMap.has(key)) {
          existing += 1;
          continue;
        }

        const [inserted] = await tx
          .insert(educationalPrograms)
          .values({
            specialtyId,
            orgUnitId,
            name: item.name,
            degreeLevel: item.degreeLevel,
            isActive: true,
          })
          .returning({
            id: educationalPrograms.id,
            specialtyId: educationalPrograms.specialtyId,
            orgUnitId: educationalPrograms.orgUnitId,
            degreeLevel: educationalPrograms.degreeLevel,
            name: educationalPrograms.name,
            isActive: educationalPrograms.isActive,
          });

        if (inserted) {
          existingMap.set(key, inserted);
        }
        created += 1;
      }

      for (const pair of DEV_REPLACED_PROGRAM_PAIRS) {
        const orgUnitId = deptByName.get(pair.departmentName);
        const specialtyId = specByCode.get(pair.specialtyCode.toUpperCase());
        if (!orgUnitId || !specialtyId) {
          skipped += 1;
          skippedReasons.push(
            `[архів] ${pair.departmentName} / ${pair.specialtyCode} / ${pair.oldName}`,
          );
          continue;
        }

        const [target] = await tx
          .select({ id: educationalPrograms.id })
          .from(educationalPrograms)
          .where(
            and(
              eq(educationalPrograms.specialtyId, specialtyId),
              eq(educationalPrograms.orgUnitId, orgUnitId),
              eq(educationalPrograms.name, pair.newName),
              eq(educationalPrograms.degreeLevel, pair.degreeLevel),
              eq(educationalPrograms.isActive, true),
            ),
          )
          .limit(1);

        if (!target) {
          skipped += 1;
          skippedReasons.push(
            `[правонаступник не знайдений] ${pair.departmentName} / ${pair.newName}`,
          );
          continue;
        }

        const oldKey = makeProgramKey(
          specialtyId,
          orgUnitId,
          pair.degreeLevel,
          pair.oldName,
        );
        if (existingMap.has(oldKey)) {
          existing += 1;
          continue;
        }

        await tx.insert(educationalPrograms).values({
          specialtyId,
          orgUnitId,
          name: pair.oldName,
          degreeLevel: pair.degreeLevel,
          isActive: false,
          replacedById: target.id,
          deactivationReason: pair.reason,
        });
        created += 1;
      }
    });

    if (skippedReasons.length > 0) {
      console.warn('⚠️ Пропущені записи:');
      for (const reason of skippedReasons) {
        console.warn(`   - ${reason}`);
      }
    }

    console.log(
      `✅ [DEV] Готово! Створено ОП: ${created}, уже існувало: ${existing}, пропущено: ${skipped}.`,
    );
  } catch (error) {
    console.error('❌ Помилка під час dev-сіду освітніх програм:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDevProgramsSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed-dev-programs:', err);
  process.exit(1);
});
