import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';
import type { UserRole } from '../auth.service.js';

export function Auth(...roles: UserRole[]) {
  return applyDecorators(
      // Порядок важливий: спочатку автентифікація, потім перевірка ролі
      UseGuards(JwtAuthGuard, RolesGuard),
      ...(roles.length > 0 ? [Roles(...roles)] : []),
      ApiCookieAuth('access_token'),
      ApiUnauthorizedResponse({ description: 'Не авторизовано' }),
      ...(roles.length > 0
          ? [ApiForbiddenResponse({ description: 'Недостатньо прав' })]
          : []),
  );
}