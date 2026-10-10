import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import ms from 'ms';

/**
 * Кастомний валідатор, який перевіряє, чи є рядок валідним форматом для бібліотеки ms.
 * Валідні значення: '15m', '2h', '7d' тощо.
 */
export function IsStringValue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringValue',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          try {
            return ms(value as any) !== undefined;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} має бути валідним форматом часу (наприклад, '15m', '1h', '2 days')`;
        },
      },
    });
  };
}
