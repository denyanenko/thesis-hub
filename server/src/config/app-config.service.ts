import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariablesValidator } from './env.validation.js';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariablesValidator>,
  ) {}

  /**
   * Строго типізована обгортка для отримання змінних оточення.
   * Забезпечує автоматичне виведення типу значення (infer) на основі переданого ключа.
   *
   * @param key Ключ змінної оточення з EnvironmentVariablesValidator
   * @returns Провалідоване значення відповідного типу (string, number, etc.)
   */
  get<K extends keyof EnvironmentVariablesValidator>(
    key: K,
  ): EnvironmentVariablesValidator[K] {
    return this.configService.get(key, {
      infer: true,
    }) as EnvironmentVariablesValidator[K];
  }
}
