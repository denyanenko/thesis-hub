import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';
import { educationalPrograms, orgUnits, specialties } from './schema.js';
import type { DegreeLevel } from '../educational-programs/educational-programs.types.js';
import { getDevSeedConfig } from './seed-dev/seed-dev.utils.js';

interface SeedProgramDef {
  departmentName: string;
  specialtyCode: string;
  degreeLevel: DegreeLevel;
  name: string;
}

interface SeedReplacedPairDef {
  departmentName: string;
  specialtyCode: string;
  degreeLevel: DegreeLevel;
  oldName: string;
  newName: string;
  reason: string;
}

const DEV_KPI_PROGRAMS: readonly SeedProgramDef[] = [
  // ФІОТ — Кафедра інформаційних систем та технологій (ІСТ)
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    name: 'Інформаційне забезпечення робототехнічних систем',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    name: 'Інформаційні управляючі системи та технології',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'master',
    name: 'Інформаційні управляючі системи та технології',
  },
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'phd',
    name: 'Інформаційні системи і технології',
  },

  // ФІОТ — Кафедра інформатики та програмної інженерії (ІПІ)
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення інформаційних систем',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F2',
    degreeLevel: 'master',
    name: 'Інженерія програмного забезпечення інформаційних систем',
  },
  {
    departmentName: 'Кафедра інформатики та програмної інженерії',
    specialtyCode: 'F3',
    degreeLevel: 'bachelor',
    name: 'Компʼютерні науки',
  },

  // ФІОТ — Кафедра обчислювальної техніки (ОТ)
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'bachelor',
    name: 'Компʼютерні системи та мережі',
  },
  {
    departmentName: 'Кафедра обчислювальної техніки',
    specialtyCode: 'F7',
    degreeLevel: 'master',
    name: 'Компʼютерні системи та мережі',
  },

  // ФПСПМ — ПМА та ПЗКС
  {
    departmentName: 'Кафедра прикладної математики',
    specialtyCode: 'F1',
    degreeLevel: 'bachelor',
    name: 'Прикладна математика',
  },
  {
    departmentName: 'Кафедра програмного забезпечення компʼютерних систем',
    specialtyCode: 'F2',
    degreeLevel: 'bachelor',
    name: 'Інженерія програмного забезпечення мультимедійних та інформаційно-пошукових систем',
  },

  // НН ФТІ — Кафедра інформаційної безпеки
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'bachelor',
    name: 'Системи технічного захисту інформації',
  },
  {
    departmentName: 'Кафедра інформаційної безпеки',
    specialtyCode: 'F5',
    degreeLevel: 'master',
    name: 'Системи технічного захисту інформації',
  },
];

// Демонстраційна історична пара (перейменування ОП із збереженням правонаступництва)
const DEV_REPLACED_PAIRS: readonly SeedReplacedPairDef[] = [
  {
    departmentName: 'Кафедра інформаційних систем та технологій',
    specialtyCode: 'F6',
    degreeLevel: 'bachelor',
    oldName: 'Інтегровані інформаційні системи (архівна редакція)',
    newName: 'Інформаційні управляючі системи та технології',
    reason: 'Оновлення та обʼєднання освітньої програми рішенням Вченої ради',
  },
];

async function runDevProgramsSeed() {
  const config = getDevSeedConfig();
  console.log('🌱 [DEV] Наповнення типових освітніх програм КПІ...');

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

    await db.transaction(async (tx) => {
      for (const item of DEV_KPI_PROGRAMS) {
        const orgUnitId = deptByName.get(item.departmentName);
        const specialtyId = specByCode.get(item.specialtyCode.toUpperCase());

        if (!orgUnitId || !specialtyId) {
          skipped += 1;
          continue;
        }

        const [found] = await tx
          .select({ id: educationalPrograms.id })
          .from(educationalPrograms)
          .where(
            and(
              eq(educationalPrograms.specialtyId, specialtyId),
              eq(educationalPrograms.orgUnitId, orgUnitId),
              eq(educationalPrograms.name, item.name),
              eq(educationalPrograms.degreeLevel, item.degreeLevel),
            ),
          )
          .limit(1);

        if (found) {
          existing += 1;
          continue;
        }

        await tx.insert(educationalPrograms).values({
          specialtyId,
          orgUnitId,
          name: item.name,
          degreeLevel: item.degreeLevel,
          isActive: true,
        });
        created += 1;
      }

      for (const pair of DEV_REPLACED_PAIRS) {
        const orgUnitId = deptByName.get(pair.departmentName);
        const specialtyId = specByCode.get(pair.specialtyCode.toUpperCase());
        if (!orgUnitId || !specialtyId) {
          skipped += 1;
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
          continue;
        }

        const [foundOld] = await tx
          .select({ id: educationalPrograms.id })
          .from(educationalPrograms)
          .where(
            and(
              eq(educationalPrograms.specialtyId, specialtyId),
              eq(educationalPrograms.orgUnitId, orgUnitId),
              eq(educationalPrograms.name, pair.oldName),
              eq(educationalPrograms.degreeLevel, pair.degreeLevel),
            ),
          )
          .limit(1);

        if (foundOld) {
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

    console.log(
      `✅ [DEV] Готово! Створено ОП: ${created}, уже існувало: ${existing}, пропущено (не знайдено кафедру/спеціальність): ${skipped}.`,
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
