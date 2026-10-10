import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { eq } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { users, refreshTokens, userRole } from '../database/schema.js';
import { LoginDto } from './dto/login.dto.js';
import { AppConfigService } from '../config/app-config.service.js';
import ms from 'ms';

export type UserRole = (typeof userRole.enumValues)[number];

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    // Якщо користувача немає або він деактивований
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    // Генеруємо нову сесію (sessionId об'єднує ланцюжок ротацій рефреш-токенів)
    const sessionId = crypto.randomUUID();

    const { tokenId: _tokenId, ...tokens } = await this.generateTokens(
      { sub: user.id, email: user.email, role: user.role },
      sessionId,
      userAgent,
      ipAddress,
    );
    return tokens;
  }

  async refresh(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const tokenHash = this.hashToken(rawRefreshToken);

    // Шукаємо токен разом із даними користувача
    const currentToken = await this.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, tokenHash),
      with: { user: true },
    });

    if (!currentToken) {
      throw new UnauthorizedException('Недійсний refresh-токен');
    }

    // Token Reuse Detection
    if (currentToken.isRevoked || currentToken.replacedById !== null) {
      // Компрометація сесії: анулюємо ВСІ токени цього ланцюжка
      await this.db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.sessionId, currentToken.sessionId));

      throw new UnauthorizedException(
        'Виявлено підозрілу активність. Сесію анульовано. Будь ласка, увійдіть знову.',
      );
    }

    // Перевірка терміну дії
    if (new Date(currentToken.expiresAt) < new Date()) {
      throw new UnauthorizedException('Термін дії refresh-токена минув');
    }

    if (!currentToken.user.isActive) {
      throw new UnauthorizedException('Акаунт користувача деактивовано');
    }

    const payload: JwtPayload = {
      sub: currentToken.user.id,
      email: currentToken.user.email,
      role: currentToken.user.role,
    };

    // Генеруємо нові токени для тієї ж сесії
    const { tokenId, ...tokens } = await this.generateTokens(
      payload,
      currentToken.sessionId,
      userAgent,
      ipAddress,
    );

    // Інвалідуємо старий токен та встановлюємо вказівник на новий (replacedById)
    await this.db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        replacedById: tokenId,
      })
      .where(eq(refreshTokens.id, currentToken.id));

    return tokens;
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  private async generateTokens(
    payload: JwtPayload,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const accessToken = await this.jwtService.signAsync(payload);

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresInMs = ms(this.config.get('REFRESH_TOKEN_EXPIRES_IN'));
    const expiresAt = new Date(Date.now() + expiresInMs);

    const [insertedToken] = await this.db
      .insert(refreshTokens)
      .values({
        userId: payload.sub,
        sessionId: sessionId,
        tokenHash: tokenHash,
        expiresAt: expiresAt.toISOString(),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      })
      .returning({ id: refreshTokens.id });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenId: insertedToken.id,
    };
  }
}
