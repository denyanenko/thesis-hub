import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { userRole } from '../../database/schema.js';
import type { UserRole } from '../../auth/auth.service.js';

export const MAX_BULK_INVITATION_ROWS = 500;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimNullableString = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export class BulkInvitationRowDto {
  @ApiPropertyOptional({
    description: 'Номер рядка (для відображення в таблиці / звіті про помилки)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер рядка має бути цілим числом' })
  @Min(1, { message: 'Номер рядка має бути не менше 1' })
  rowNumber?: number;

  @ApiProperty({
    description: 'Електронна пошта (перевіряється по рядках під час dry-run)',
    example: 'student1@lll.kpi.ua',
  })
  @Transform(trimString)
  @IsString({ message: 'Електронна пошта має бути рядком' })
  @MaxLength(320)
  email: string;

  @ApiProperty({ description: 'Прізвище', example: 'Петренко' })
  @Transform(trimString)
  @IsString({ message: 'Прізвище має бути рядком' })
  @MaxLength(200)
  lastName: string;

  @ApiProperty({ description: 'Імʼя', example: 'Олена' })
  @Transform(trimString)
  @IsString({ message: 'Імʼя має бути рядком' })
  @MaxLength(200)
  firstName: string;

  @ApiPropertyOptional({ description: 'По батькові', nullable: true })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'По батькові має бути рядком' })
  @MaxLength(200)
  patronymic?: string | null;

  @ApiPropertyOptional({
    description: 'Номер студентського квитка (для student)',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString({ message: 'Номер студентського має бути рядком' })
  @MaxLength(100)
  studentNumber?: string | null;

  @ApiPropertyOptional({
    description: 'ID академічної групи (для student)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt({ message: 'ID групи має бути цілим числом' })
  @Min(1)
  groupId?: number | null;

  @ApiPropertyOptional({
    description: 'Текстове позначення групи (напр., з Excel або буфера обміну)',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(300)
  groupRef?: string | null;

  @ApiPropertyOptional({
    description: 'ID підрозділу (для supervisor / admin)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @Type(() => Number)
  @IsInt({ message: 'ID підрозділу має бути цілим числом' })
  @Min(1)
  orgUnitId?: number | null;

  @ApiPropertyOptional({
    description:
      'Текстове позначення підрозділу/кафедри (напр., з Excel або буфера обміну)',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(400)
  orgUnitRef?: string | null;

  @ApiPropertyOptional({ description: 'Посада', nullable: true })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200)
  position?: string | null;

  @ApiPropertyOptional({ description: 'Науковий ступінь', nullable: true })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200)
  academicDegree?: string | null;

  @ApiPropertyOptional({ description: 'Вчене звання', nullable: true })
  @IsOptional()
  @Transform(trimNullableString)
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(200)
  academicTitle?: string | null;
}

export class BulkPreviewInvitationsDto {
  @ApiProperty({
    description: 'Роль для всього пакету запрошень',
    enum: userRole.enumValues,
  })
  @IsIn(userRole.enumValues, {
    message: 'Роль має бути однією з: student, supervisor, admin',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Список рядків для перевірки',
    type: [BulkInvitationRowDto],
  })
  @IsArray({ message: 'Список рядків має бути масивом' })
  @ArrayMinSize(1, { message: 'Додайте щонайменше один рядок' })
  @ArrayMaxSize(MAX_BULK_INVITATION_ROWS, {
    message: `За один раз можна обробити не більше ${MAX_BULK_INVITATION_ROWS} рядків`,
  })
  @ValidateNested({ each: true })
  @Type(() => BulkInvitationRowDto)
  rows: BulkInvitationRowDto[];
}

export class BulkCreateInvitationsDto extends BulkPreviewInvitationsDto {
  @ApiPropertyOptional({
    description:
      'Якщо true — пропустити рядки з помилками й надіслати лише валідні; якщо false — заблокувати весь пакет при наявності помилок',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Параметр skipInvalid має бути логічним значенням' })
  skipInvalid?: boolean;
}
