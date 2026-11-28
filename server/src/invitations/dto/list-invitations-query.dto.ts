import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { userRole } from '../../database/schema.js';
import type { UserRole } from '../../auth/auth.service.js';
import type { InvitationLifecycleStatus } from '../invitations.types.js';

const INVITATION_STATUS_VALUES: InvitationLifecycleStatus[] = [
  'pending',
  'accepted',
  'expired',
  'revoked',
];

export class ListInvitationsQueryDto {
  @ApiPropertyOptional({
    description: 'Фільтр за роллю',
    enum: userRole.enumValues,
  })
  @IsOptional()
  @IsIn(userRole.enumValues, {
    message: 'Роль має бути однією з: student, supervisor, admin',
  })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Фільтр за статусом запрошення',
    enum: INVITATION_STATUS_VALUES,
  })
  @IsOptional()
  @IsIn(INVITATION_STATUS_VALUES, {
    message: 'Некоректний статус фільтрації запрошень',
  })
  status?: InvitationLifecycleStatus;

  @ApiPropertyOptional({
    description: 'Пошук за email, ПІБ або номером студентського',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;
}
