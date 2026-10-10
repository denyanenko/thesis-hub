import { Global, Module } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as relations from './relations.js';
import { AppConfigService } from '../config/app-config.service.js';

export const DRIZZLE = 'DRIZZLE';

const fullSchema = { ...schema, ...relations };
export type DrizzleDB = NodePgDatabase<typeof fullSchema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService): Promise<DrizzleDB> => {
        const pool = new Pool({
          connectionString: config.get('DATABASE_URL'),
        });
        return drizzle(pool, { schema: fullSchema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
