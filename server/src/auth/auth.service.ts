import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { users, refreshTokens, userRole } from '../database/schema.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { AppConfigService } from '../config/app-config.service.js';
import { MailService } from '../mail/mail.service.js';
import ms from 'ms';

export type UserRole = (typeof userRole.enumValues)[number];

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

interface ResetPasswordPayload {
  sub: number;
  purpose: 'password-reset';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private dummyPasswordHashPromise?: Promise<string>;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.getDummyPasswordHash();
  }
  // Кешуємо проміс, а не рядок: паралельні виклики ділять одне хешування.
  // onModuleInit прогріває кеш при старті, щоб перший логін не був повільнішим.
  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHashPromise ??= argon2.hash(crypto.randomUUID());
    return this.dummyPasswordHashPromise;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Секрет прив'язується до поточного хешу пароля: щойно пароль змінено,
   * усі раніше видані токени скидання автоматично стають недійсними.
   */
  private getResetSecret(passwordHash: string): string {
    return `${this.config.get('JWT_RESET_SECRET')}:${passwordHash}`;
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    // Завжди виконуємо argon2.verify (навіть коли користувача немає),
    // щоб вирівняти час відповіді й уникнути перебору існуючих email
    const hashToVerify = user?.passwordHash ?? (await this.getDummyPasswordHash());
    const isPasswordValid = await argon2.verify(hashToVerify, dto.password);

    if (!user || !user.isActive || !isPasswordValid) {
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    // Не розкриваємо, чи існує користувач із таким email
    if (!user || !user.isActive) {
      return;
    }

    const payload: ResetPasswordPayload = {
      sub: user.id,
      purpose: 'password-reset',
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.getResetSecret(user.passwordHash),
      expiresIn: '1h',
    });

    const frontendUrl = this.config.get('FRONTEND_URL').replace(/\/+$/, '');
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    // Відправляємо лист у фоні, щоб час відповіді та статус не залежали від існування email
    void this.mailService
      .sendResetPasswordEmail(user.email, resetLink)
      .catch((err: unknown) => {
        this.logger.error(
          `Не вдалося надіслати лист відновлення для користувача #${user.id}`,
          (err as Error).stack,
        );
      });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const invalidTokenMessage =
      'Недійсне або прострочене посилання для відновлення пароля';

    const decoded: unknown = this.jwtService.decode(dto.token);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !('sub' in decoded) ||
      typeof decoded.sub !== 'number' ||
      !('purpose' in decoded) ||
      decoded.purpose !== 'password-reset'
    ) {
      throw new BadRequestException(invalidTokenMessage);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, decoded.sub),
    });

    if (!user || !user.isActive) {
      throw new BadRequestException(invalidTokenMessage);
    }

    try {
      const payload = await this.jwtService.verifyAsync<ResetPasswordPayload>(
        dto.token,
        { secret: this.getResetSecret(user.passwordHash) },
      );

      if (payload.sub !== user.id || payload.purpose !== 'password-reset') {
        throw new Error('Invalid token payload');
      }
    } catch {
      throw new BadRequestException(invalidTokenMessage);
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

      // Завершуємо всі активні сеанси користувача
      await tx
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(
          and(
            eq(refreshTokens.userId, user.id),
            eq(refreshTokens.isRevoked, false),
          ),
        );
    });

    try {
      await this.mailService.sendPasswordChangedEmail(user.email);
    } catch (err) {
      this.logger.warn(
        `Пароль користувача #${user.id} змінено, але не вдалося надіслати лист-підтвердження: ${(err as Error).message}`,
      );
    }
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
