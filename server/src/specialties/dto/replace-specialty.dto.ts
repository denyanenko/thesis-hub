import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  SPECIALTY_PROGRAMS_ACTIONS,
  type SpecialtyProgramsAction,
} from '../specialties.types.js';

export class ReplaceSpecialtyDto {
  @ApiPropertyOptional({
    description:
      'ID вже існуючої активної спеціальності-правонаступника (взаємовиключно з newCode/newName)',
    example: 42,
  })
  @IsOptional()
  @IsInt({ message: 'targetSpecialtyId повинен бути цілим числом' })
  @IsPositive({ message: 'targetSpecialtyId повинен бути додатним числом' })
  targetSpecialtyId?: number;

  @ApiPropertyOptional({
    description:
      'Код нової спеціальності-правонаступника (взаємовиключно з targetSpecialtyId)',
    example: 'F6',
    maxLength: 32,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Код нової спеціальності повинен бути рядком' })
  @IsNotEmpty({ message: 'Код нової спеціальності не може бути порожнім' })
  @MaxLength(32, {
    message: 'Код нової спеціальності не може перевищувати 32 символи',
  })
  @Matches(/^[A-ZА-ЯІЇЄҐ0-9._-]+$/i, {
    message:
      'Код спеціальності може містити лише літери, цифри, крапку, дефіс або підкреслення',
  })
  newCode?: string;

  @ApiPropertyOptional({
    description:
      'Назва нової спеціальності-правонаступника (взаємовиключно з targetSpecialtyId)',
    example: 'Інформаційні системи і технології',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва нової спеціальності повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва нової спеціальності не може бути порожньою' })
  @MaxLength(255, {
    message: 'Назва нової спеціальності не може перевищувати 255 символів',
  })
  newName?: string;

  @ApiPropertyOptional({
    description:
      'Дія з активними освітніми програмами старої спеціальності: keep (залишити без змін) або clone (клонувати під нову спеціальність із деактивацією старих ОП)',
    enum: SPECIALTY_PROGRAMS_ACTIONS,
    default: 'keep',
  })
  @IsOptional()
  @IsIn(SPECIALTY_PROGRAMS_ACTIONS, {
    message: 'Некоректна дія для освітніх програм (допустимо: keep або clone)',
  })
  programsAction?: SpecialtyProgramsAction;

  @ApiPropertyOptional({
    description: 'Підстава або коментар щодо перекодування/заміни спеціальності',
    example: 'Постанова КМУ від 30.08.2024 № 1021',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Причина заміни повинна бути рядком' })
  @MaxLength(500, {
    message: 'Причина заміни не може перевищувати 500 символів',
  })
  reason?: string | null;
}
