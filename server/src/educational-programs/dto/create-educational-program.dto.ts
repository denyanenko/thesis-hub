import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DEGREE_LEVELS,
  type DegreeLevel,
} from '../educational-programs.types.js';

export class CreateEducationalProgramDto {
  @ApiProperty({
    description: 'ID активної спеціальності',
    example: 51,
  })
  @IsInt({ message: 'specialtyId повинен бути цілим числом' })
  @IsPositive({ message: 'specialtyId повинен бути додатним числом' })
  specialtyId: number;

  @ApiProperty({
    description: 'ID активної кафедри (org_units з типом department)',
    example: 82,
  })
  @IsInt({ message: 'orgUnitId повинен бути цілим числом' })
  @IsPositive({ message: 'orgUnitId повинен бути додатним числом' })
  orgUnitId: number;

  @ApiProperty({
    description: 'Повна назва освітньої програми',
    example: 'Інформаційне забезпечення робототехнічних систем',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва освітньої програми повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва освітньої програми є обовʼязковою' })
  @MaxLength(255, {
    message: 'Назва освітньої програми не може перевищувати 255 символів',
  })
  name: string;

  @ApiProperty({
    description: 'Рівень вищої освіти',
    enum: DEGREE_LEVELS,
    example: 'bachelor',
  })
  @IsIn(DEGREE_LEVELS, { message: 'Некоректний рівень вищої освіти' })
  degreeLevel: DegreeLevel;
}
