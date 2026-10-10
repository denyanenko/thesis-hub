import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsString,
  IsNumber,
  IsUrl,
  IsOptional,
  validateSync,
} from 'class-validator';
import type { StringValue } from 'ms';

import { IsStringValue } from './validators/is-string-value.validator.js';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsStringValue()
  JWT_ACCESS_EXPIRES_IN: StringValue = '15m';

  @IsStringValue()
  REFRESH_TOKEN_EXPIRES_IN: StringValue = '30d';

  // Опціональні змінні для сідінгу
  @IsOptional()
  @IsString()
  INITIAL_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  INITIAL_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  INITIAL_ADMIN_FIRST_NAME?: string;

  @IsOptional()
  @IsString()
  INITIAL_ADMIN_LAST_NAME?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariablesValidator,
    config,
    { enableImplicitConversion: true }, // автоматично конвертує рядки в потрібні типи
  );
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
