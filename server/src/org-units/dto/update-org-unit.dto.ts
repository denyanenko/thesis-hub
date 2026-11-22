import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ORG_UNIT_TYPES, type OrgUnitType } from '../org-units.types.js';

export class UpdateOrgUnitDto {
  @IsOptional()
  @IsIn(ORG_UNIT_TYPES, { message: 'Некоректний тип підрозділу' })
  unitType?: OrgUnitType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString({ message: 'Назва повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва підрозділу не може бути порожньою' })
  @MaxLength(255, { message: 'Назва не може перевищувати 255 символів' })
  name?: string;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Скорочена назва повинна бути рядком' })
  @MaxLength(64, { message: 'Скорочена назва не може перевищувати 64 символи' })
  shortName?: string | null;
}
