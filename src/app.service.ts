import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from './database/database.module.js';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async onModuleInit() {
    this.logger.log('⏳ Перевірка підключення до бази даних...');

    try {
      const result = await this.db.execute(sql`SELECT current_database(), now();`);

      this.logger.log('✅ База даних підключена успішно!');
      this.logger.debug(`📊 Дані з БД: ${JSON.stringify(result.rows[0])}`);
    } catch (error) {
      this.logger.error(
          '❌ Не вдалося підключитись до бази даних — застосунок зупиняється',
          error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getHello(): Promise<string> {
    try {
      const result = await this.db.execute(sql`SELECT now();`);
      const dbTime = result.rows[0].now;
      return `Hello World! Поточний час у базі даних: ${dbTime}`;
    } catch (error) {
      this.logger.error(
          'Не вдалося виконати запит у getHello()',
          error instanceof Error ? error.stack : String(error),
      );
      return 'Hello World! Але база даних недоступна 😢';
    }
  }
}