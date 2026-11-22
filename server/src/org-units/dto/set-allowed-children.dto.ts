import { ArrayMinSize, IsArray, IsIn, ValidateIf } from 'class-validator';
import { ORG_UNIT_TYPES, type OrgUnitType } from '../org-units.types.js';

export class SetAllowedChildrenDto {
  @ValidateIf((_, value) => value !== null)
  @IsArray({ message: 'childTypes повинен бути масивом або null' })
  @ArrayMinSize(1, {
    message:
      'Оберіть щонайменше один дочірній тип або передайте null, щоб використовувати загальні правила',
  })
  @IsIn(ORG_UNIT_TYPES, { each: true, message: 'Некоректний дочірній тип' })
  childTypes: OrgUnitType[] | null;
}
