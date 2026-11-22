import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ORG_UNIT_TYPES, type OrgUnitType } from '../org-units.types.js';

export class HierarchyRuleInputDto {
  @IsIn(ORG_UNIT_TYPES, { message: 'Некоректний тип дочірньої одиниці' })
  childType: OrgUnitType;

  @ValidateIf((_, value) => value !== null)
  @IsIn(ORG_UNIT_TYPES, { message: 'Некоректний тип батьківської одиниці' })
  parentType: OrgUnitType | null;
}

export class ReplaceHierarchyRulesDto {
  @IsArray({ message: 'rules повинен бути масивом' })
  @ValidateNested({ each: true })
  @Type(() => HierarchyRuleInputDto)
  rules: HierarchyRuleInputDto[];
}
