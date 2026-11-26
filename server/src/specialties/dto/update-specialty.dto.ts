import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateSpecialtyDto {
  @ApiPropertyOptional({
    description: 'Оновлений код спеціальності (для виправлення одруківки)',
    example: 'F6',
    maxLength: 32,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Код спеціальності повинен бути рядком' })
  @IsNotEmpty({ message: 'Код спеціальності не може бути порожнім' })
  @MaxLength(32, {
    message: 'Код спеціальності не може перевищувати 32 символи',
  })
  @Matches(/^[A-ZА-ЯІЇЄҐ0-9._-]+$/i, {
    message:
      'Код спеціальності може містити лише літери, цифри, крапку, дефіс або підкреслення',
  })
  code?: string;

  @ApiPropertyOptional({
    description: 'Оновлена назва спеціальності',
    example: 'Інформаційні системи і технології',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва спеціальності повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва спеціальності не може бути порожньою' })
  @MaxLength(255, {
    message: 'Назва спеціальності не може перевищувати 255 символів',
  })
  name?: string;
}
