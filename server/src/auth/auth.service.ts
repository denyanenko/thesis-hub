import {
  BadRequestException,
  ConflictException,
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
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
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

interface EmergencyPasswordLockPayload {
  sub: number;
  purpose: 'emergency-password-lock';
}

interface EmailChangePayload {
  sub: number;
  oldEmail: string;
  newEmail: string;
  purpose: 'email-change';
}

interface EmailRevertPayload {
  sub: number;
  oldEmail: string;
  purpose: 'email-change-revert';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if ('code' in err && err.code === '23505') return true;
  if ('cause' in err && err.cause && typeof err.cause === 'object') {
    return 'code' in err.cause && err.cause.code === '23505';
  }
  return false;
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

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHashPromise ??= argon2.hash(crypto.randomUUID());
    return this.dummyPasswordHashPromise;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private buildFrontendLink(path: string, token: string): string {
    const frontendUrl = this.config.get('FRONTEND_URL').replace(/\/+$/, '');
    return `${frontendUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  /**
   * Дістає `sub` без перевірки підпису — лише щоб завантажити користувача з БД
   * і сформувати динамічний секрет для `verifyAsync`.
   */
  private extractTokenSubject(token: string): number | null {
    const decoded: unknown = this.jwtService.decode(token);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !('sub' in decoded) ||
      typeof decoded.sub !== 'number'
    ) {
      return null;
    }
    return decoded.sub;
  }

  /**
   * Секрет прив'язується до поточного хешу пароля: щойно пароль змінено,
   * усі раніше видані токени скидання / аварійного блокування автоматично стають недійсними.
   */
  private getResetSecret(passwordHash: string): string {
    return `${this.config.get('JWT_RESET_SECRET')}:${passwordHash}`;
  }

  /**
   * Токен підтвердження нової пошти стає недійсним, щойно зміниться пошта або пароль.
   */
  private getEmailChangeSecret(email: string, passwordHash: string): string {
    return `${this.config.get('JWT_RESET_SECRET')}:email-change:${email}:${passwordHash}`;
  }

  /**
   * Токен відкату пошти прив'язується тільки до поточної (нової) пошти, а НЕ до passwordHash,
   * щоб нападник не міг зламати кнопку відкату зміною пароля.
   * Щойно пошту повернуто назад — user.email змінюється і токен автоматично стає одноразовим.
   */
  private getEmailRevertSecret(currentEmail: string): string {
    return `${this.config.get('JWT_RESET_SECRET')}:email-revert:${currentEmail}`;
  }

  private async signResetToken(
    userId: number,
    passwordHash: string,
    expiresIn: '1h' | '15m' = '1h',
  ): Promise<string> {
    const payload: ResetPasswordPayload = {
      sub: userId,
      purpose: 'password-reset',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.getResetSecret(passwordHash),
      expiresIn,
    });
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    // Завжди виконуємо argon2.verify (навіть коли користувача немає),
    // щоб вирівняти час відповіді й уникнути перебору існуючих email
    const hashToVerify =
      user?.passwordHash ?? (await this.getDummyPasswordHash());
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

    const token = await this.signResetToken(user.id, user.passwordHash, '1h');
    const resetLink = this.buildFrontendLink('/reset-password', token);

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

    const userId = this.extractTokenSubject(dto.token);
    if (userId === null) {
      throw new BadRequestException(invalidTokenMessage);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user || !user.isActive) {
      throw new BadRequestException(invalidTokenMessage);
    }

    try {
      const payload = await this.jwtService.verifyAsync<ResetPasswordPayload>(
        dto.token,
        { secret: this.getResetSecret(user.passwordHash) },
      );
      if (payload.purpose !== 'password-reset') {
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

  /**
   * Зміна пароля в профілі: відкликає всі старі сесії, але одразу видає
   * свіжу пару токенів поточному пристрою. На пошту шле лист із 24-годинним
   * аварійним посиланням «Це були не ви?».
   */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Користувача не знайдено або деактивовано');
    }

    const isCurrentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Невірний поточний пароль');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'Новий пароль повинен відрізнятися від поточного',
      );
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

      // Завершуємо всі старі сеанси (поточний пристрій отримає нову сесію нижче)
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

    const sessionId = crypto.randomUUID();
    const { tokenId: _tokenId, ...tokens } = await this.generateTokens(
      { sub: user.id, email: user.email, role: user.role },
      sessionId,
      userAgent,
      ipAddress,
    );

    const emergencyPayload: EmergencyPasswordLockPayload = {
      sub: user.id,
      purpose: 'emergency-password-lock',
    };
    const emergencyToken = await this.jwtService.signAsync(emergencyPayload, {
      secret: this.getResetSecret(newPasswordHash),
      expiresIn: '24h',
    });
    const emergencyLink = this.buildFrontendLink(
      '/emergency-password-lock',
      emergencyToken,
    );

    void this.mailService
      .sendPasswordChangedEmail(user.email, emergencyLink)
      .catch((err: unknown) => {
        this.logger.warn(
          `Пароль користувача #${user.id} змінено, але не вдалося надіслати сповіщення: ${(err as Error).message}`,
        );
      });

    return tokens;
  }

  /**
   * Аварійне блокування після несанкціонованої зміни пароля («Це були не ви?»):
   * замінює пароль випадковим, відкликає всі сесії та видає 15-хвилинний reset-токен.
   */
  async emergencyLockPassword(token: string): Promise<{ resetToken: string }> {
    const invalidTokenMessage =
      'Недійсне або прострочене посилання безпеки';

    const userId = this.extractTokenSubject(token);
    if (userId === null) {
      throw new BadRequestException(invalidTokenMessage);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user || !user.isActive) {
      throw new BadRequestException(invalidTokenMessage);
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<EmergencyPasswordLockPayload>(token, {
          secret: this.getResetSecret(user.passwordHash),
        });
      if (payload.purpose !== 'emergency-password-lock') {
        throw new Error('Invalid token payload');
      }
    } catch {
      throw new BadRequestException(invalidTokenMessage);
    }

    // Ставимо випадковий пароль, щоб нападник миттєво втратив доступ
    const lockedPasswordHash = await argon2.hash(
      crypto.randomBytes(32).toString('hex'),
    );

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: lockedPasswordHash,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

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

    const resetToken = await this.signResetToken(
      user.id,
      lockedPasswordHash,
      '15m',
    );
    return { resetToken };
  }

  /**
   * Крок 1 зміни пошти: перевіряє пароль і унікальність нової адреси,
   * надсилає на нову пошту 1-годинне посилання підтвердження.
   */
  async requestEmailChange(
    userId: number,
    dto: RequestEmailChangeDto,
  ): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Користувача не знайдено або деактивовано');
    }

    const isCurrentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Невірний поточний пароль');
    }

    if (dto.newEmail === user.email) {
      throw new BadRequestException(
        'Ця електронна пошта вже використовується у вашому акаунті',
      );
    }

    const existingWithNewEmail = await this.db.query.users.findFirst({
      where: eq(users.email, dto.newEmail),
    });
    if (existingWithNewEmail) {
      throw new ConflictException(
        'Користувач із такою електронною поштою вже існує',
      );
    }

    const payload: EmailChangePayload = {
      sub: user.id,
      oldEmail: user.email,
      newEmail: dto.newEmail,
      purpose: 'email-change',
    };

    const confirmToken = await this.jwtService.signAsync(payload, {
      secret: this.getEmailChangeSecret(user.email, user.passwordHash),
      expiresIn: '1h',
    });

    const confirmLink = this.buildFrontendLink(
      '/confirm-email-change',
      confirmToken,
    );

    await this.mailService.sendConfirmEmailChangeEmail(
      dto.newEmail,
      confirmLink,
    );
  }

  /**
   * Крок 2 зміни пошти: підтверджує нову пошту, завершує всі сеанси
   * й надсилає на стару пошту 24-годинне посилання для відкату.
   */
  async confirmEmailChange(token: string): Promise<void> {
    const invalidTokenMessage =
      'Недійсне або прострочене посилання для підтвердження пошти';

    const userId = this.extractTokenSubject(token);
    if (userId === null) {
      throw new BadRequestException(invalidTokenMessage);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user || !user.isActive) {
      throw new BadRequestException(invalidTokenMessage);
    }

    let payload: EmailChangePayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailChangePayload>(token, {
        secret: this.getEmailChangeSecret(user.email, user.passwordHash),
      });
      if (
        payload.purpose !== 'email-change' ||
        typeof payload.oldEmail !== 'string' ||
        typeof payload.newEmail !== 'string'
      ) {
        throw new Error('Invalid token payload');
      }
    } catch {
      throw new BadRequestException(invalidTokenMessage);
    }

    const existingWithNewEmail = await this.db.query.users.findFirst({
      where: eq(users.email, payload.newEmail),
    });
    if (existingWithNewEmail && existingWithNewEmail.id !== user.id) {
      throw new ConflictException(
        'Користувач із такою електронною поштою вже існує',
      );
    }

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            email: payload.newEmail,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));

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
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException(
          'Користувач із такою електронною поштою вже існує',
        );
      }
      throw err;
    }

    const revertPayload: EmailRevertPayload = {
      sub: user.id,
      oldEmail: payload.oldEmail,
      purpose: 'email-change-revert',
    };
    const revertToken = await this.jwtService.signAsync(revertPayload, {
      secret: this.getEmailRevertSecret(payload.newEmail),
      expiresIn: '24h',
    });
    const revertLink = this.buildFrontendLink(
      '/revert-email-change',
      revertToken,
    );

    void this.mailService
      .sendEmailChangedEmail(payload.oldEmail, payload.newEmail, revertLink)
      .catch((err: unknown) => {
        this.logger.warn(
          `Пошту користувача #${user.id} змінено, але не вдалося надіслати лист на стару адресу: ${(err as Error).message}`,
        );
      });
  }

  /**
   * Відкат несанкціонованої зміни пошти зі старої скриньки (діє 24 години):
   * повертає стару пошту, ставить випадковий пароль, завершує всі сеанси,
   * сповіщає нову адресу й видає 15-хвилинний reset-токен для задання нового пароля.
   */
  async revertEmailChange(token: string): Promise<{ resetToken: string }> {
    const invalidTokenMessage =
      'Недійсне або прострочене посилання для скасування зміни пошти';

    const userId = this.extractTokenSubject(token);
    if (userId === null) {
      throw new BadRequestException(invalidTokenMessage);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user || !user.isActive) {
      throw new BadRequestException(invalidTokenMessage);
    }

    let payload: EmailRevertPayload;
    try {
      payload = await this.jwtService.verifyAsync<EmailRevertPayload>(token, {
        secret: this.getEmailRevertSecret(user.email),
      });
      if (
        payload.purpose !== 'email-change-revert' ||
        typeof payload.oldEmail !== 'string'
      ) {
        throw new Error('Invalid token payload');
      }
    } catch {
      throw new BadRequestException(invalidTokenMessage);
    }

    const existingWithOldEmail = await this.db.query.users.findFirst({
      where: eq(users.email, payload.oldEmail),
    });
    if (existingWithOldEmail && existingWithOldEmail.id !== user.id) {
      throw new ConflictException(
        'Стару електронну пошту вже зайнято іншим акаунтом. Зверніться до адміністратора.',
      );
    }

    const previousNewEmail = user.email;
    const lockedPasswordHash = await argon2.hash(
      crypto.randomBytes(32).toString('hex'),
    );

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            email: payload.oldEmail,
            passwordHash: lockedPasswordHash,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, user.id));

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
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException(
          'Стару електронну пошту вже зайнято іншим акаунтом. Зверніться до адміністратора.',
        );
      }
      throw err;
    }

    void this.mailService
      .sendEmailChangeRevertedEmail(previousNewEmail)
      .catch((err: unknown) => {
        this.logger.warn(
          `Зміну пошти користувача #${user.id} скасовано, але не вдалося сповістити ${previousNewEmail}: ${(err as Error).message}`,
        );
      });

    const resetToken = await this.signResetToken(
      user.id,
      lockedPasswordHash,
      '15m',
    );
    return { resetToken };
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
