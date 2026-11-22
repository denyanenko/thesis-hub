import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import { OrgScopeService } from './org-scope.service.js';

function createDbMock() {
  const findAdmin = vi.fn();
  const execute = vi.fn();

  return {
    db: {
      query: {
        admins: { findFirst: findAdmin },
      },
      execute,
    } as unknown as DrizzleDB,
    mocks: { findAdmin, execute },
  };
}

describe('OrgScopeService', () => {
  let service: OrgScopeService;
  let dbMock: ReturnType<typeof createDbMock>;

  beforeEach(() => {
    dbMock = createDbMock();
    service = new OrgScopeService(dbMock.db);
  });

  it('визначає суперадміна, коли admins.orgUnitId === null', async () => {
    dbMock.mocks.findAdmin.mockResolvedValue({ userId: 1, orgUnitId: null });

    const actor = await service.getAdminActor(1);
    expect(actor).toEqual({
      userId: 1,
      isSuperAdmin: true,
      orgUnitId: null,
    });
  });

  it('викидає ForbiddenException, якщо профілю адміністратора немає', async () => {
    dbMock.mocks.findAdmin.mockResolvedValue(undefined);

    await expect(service.getAdminActor(99)).rejects.toThrow(ForbiddenException);
  });

  it('суперадмін має доступ до будь-якої одиниці без запиту предків', async () => {
    const allowed = await service.isUnitInScope(
      { userId: 1, isSuperAdmin: true, orgUnitId: null },
      42,
      { includeSelf: false },
    );
    expect(allowed).toBe(true);
    expect(dbMock.mocks.execute).not.toHaveBeenCalled();
  });

  it('локальний адмін може редагувати власну одиницю (includeSelf: true), але не керувати нею (includeSelf: false)', async () => {
    const actor = { userId: 2, isSuperAdmin: false, orgUnitId: 10 };

    dbMock.mocks.execute.mockResolvedValue({ rows: [{ id: '10' }, { id: '1' }] });
    expect(
      await service.isUnitInScope(actor, 10, { includeSelf: true }),
    ).toBe(true);

    expect(
      await service.isUnitInScope(actor, 10, { includeSelf: false }),
    ).toBe(false);
  });

  it('локальний адмін має доступ до нащадків і не має доступу до сусідніх гілок', async () => {
    const actor = { userId: 2, isSuperAdmin: false, orgUnitId: 10 };

    dbMock.mocks.execute.mockResolvedValueOnce({
      rows: [{ id: '25' }, { id: '10' }, { id: '1' }],
    });
    expect(
      await service.isUnitInScope(actor, 25, { includeSelf: false }),
    ).toBe(true);

    dbMock.mocks.execute.mockResolvedValueOnce({
      rows: [{ id: '30' }, { id: '20' }, { id: '1' }],
    });
    expect(
      await service.isUnitInScope(actor, 30, { includeSelf: true }),
    ).toBe(false);
  });
});
