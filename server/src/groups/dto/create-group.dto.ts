import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'ID активної освітньої програми',
    example: 12,
  })
  @IsInt({ message: 'educationalProgramId повинен бути цілим числом' })
  @IsPositive({ message: 'educationalProgramId повинен бути додатним числом' })
  educationalProgramId: number;

  @ApiProperty({
    description: 'Шифр (назва) академічної групи',
    example: 'ІС-51мп',
    maxLength: 64,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва групи повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва групи є обовʼязковою' })
  @MaxLength(64, {
    message: 'Назва групи не може перевищувати 64 символи',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Рік вступу (набору) групи',
    example: 2025,
    nullable: true,
    minimum: 1990,
    maximum: 2100,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'Рік вступу повинен бути цілим числом' })
  @Min(1990, { message: 'Рік вступу не може бути меншим за 1990' })
  @Max(2100, { message: 'Рік вступу не може перевищувати 2100' })
  enrollmentYear?: number | null;
}
