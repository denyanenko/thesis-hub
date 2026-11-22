import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service.js';
import type { DrizzleDB } from '../database/database.module.js';
import type { AppConfigService } from '../config/app-config.service.js';
import type { MailService } from '../mail/mail.service.js';

const TEST_CONFIG = {
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_RESET_SECRET: 'test-reset-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '30d',
  FRONTEND_URL: 'http://localhost:5173/',
} as const;

function createDbMock() {
  const returning = vi.fn().mockResolvedValue([{ id: 101 }]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  const findUser = vi.fn();
  const findRefreshToken = vi.fn();

  const tx = { update, insert };
  const transaction = vi.fn(
    async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
  );

  return {
    db: {
      query: {
        users: { findFirst: findUser },
        refreshTokens: { findFirst: findRefreshToken },
      },
      insert,
      update,
      transaction,
    } as unknown as DrizzleDB,
    mocks: {
      findUser,
      findRefreshToken,
      insert,
      values,
      update,
      set,
      where,
      transaction,
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let dbMock: ReturnType<typeof createDbMock>;
  let mailMock: {
    sendResetPasswordEmail: ReturnType<typeof vi.fn>;
    sendPasswordChangedEmail: ReturnType<typeof vi.fn>;
    sendConfirmEmailChangeEmail: ReturnType<typeof vi.fn>;
    sendEmailChangedEmail: ReturnType<typeof vi.fn>;
    sendEmailChangeRevertedEmail: ReturnType<typeof vi.fn>;
  };

  let existingPasswordHash: string;
  let changedPasswordHash: string;

  const makeUser = (
    overrides: Partial<{
      id: number;
      email: string;
      passwordHash: string;
      role: 'student' | 'supervisor' | 'admin';
      isActive: boolean;
    }> = {},
  ) => ({
    id: 1,
    email: 'student@uni.ua',
    passwordHash: existingPasswordHash,
    role: 'student' as const,
    isActive: true,
    ...overrides,
  });

  beforeAll(async () => {
    [existingPasswordHash, changedPasswordHash] = await Promise.all([
      argon2.hash('correct-password'),
      argon2.hash('already-changed'),
    ]);
  });

  beforeEach(() => {
    dbMock = createDbMock();
    jwtService = new JwtService({
      secret: TEST_CONFIG.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: TEST_CONFIG.JWT_ACCESS_EXPIRES_IN },
    });

    const configMock = {
      get: vi.fn((key: keyof typeof TEST_CONFIG) => TEST_CONFIG[key]),
    } as unknown as AppConfigService;

    mailMock = {
      sendResetPasswordEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
      sendConfirmEmailChangeEmail: vi.fn().mockResolvedValue(undefined),
      sendEmailChangedEmail: vi.fn().mockResolvedValue(undefined),
      sendEmailChangeRevertedEmail: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      dbMock.db,
      jwtService,
      configMock,
      mailMock as unknown as MailService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('повертає пару токенів для активного користувача з вірним паролем', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser());

      const tokens = await service.login(
        { email: 'student@uni.ua', password: 'correct-password' },
        'Vitest',
        '127.0.0.1',
      );

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toHaveLength(128);
      expect(dbMock.mocks.insert).toHaveBeenCalledTimes(1);

      const payload = await jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: string;
      }>(tokens.accessToken);
      expect(payload.sub).toBe(1);
      expect(payload.email).toBe('student@uni.ua');
      expect(payload.role).toBe('student');
    });

    it('викидає UnauthorizedException при невірному паролі', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser());

      await expect(
        service.login({ email: 'student@uni.ua', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('викидає UnauthorizedException для неіснуючого користувача', async () => {
      dbMock.mocks.findUser.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'missing@uni.ua', password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('викидає UnauthorizedException для деактивованого користувача', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.login({ email: 'student@uni.ua', password: 'correct-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('не надсилає лист і не кидає помилку, якщо користувача не існує', async () => {
      dbMock.mocks.findUser.mockResolvedValue(undefined);

      await expect(
        service.forgotPassword({ email: 'unknown@uni.ua' }),
      ).resolves.toBeUndefined();
      expect(mailMock.sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it('не надсилає лист для деактивованого користувача', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser({ isActive: false }));

      await service.forgotPassword({ email: 'student@uni.ua' });
      expect(mailMock.sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it('формує посилання з валідним reset-токеном і викликає MailService', async () => {
      const user = makeUser();
      dbMock.mocks.findUser.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });

      expect(mailMock.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
      const [to, link] = mailMock.sendResetPasswordEmail.mock.calls[0] as [
        string,
        string,
      ];
      expect(to).toBe(user.email);

      const parsed = new URL(link);
      expect(`${parsed.origin}${parsed.pathname}`).toBe(
        'http://localhost:5173/reset-password',
      );
      const token = parsed.searchParams.get('token');
      expect(token).toBeTruthy();

      const payload = await jwtService.verifyAsync<{
        sub: number;
        purpose: string;
      }>(token!, {
        secret: `${TEST_CONFIG.JWT_RESET_SECRET}:${user.passwordHash}`,
      });
      expect(payload.sub).toBe(user.id);
      expect(payload.purpose).toBe('password-reset');
    });

    it('не прокидає помилку назовні, якщо фоновий SMTP впав', async () => {
      const errorSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      dbMock.mocks.findUser.mockResolvedValue(makeUser());
      mailMock.sendResetPasswordEmail.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.forgotPassword({ email: 'student@uni.ua' }),
      ).resolves.toBeUndefined();

      await new Promise((resolve) => setImmediate(resolve));
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    const signResetToken = async (
      userId: number,
      passwordHash: string,
      expiresIn: '1h' | '-1s' = '1h',
    ) =>
      jwtService.signAsync(
        { sub: userId, purpose: 'password-reset' },
        {
          secret: `${TEST_CONFIG.JWT_RESET_SECRET}:${passwordHash}`,
          expiresIn,
        },
      );

    it('змінює пароль, відкликає refresh-токени і шле лист-підтвердження', async () => {
      const user = makeUser();
      const token = await signResetToken(user.id, user.passwordHash);
      dbMock.mocks.findUser.mockResolvedValue(user);

      await service.resetPassword({ token, newPassword: 'new-strong-password' });

      expect(dbMock.mocks.transaction).toHaveBeenCalledTimes(1);
      expect(dbMock.mocks.update).toHaveBeenCalledTimes(2);

      const firstSetArg = dbMock.mocks.set.mock.calls[0][0] as {
        passwordHash: string;
      };
      expect(
        await argon2.verify(firstSetArg.passwordHash, 'new-strong-password'),
      ).toBe(true);

      expect(dbMock.mocks.set.mock.calls[1][0]).toEqual({ isRevoked: true });
      expect(mailMock.sendPasswordChangedEmail).toHaveBeenCalledWith(user.email);
    });

    it('відхиляє повторне використання токена після зміни пароля', async () => {
      const user = makeUser();
      const oldToken = await signResetToken(user.id, user.passwordHash);

      dbMock.mocks.findUser.mockResolvedValue(
        makeUser({ passwordHash: changedPasswordHash }),
      );

      await expect(
        service.resetPassword({
          token: oldToken,
          newPassword: 'another-password',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dbMock.mocks.transaction).not.toHaveBeenCalled();
    });

    it('відхиляє прострочений токен', async () => {
      const user = makeUser();
      const expiredToken = await signResetToken(
        user.id,
        user.passwordHash,
        '-1s',
      );
      dbMock.mocks.findUser.mockResolvedValue(user);

      await expect(
        service.resetPassword({
          token: expiredToken,
          newPassword: 'new-strong-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє access-токен замість reset-токена', async () => {
      const user = makeUser();
      const accessToken = await jwtService.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      dbMock.mocks.findUser.mockResolvedValue(user);

      await expect(
        service.resetPassword({
          token: accessToken,
          newPassword: 'new-strong-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє некоректний рядок замість JWT', async () => {
      await expect(
        service.resetPassword({
          token: 'not-a-jwt',
          newPassword: 'new-strong-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('не ламає зміну пароля, якщо лист-підтвердження не надіслано', async () => {
      const warnSpy = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const user = makeUser();
      const token = await signResetToken(user.id, user.passwordHash);
      dbMock.mocks.findUser.mockResolvedValue(user);
      mailMock.sendPasswordChangedEmail.mockRejectedValue(
        new Error('SMTP timeout'),
      );

      await expect(
        service.resetPassword({ token, newPassword: 'new-strong-password' }),
      ).resolves.toBeUndefined();
      expect(dbMock.mocks.transaction).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('changePassword & emergencyLockPassword', () => {
    it('змінює пароль, видає нову пару токенів поточному пристрою і шле аварійне посилання', async () => {
      const user = makeUser();
      dbMock.mocks.findUser.mockResolvedValue(user);

      const tokens = await service.changePassword(
        user.id,
        {
          currentPassword: 'correct-password',
          newPassword: 'brand-new-password',
        },
        'Vitest',
        '127.0.0.1',
      );

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toHaveLength(128);
      expect(dbMock.mocks.transaction).toHaveBeenCalledTimes(1);
      expect(dbMock.mocks.insert).toHaveBeenCalledTimes(1);

      const updatedHash = (
        dbMock.mocks.set.mock.calls[0][0] as { passwordHash: string }
      ).passwordHash;
      expect(await argon2.verify(updatedHash, 'brand-new-password')).toBe(true);
      expect(dbMock.mocks.set.mock.calls[1][0]).toEqual({ isRevoked: true });

      expect(mailMock.sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
      const [to, emergencyLink] = mailMock.sendPasswordChangedEmail.mock
        .calls[0] as [string, string];
      expect(to).toBe(user.email);

      const parsed = new URL(emergencyLink);
      expect(`${parsed.origin}${parsed.pathname}`).toBe(
        'http://localhost:5173/emergency-password-lock',
      );
      const emergencyToken = parsed.searchParams.get('token')!;

      // Перевіряємо, що аварійне посилання справді спрацьовує, ставить випадковий пароль і видає 15-хв resetToken
      dbMock.mocks.findUser.mockResolvedValue(
        makeUser({ passwordHash: updatedHash }),
      );
      const { resetToken } =
        await service.emergencyLockPassword(emergencyToken);

      const lockedHash = (
        dbMock.mocks.set.mock.calls[2][0] as { passwordHash: string }
      ).passwordHash;
      expect(await argon2.verify(lockedHash, 'brand-new-password')).toBe(false);

      const resetPayload = await jwtService.verifyAsync<{
        sub: number;
        purpose: string;
      }>(resetToken, {
        secret: `${TEST_CONFIG.JWT_RESET_SECRET}:${lockedHash}`,
      });
      expect(resetPayload.sub).toBe(user.id);
      expect(resetPayload.purpose).toBe('password-reset');

      // Повторне використання того ж emergencyToken після блокування відхиляється
      dbMock.mocks.findUser.mockResolvedValue(
        makeUser({ passwordHash: lockedHash }),
      );
      await expect(
        service.emergencyLockPassword(emergencyToken),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє зміну пароля з 400 при невірному поточному паролі', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser());

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrong-password',
          newPassword: 'brand-new-password',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dbMock.mocks.transaction).not.toHaveBeenCalled();
    });

    it('відхиляє зміну пароля, якщо новий збігається з поточним', async () => {
      dbMock.mocks.findUser.mockResolvedValue(makeUser());

      await expect(
        service.changePassword(1, {
          currentPassword: 'correct-password',
          newPassword: 'correct-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestEmailChange, confirmEmailChange & revertEmailChange', () => {
    it('проходить повний цикл: запит → підтвердження → відкат (навіть якщо нападник змінив пароль)', async () => {
      const user = makeUser();
      // 1) Запит зміни пошти
      dbMock.mocks.findUser
        .mockResolvedValueOnce(user) // пошук поточного юзера
        .mockResolvedValueOnce(undefined); // перевірка зайнятості нового email

      await service.requestEmailChange(user.id, {
        newEmail: 'new-mail@uni.ua',
        currentPassword: 'correct-password',
      });

      expect(mailMock.sendConfirmEmailChangeEmail).toHaveBeenCalledTimes(1);
      const [confirmTo, confirmLink] = mailMock.sendConfirmEmailChangeEmail.mock
        .calls[0] as [string, string];
      expect(confirmTo).toBe('new-mail@uni.ua');
      const confirmToken = new URL(confirmLink).searchParams.get('token')!;

      // 2) Підтвердження нової пошти
      dbMock.mocks.findUser
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(undefined);

      await service.confirmEmailChange(confirmToken);

      expect(dbMock.mocks.set.mock.calls[0][0]).toMatchObject({
        email: 'new-mail@uni.ua',
      });
      expect(dbMock.mocks.set.mock.calls[1][0]).toEqual({ isRevoked: true });
      expect(mailMock.sendEmailChangedEmail).toHaveBeenCalledTimes(1);

      const [oldEmailTo, changedTo, revertLink] = mailMock.sendEmailChangedEmail
        .mock.calls[0] as [string, string, string];
      expect(oldEmailTo).toBe('student@uni.ua');
      expect(changedTo).toBe('new-mail@uni.ua');
      const revertToken = new URL(revertLink).searchParams.get('token')!;

      // 3) Відкат на стару пошту: навіть якщо нападник УЖЕ змінив passwordHash!
      dbMock.mocks.findUser
        .mockResolvedValueOnce(
          makeUser({
            email: 'new-mail@uni.ua',
            passwordHash: changedPasswordHash,
          }),
        )
        .mockResolvedValueOnce(undefined);

      const { resetToken } = await service.revertEmailChange(revertToken);

      const revertUpdate = dbMock.mocks.set.mock.calls[2][0] as {
        email: string;
        passwordHash: string;
      };
      expect(revertUpdate.email).toBe('student@uni.ua');
      expect(await argon2.verify(revertUpdate.passwordHash, 'already-changed')).toBe(
        false,
      );
      expect(mailMock.sendEmailChangeRevertedEmail).toHaveBeenCalledWith(
        'new-mail@uni.ua',
      );

      // Виданий resetToken валідний для нового випадкового хешу
      const resetPayload = await jwtService.verifyAsync<{
        sub: number;
        purpose: string;
      }>(resetToken, {
        secret: `${TEST_CONFIG.JWT_RESET_SECRET}:${revertUpdate.passwordHash}`,
      });
      expect(resetPayload.sub).toBe(user.id);
      expect(resetPayload.purpose).toBe('password-reset');

      // Повторний відкат тим самим токеном (коли пошта вже повернулась) відхиляється
      dbMock.mocks.findUser.mockResolvedValueOnce(
        makeUser({
          email: 'student@uni.ua',
          passwordHash: revertUpdate.passwordHash,
        }),
      );
      await expect(service.revertEmailChange(revertToken)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('відхиляє запит зміни пошти, якщо новий email уже зайнятий', async () => {
      dbMock.mocks.findUser
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(makeUser({ id: 2, email: 'taken@uni.ua' }));

      await expect(
        service.requestEmailChange(1, {
          newEmail: 'taken@uni.ua',
          currentPassword: 'correct-password',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mailMock.sendConfirmEmailChangeEmail).not.toHaveBeenCalled();
    });

    it('відхиляє запит зміни пошти при невірному паролі', async () => {
      dbMock.mocks.findUser.mockResolvedValueOnce(makeUser());

      await expect(
        service.requestEmailChange(1, {
          newEmail: 'new-mail@uni.ua',
          currentPassword: 'wrong-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє підтвердження, якщо email уже змінився раніше', async () => {
      const user = makeUser();
      dbMock.mocks.findUser
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(undefined);

      await service.requestEmailChange(user.id, {
        newEmail: 'new-mail@uni.ua',
        currentPassword: 'correct-password',
      });
      const confirmLink = mailMock.sendConfirmEmailChangeEmail.mock
        .calls[0][1] as string;
      const confirmToken = new URL(confirmLink).searchParams.get('token')!;

      dbMock.mocks.findUser.mockResolvedValueOnce(
        makeUser({ email: 'other@uni.ua' }),
      );

      await expect(service.confirmEmailChange(confirmToken)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refresh', () => {
    it('анулює всю сесію при виявленні повторного використання токена', async () => {
      dbMock.mocks.findRefreshToken.mockResolvedValue({
        id: 10,
        sessionId: 'session-123',
        isRevoked: true,
        replacedById: 11,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: makeUser(),
      });

      await expect(service.refresh('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(dbMock.mocks.update).toHaveBeenCalledTimes(1);
      expect(dbMock.mocks.set).toHaveBeenCalledWith({ isRevoked: true });
    });
  });
});
