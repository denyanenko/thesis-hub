import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateGroupDto {
  @ApiPropertyOptional({
    description: 'Новий ID освітньої програми',
    example: 12,
  })
  @IsOptional()
  @IsInt({ message: 'educationalProgramId повинен бути цілим числом' })
  @IsPositive({ message: 'educationalProgramId повинен бути додатним числом' })
  educationalProgramId?: number;

  @ApiPropertyOptional({
    description: 'Новий шифр (назва) академічної групи',
    example: 'ІС-51мп',
    maxLength: 64,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва групи повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва групи не може бути порожньою' })
  @MaxLength(64, {
    message: 'Назва групи не може перевищувати 64 символи',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Рік вступу (набору) групи (null — очистити)',
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
