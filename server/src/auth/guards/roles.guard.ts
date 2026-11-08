import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { JwtPayload, UserRole } from '../auth.service.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Метадані читаються і з методу, і з класу (метод має пріоритет)
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Ролі не вказані — достатньо бути авторизованим
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context
            .switchToHttp()
            .getRequest<{ user?: JwtPayload }>();

        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException('Недостатньо прав для доступу до цього ресурсу');
        }

        return true;
    }
}