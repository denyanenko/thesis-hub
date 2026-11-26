import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  DEGREE_LEVELS,
  type DegreeLevel,
} from '../educational-programs.types.js';

export class ReplaceEducationalProgramDto {
  @ApiPropertyOptional({
    description:
      'ID вже існуючої активної ОП-правонаступника (взаємовиключно з полями new*)',
    example: 14,
  })
  @IsOptional()
  @IsInt({ message: 'targetProgramId повинен бути цілим числом' })
  @IsPositive({ message: 'targetProgramId повинен бути додатним числом' })
  targetProgramId?: number;

  @ApiPropertyOptional({
    description: 'Назва нової ОП-правонаступника (режим створення нової ОП)',
    example: 'Інформаційні системи та інтелектуальні технології',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва нової освітньої програми повинна бути рядком' })
  @IsNotEmpty({
    message: 'Назва нової освітньої програми не може бути порожньою',
  })
  @MaxLength(255, {
    message: 'Назва нової освітньої програми не може перевищувати 255 символів',
  })
  newName?: string;

  @ApiPropertyOptional({
    description:
      'ID активної спеціальності для нової ОП (за замовчуванням — спеціальність поточної ОП)',
    example: 51,
  })
  @IsOptional()
  @IsInt({ message: 'newSpecialtyId повинен бути цілим числом' })
  @IsPositive({ message: 'newSpecialtyId повинен бути додатним числом' })
  newSpecialtyId?: number;

  @ApiPropertyOptional({
    description:
      'ID активної кафедри для нової ОП (за замовчуванням — кафедра поточної ОП)',
    example: 82,
  })
  @IsOptional()
  @IsInt({ message: 'newOrgUnitId повинен бути цілим числом' })
  @IsPositive({ message: 'newOrgUnitId повинен бути додатним числом' })
  newOrgUnitId?: number;

  @ApiPropertyOptional({
    description:
      'Рівень вищої освіти для нової ОП (за замовчуванням — рівень поточної ОП)',
    enum: DEGREE_LEVELS,
    example: 'bachelor',
  })
  @IsOptional()
  @IsIn(DEGREE_LEVELS, { message: 'Некоректний рівень вищої освіти' })
  newDegreeLevel?: DegreeLevel;

  @ApiPropertyOptional({
    description: 'Підстава або коментар щодо заміни/перейменування ОП',
    example: 'Оновлення редакції освітньої програми рішенням Вченої ради 2026',
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
