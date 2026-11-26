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
} from 'class-validator';
import {
  DEGREE_LEVELS,
  type DegreeLevel,
} from '../educational-programs.types.js';

export class UpdateEducationalProgramDto {
  @ApiPropertyOptional({
    description: 'Оновлений ID спеціальності (для активної ОП — лише активна спеціальність)',
    example: 51,
  })
  @IsOptional()
  @IsInt({ message: 'specialtyId повинен бути цілим числом' })
  @IsPositive({ message: 'specialtyId повинен бути додатним числом' })
  specialtyId?: number;

  @ApiPropertyOptional({
    description: 'Оновлений ID кафедри у зоні відповідальності адміністратора',
    example: 82,
  })
  @IsOptional()
  @IsInt({ message: 'orgUnitId повинен бути цілим числом' })
  @IsPositive({ message: 'orgUnitId повинен бути додатним числом' })
  orgUnitId?: number;

  @ApiPropertyOptional({
    description: 'Оновлена назва освітньої програми (для виправлення одруківки)',
    example: 'Інформаційні управляючі системи та технології',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва освітньої програми повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва освітньої програми не може бути порожньою' })
  @MaxLength(255, {
    message: 'Назва освітньої програми не може перевищувати 255 символів',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Оновлений рівень вищої освіти',
    enum: DEGREE_LEVELS,
    example: 'master',
  })
  @IsOptional()
  @IsIn(DEGREE_LEVELS, { message: 'Некоректний рівень вищої освіти' })
  degreeLevel?: DegreeLevel;
}
