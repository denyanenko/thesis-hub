import { NestFactory } from '@nestjs/core';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';

import { AppModule } from '../app.module.js';
import { DRIZZLE, type DrizzleDB } from './database.module.js';
import { users, admins } from './schema.js';
import { AppConfigService } from '../config/app-config.service.js';

async function runSeed() {
  console.log('🌱 Запуск скрипта ініціалізації бази даних (Seeding)...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const db = app.get<DrizzleDB>(DRIZZLE);
    const config = app.get(AppConfigService);

    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, 'admin'),
    });

    if (existingAdmin) {
      console.log(
        `ℹ️ Супер-адмін вже існує у базі (${existingAdmin.email}). Пропускаємо створення.`,
      );
      return;
    }

    const email = config.get('INITIAL_ADMIN_EMAIL');
    const password = config.get('INITIAL_ADMIN_PASSWORD');

    // Заміна getOrThrow: явно викидаємо помилку, якщо обов'язкові змінні для сідінгу відсутні
    if (!email || !password) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(
        'INITIAL_ADMIN_EMAIL та INITIAL_ADMIN_PASSWORD повинні бути вказані в .env для створення адміністратора.',
      );
    }

    // Заміна другого аргументу (дефолтного значення): використовуємо нативний оператор nullish coalescing (??)
    const firstName = config.get('INITIAL_ADMIN_FIRST_NAME') ?? 'Денис';
    const lastName = config.get('INITIAL_ADMIN_LAST_NAME') ?? 'Яненко';

    const passwordHash = await argon2.hash(password);

    await db.transaction(async (tx) => {
      const [newAdmin] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: 'admin',
          firstName,
          lastName,
          isActive: true,
        })
        .returning({ id: users.id });

      await tx.insert(admins).values({
        userId: newAdmin.id,
        orgUnitId: null,
        position: 'Головний системний адміністратор',
      });
    });

    console.log(`✅ Першого Супер-Адміністратора (${email}) успішно створено!`);
  } catch (error) {
    console.error('❌ Помилка під час виконання seed:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runSeed().catch((err) => {
  console.error('❌ Критична помилка запуску seed:', err);
  process.exit(1);
});
