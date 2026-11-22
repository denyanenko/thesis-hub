import { IsInt, IsPositive, ValidateIf } from 'class-validator';

export class MoveOrgUnitDto {
  @ValidateIf((_, value) => value !== null)
  @IsInt({ message: 'parentId повинен бути цілим числом' })
  @IsPositive({ message: 'parentId повинен бути додатним числом' })
  parentId: number | null;
}
