import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { userRole } from '../../database/schema.js';
import type { UserRole } from '../../auth/auth.service.js';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimNullableString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Роль запрошуваного користувача',
    enum: userRole.enumValues,
    example: 'student',
  })
  @IsIn(userRole.enumValues, {
    message: 'Роль має бути однією з: student, supervisor, admin',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Електронна пошта користувача',
    example: 'ivanenko.ivan@lll.kpi.ua',
  })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Вкажіть коректну електронну пошту' })
  @MaxLength(255, {
    message: 'Електронна пошта не може перевищувати 255 символів',
  })
  email: string;

  @ApiProperty({ description: 'Прізвище', example: 'Іваненко' })
  @Transform(trimString)
  @IsString({ message: 'Прізвище має бути рядком' })
  @IsNotEmpty({ message: 'Прізвище є обовʼязковим' })
  @MaxLength(100, { message: 'Прізвище не може перевищувати 100 символів' })
  lastName: string;

  @ApiProperty({ description: 'Імʼя', example: 'Іван' })
  @Transform(trimString)
  @IsString({ message: 'Імʼя має бути рядком' })
  @IsNotEmpty({ message: 'Імʼя є обовʼязковим' })
  @MaxLength(100, { message: 'Імʼя не може перевищувати 100 символів' })
  firstName: string;

  @ApiPropertyOptional({
    description: 'По батькові (опціонально)',
    example: 'Іванович',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'По батькові має бути рядком' })
  @MaxLength(100, { message: 'По батькові не може перевищувати 100 символів' })
  patronymic?: string | null;

  @ApiPropertyOptional({
    description: 'Номер студентського квитка / залікової книжки (для ролі student)',
    example: 'КВ12345678',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Номер студентського має бути рядком' })
  @MaxLength(64, {
    message: 'Номер студентського не може перевищувати 64 символи',
  })
  studentNumber?: string | null;

  @ApiPropertyOptional({
    description: 'ID академічної групи (для ролі student)',
    example: 12,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt({ message: 'ID групи має бути цілим числом' })
  @Min(1, { message: 'ID групи має бути додатним числом' })
  groupId?: number | null;

  @ApiPropertyOptional({
    description:
      'ID підрозділу (кафедра для supervisor; підрозділ або null для головного admin)',
    example: 42,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt({ message: 'ID підрозділу має бути цілим числом' })
  @Min(1, { message: 'ID підрозділу має бути додатним числом' })
  orgUnitId?: number | null;

  @ApiPropertyOptional({
    description: 'Посада (для ролей supervisor та admin)',
    example: 'Доцент',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Посада має бути рядком' })
  @MaxLength(150, { message: 'Посада не може перевищувати 150 символів' })
  position?: string | null;

  @ApiPropertyOptional({
    description: 'Науковий ступінь (для ролі supervisor)',
    example: 'к.т.н.',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Науковий ступінь має бути рядком' })
  @MaxLength(120, {
    message: 'Науковий ступінь не може перевищувати 120 символів',
  })
  academicDegree?: string | null;

  @ApiPropertyOptional({
    description: 'Вчене звання (для ролі supervisor)',
    example: 'доцент',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Вчене звання має бути рядком' })
  @MaxLength(120, {
    message: 'Вчене звання не може перевищувати 120 символів',
  })
  academicTitle?: string | null;
}
