import { IsBoolean, IsOptional } from 'class-validator';

export class DeactivateOrgUnitDto {
  @IsOptional()
  @IsBoolean({ message: 'cascade повинен бути булевим значенням' })
  cascade?: boolean;
}
