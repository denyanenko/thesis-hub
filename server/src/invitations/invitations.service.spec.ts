import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthService } from '../auth/auth.service.js';
import type { AppConfigService } from '../config/app-config.service.js';
import type { DrizzleDB } from '../database/database.module.js';
import type { MailService } from '../mail/mail.service.js';
import type { OrgScopeService } from '../org-units/org-scope.service.js';
import type { AdminActor } from '../org-units/org-units.types.js';
import { InvitationSpreadsheetService } from './invitation-spreadsheet.service.js';
import { InvitationsService } from './invitations.service.js';
import { SUPERADMIN_OPTION_LABEL } from './invitations.types.js';

function makeSelectChain<T>(rows: T[]) {
  const promise = Promise.resolve(rows);
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

describe('InvitationsService', () => {
  const jwtService = new JwtService({ secret: 'access-secret' });

  const configMock = {
    get: vi.fn((key: string) => {
      switch (key) {
        case 'JWT_INVITE_SECRET':
          return 'invite-secret-test';
        case 'JWT_RESET_SECRET':
          return 'reset-secret-test';
        case 'INVITATION_EXPIRES_IN':
          return '7d';
        case 'FRONTEND_URL':
          return 'http://localhost:5173';
        default:
          return undefined;
      }
    }),
  } as unknown as AppConfigService;

  let mailMock: { sendUserInvitationEmail: ReturnType<typeof vi.fn> };
  let orgScopeMock: {
    getAdminActor: ReturnType<typeof vi.fn>;
    getSubtreeNodes: ReturnType<typeof vi.fn>;
    assertUnitInScope: ReturnType<typeof vi.fn>;
  };
  let authMock: { issueSessionTokens: ReturnType<typeof vi.fn> };

  const sampleUnits = [
    {
      id: 1,
      parentId: null,
      unitType: 'university' as const,
      name: 'КПІ ім. Ігоря Сікорського',
      shortName: 'КПІ',
      isActive: true,
    },
    {
      id: 10,
      parentId: 1,
      unitType: 'faculty' as const,
      name: 'Факультет інформатики та обчислювальної техніки',
      shortName: 'ФІОТ',
      isActive: true,
    },
    {
      id: 42,
      parentId: 10,
      unitType: 'department' as const,
      name: 'Кафедра інформатики та програмної інженерії',
      shortName: 'ІПІ',
      isActive: true,
    },
    {
      id: 99,
      parentId: 1,
      unitType: 'department' as const,
      name: 'Інша кафедра',
      shortName: 'ІК',
      isActive: true,
    },
  ];

  const samplePrograms = [
    {
      id: 5,
      name: 'Інженерія програмного забезпечення',
      degreeLevel: 'bachelor' as const,
      specialtyId: 1,
      orgUnitId: 42,
    },
    {
      id: 6,
      name: 'Інша програма',
      degreeLevel: 'master' as const,
      specialtyId: 1,
      orgUnitId: 99,
    },
  ];

  const sampleSpecialties = [
    { id: 1, code: 'F2', name: 'Інженерія програмного забезпечення' },
  ];

  const sampleGroups = [
    {
      id: 15,
      name: 'ІП-21',
      enrollmentYear: 2022,
      educationalProgramId: 5,
      isActive: true,
    },
    {
      id: 16,
      name: 'ІК-21',
      enrollmentYear: 2022,
      educationalProgramId: 6,
      isActive: true,
    },
  ];

  beforeEach(() => {
    mailMock = {
      sendUserInvitationEmail: vi.fn().mockResolvedValue(undefined),
    };
    orgScopeMock = {
      getAdminActor: vi.fn(),
      getSubtreeNodes: vi.fn(),
      assertUnitInScope: vi.fn().mockResolvedValue(undefined),
    };
    authMock = {
      issueSessionTokens: vi.fn().mockResolvedValue({
        accessToken: 'acc-token',
        refreshToken: 'ref-token',
      }),
    };
  });

  function createService(db: unknown) {
    return new InvitationsService(
      db as DrizzleDB,
      jwtService,
      configMock,
      mailMock as unknown as MailService,
      orgScopeMock as unknown as OrgScopeService,
      authMock as unknown as AuthService,
      new InvitationSpreadsheetService(),
    );
  }

  describe('previewBulk (валідація рядків, колізії та OrgScope)', () => {
    it('перевіряє студентів: виявляє дублікати в пакеті, існуючих юзерів, активні запрошення та групи поза scope', async () => {
      const localAdmin: AdminActor = {
        userId: 2,
        isSuperAdmin: false,
        orgUnitId: 10,
      };
      orgScopeMock.getAdminActor.mockResolvedValue(localAdmin);
      orgScopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 42, isActive: true, depth: 1 },
      ]);

      const selectQueue = [
        // loadCatalogForActor (4 queries)
        sampleUnits,
        samplePrograms,
        sampleSpecialties,
        sampleGroups,
        // validateRows (4 queries)
        [{ email: 'exists@kpi.ua' }],
        [
          {
            email: 'invited@kpi.ua',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          },
          {
            email: 'expired@kpi.ua',
            expiresAt: new Date(Date.now() - 3600_000).toISOString(),
          },
        ],
        [{ studentNumber: 'КВ00000001' }],
        [],
      ];

      const dbMock = {
        select: vi.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      };

      const service = createService(dbMock);
      const result = await service.previewBulk(2, {
        role: 'student',
        rows: [
          {
            rowNumber: 2,
            email: 'expired@kpi.ua', // прострочене запрошення НЕ блокує
            lastName: 'Коваль',
            firstName: 'Андрій',
            studentNumber: 'КВ11111111',
            groupRef: 'ІП-21',
          },
          {
            rowNumber: 3,
            email: 'exists@kpi.ua',
            lastName: 'Мельник',
            firstName: 'Ірина',
            studentNumber: 'КВ00000001',
            groupId: 15,
          },
          {
            rowNumber: 4,
            email: 'invited@kpi.ua',
            lastName: 'Бондар',
            firstName: 'Петро',
            studentNumber: 'КВ22222222',
            groupId: 16, // поза scope локального адміна ФІОТ!
          },
          {
            rowNumber: 5,
            email: 'dup@kpi.ua',
            lastName: 'Шевченко',
            firstName: 'Тарас',
            studentNumber: 'КВ33333333',
            groupId: 15,
          },
          {
            rowNumber: 6,
            email: 'DUP@kpi.ua',
            lastName: 'Шевченко',
            firstName: 'Марія',
            studentNumber: 'КВ44444444',
            groupId: 15,
          },
        ],
      });

      expect(result.totalCount).toBe(5);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(4);

      expect(result.rows[0].isValid).toBe(true);
      expect(result.rows[0].groupId).toBe(15);

      expect(result.rows[1].isValid).toBe(false);
      expect(result.rows[1].errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('електронною поштою вже існує'),
          expect.stringContaining('номером квитка вже існує'),
        ]),
      );

      expect(result.rows[2].isValid).toBe(false);
      expect(result.rows[2].errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('активне запрошення'),
          expect.stringContaining('у межах ваших прав'),
        ]),
      );

      expect(result.rows[3].errors).toContain(
        'Дублікат електронної пошти всередині списку',
      );
      expect(result.rows[4].errors).toContain(
        'Дублікат електронної пошти всередині списку',
      );
    });

    it('дозволяє локальному адміну запрошувати адміна свого підрозділу, але забороняє запрошувати головного адміна', async () => {
      const localAdmin: AdminActor = {
        userId: 2,
        isSuperAdmin: false,
        orgUnitId: 10,
      };
      orgScopeMock.getAdminActor.mockResolvedValue(localAdmin);
      orgScopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 42, isActive: true, depth: 1 },
      ]);

      const selectQueue = [
        sampleUnits,
        samplePrograms,
        sampleSpecialties,
        sampleGroups,
        [],
        [],
      ];

      const dbMock = {
        select: vi.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      };

      const service = createService(dbMock);
      const result = await service.previewBulk(2, {
        role: 'admin',
        rows: [
          {
            rowNumber: 1,
            email: 'faculty.admin@kpi.ua',
            lastName: 'Савченко',
            firstName: 'Ольга',
            orgUnitId: 10, // власний підрозділ локального адміна — дозволено!
            position: 'Заступник декана',
          },
          {
            rowNumber: 2,
            email: 'super.attempt@kpi.ua',
            lastName: 'Ткаченко',
            firstName: 'Максим',
            orgUnitRef: SUPERADMIN_OPTION_LABEL, // заборонено локальному адміну!
          },
        ],
      });

      expect(result.rows[0].isValid).toBe(true);
      expect(result.rows[0].orgUnitId).toBe(10);

      expect(result.rows[1].isValid).toBe(false);
      expect(result.rows[1].errors[0]).toContain('головний адміністратор');
    });
  });

  describe('verifyInvitation та acceptInvitation', () => {
    it('відхиляє відкликане, вже прийняте, застаріле та прострочене запрошення', async () => {
      const token = await jwtService.signAsync(
        { sub: 50, jti: 'jti-1', purpose: 'user-invitation' },
        { secret: 'invite-secret-test', expiresIn: '7d' },
      );
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const baseRow = {
        id: 50,
        email: 'user@kpi.ua',
        role: 'student' as const,
        firstName: 'Іван',
        lastName: 'Іваненко',
        patronymic: null,
        studentNumber: 'КВ1234',
        groupId: 15,
        orgUnitId: null,
        position: null,
        academicDegree: null,
        academicTitle: null,
        tokenHash,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        invitedByUserId: 1,
        acceptedAt: null,
        acceptedUserId: null,
        revokedAt: null,
        emailStatus: 'sent' as const,
        emailError: null,
        emailSentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Відкликане
      const serviceRevoked = createService({
        select: vi.fn(() =>
          makeSelectChain([{ ...baseRow, revokedAt: new Date().toISOString() }]),
        ),
      });
      await expect(
        serviceRevoked.verifyInvitation(token),
      ).rejects.toThrow(BadRequestException);

      // Уже прийняте
      const serviceAccepted = createService({
        select: vi.fn(() =>
          makeSelectChain([
            {
              ...baseRow,
              acceptedAt: new Date().toISOString(),
              acceptedUserId: 77,
            },
          ]),
        ),
      });
      await expect(
        serviceAccepted.verifyInvitation(token),
      ).rejects.toThrow(BadRequestException);

      // Застарілий хеш (після повторної відправки)
      const serviceStale = createService({
        select: vi.fn(() =>
          makeSelectChain([{ ...baseRow, tokenHash: '0'.repeat(64) }]),
        ),
      });
      await expect(serviceStale.verifyInvitation(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('створює користувача та профіль студента при acceptInvitation і повертає токени сесії', async () => {
      const token = await jwtService.signAsync(
        { sub: 77, jti: 'jti-accept', purpose: 'user-invitation' },
        { secret: 'invite-secret-test', expiresIn: '7d' },
      );
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const futureIso = new Date(Date.now() + 86_400_000).toISOString();

      const invRow = {
        id: 77,
        email: 'new.student@lll.kpi.ua',
        role: 'student' as const,
        firstName: 'Марія',
        lastName: 'Лисенко',
        patronymic: 'Олегівна',
        studentNumber: 'КВ99887766',
        groupId: 15,
        orgUnitId: null,
        position: null,
        academicDegree: null,
        academicTitle: null,
        tokenHash,
        expiresAt: futureIso,
        invitedByUserId: 1,
        acceptedAt: null,
        acceptedUserId: null,
        revokedAt: null,
        emailStatus: 'sent' as const,
        emailError: null,
        emailSentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const txSelectQueue = [
        [{ id: 15, isActive: true }], // перевірка активності групи
        [], // перевірка унікальності email
      ];

      const insertedValues: unknown[] = [];
      const txMock = {
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 77,
              accepted_at: null,
              revoked_at: null,
              expires_at: futureIso,
              token_hash: tokenHash,
            },
          ],
        }),
        select: vi.fn(() => makeSelectChain(txSelectQueue.shift() ?? [])),
        insert: vi.fn(() => ({
          values: vi.fn((vals: unknown) => {
            insertedValues.push(vals);
            return {
              returning: vi.fn().mockResolvedValue([
                {
                  id: 501,
                  email: 'new.student@lll.kpi.ua',
                  role: 'student',
                },
              ]),
            };
          }),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(undefined),
          })),
        })),
      };

      const dbMock = {
        select: vi.fn(() => makeSelectChain([invRow])),
        transaction: vi.fn(
          async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock),
        ),
      };

      const service = createService(dbMock);
      const res = await service.acceptInvitation(
        { token, password: 'StrongPassword123' },
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(res.user).toEqual({
        sub: 501,
        email: 'new.student@lll.kpi.ua',
        role: 'student',
      });
      expect(res.tokens).toEqual({
        accessToken: 'acc-token',
        refreshToken: 'ref-token',
      });
      expect(authMock.issueSessionTokens).toHaveBeenCalledWith(
        { sub: 501, email: 'new.student@lll.kpi.ua', role: 'student' },
        'Mozilla/5.0',
        '127.0.0.1',
      );
      // Перевіряємо, що було 2 вставки: users і students
      expect(insertedValues).toHaveLength(2);
      expect(insertedValues[1]).toEqual({
        userId: 501,
        studentNumber: 'КВ99887766',
        groupId: 15,
      });
    });

    it('викидає ConflictException при спробі створити одиночне запрошення з вже зайнятим email', async () => {
      const superAdmin: AdminActor = {
        userId: 1,
        isSuperAdmin: true,
        orgUnitId: null,
      };
      orgScopeMock.getAdminActor.mockResolvedValue(superAdmin);

      const selectQueue = [
        sampleUnits,
        samplePrograms,
        sampleSpecialties,
        sampleGroups,
        [{ email: 'taken@kpi.ua' }],
        [],
      ];
      const dbMock = {
        select: vi.fn(() => makeSelectChain(selectQueue.shift() ?? [])),
      };

      const service = createService(dbMock);
      await expect(
        service.create(1, {
          role: 'supervisor',
          email: 'taken@kpi.ua',
          lastName: 'Кравченко',
          firstName: 'Дмитро',
          orgUnitId: 42,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('забороняє revoke запрошення, що належить іншому підрозділу', async () => {
      const localAdmin: AdminActor = {
        userId: 2,
        isSuperAdmin: false,
        orgUnitId: 10,
      };
      orgScopeMock.getAdminActor.mockResolvedValue(localAdmin);
      orgScopeMock.assertUnitInScope.mockRejectedValue(
        new ForbiddenException('Недостатньо прав'),
      );

      const dbMock = {
        select: vi.fn(() =>
          makeSelectChain([
            {
              id: 88,
              role: 'supervisor',
              orgUnitId: 99,
              groupId: null,
              invitedByUserId: 1,
              acceptedAt: null,
              revokedAt: null,
            },
          ]),
        ),
      };

      const service = createService(dbMock);
      await expect(service.revoke(2, 88)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
