import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import type { OrgScopeService } from './org-scope.service.js';
import { OrgHierarchyRulesService } from './org-hierarchy-rules.service.js';
import type { AdminActor } from './org-units.types.js';

function createDbMock() {
  const selectResults: unknown[] = [];
  const enqueueSelect = (...items: unknown[]) => {
    selectResults.push(...items);
  };

  const select = vi.fn(() => {
    const nextResult = () => Promise.resolve(selectResults.shift() ?? []);
    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn(() => builder),
      then: (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => nextResult().then(onFulfilled, onRejected),
    };
    return builder;
  });

  const insertValues = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { where: deleteWhere });
  });

  const tx = { insert, delete: del };
  const transaction = vi.fn(
    async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
  );

  return {
    db: {
      select,
      insert,
      delete: del,
      transaction,
    } as unknown as DrizzleDB,
    mocks: {
      enqueueSelect,
      insert,
      insertValues,
      delete: del,
      deleteWhere,
      transaction,
    },
  };
}

describe('OrgHierarchyRulesService', () => {
  const superAdmin: AdminActor = {
    userId: 1,
    isSuperAdmin: true,
    orgUnitId: null,
  };
  const localAdmin: AdminActor = {
    userId: 2,
    isSuperAdmin: false,
    orgUnitId: 10,
  };

  let dbMock: ReturnType<typeof createDbMock>;
  let scopeMock: {
    getAdminActor: ReturnType<typeof vi.fn>;
    assertSuperAdmin: ReturnType<typeof vi.fn>;
  };
  let service: OrgHierarchyRulesService;

  beforeEach(() => {
    dbMock = createDbMock();
    scopeMock = {
      getAdminActor: vi.fn().mockResolvedValue(superAdmin),
      assertSuperAdmin: vi.fn((a: AdminActor, msg?: string) => {
        if (!a.isSuperAdmin) {
          throw new ForbiddenException(msg ?? 'Forbidden');
        }
      }),
    };
    service = new OrgHierarchyRulesService(
      dbMock.db,
      scopeMock as unknown as OrgScopeService,
    );
  });

  it('забороняє локальному адміну змінювати глобальні правила', async () => {
    scopeMock.getAdminActor.mockResolvedValue(localAdmin);

    await expect(service.replaceAll(2, { rules: [] })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('відхиляє заміну правил з 409, якщо наявна активна одиниця стане невалідною', async () => {
    dbMock.mocks.enqueueSelect([
      {
        id: 1,
        parentId: null,
        unitType: 'university',
        name: 'КНУ',
        isActive: true,
      },
      {
        id: 2,
        parentId: 1,
        unitType: 'faculty',
        name: 'ФІТ',
        isActive: true,
      },
    ]);

    await expect(
      service.replaceAll(1, {
        rules: [{ childType: 'university', parentType: null }],
      }),
    ).rejects.toThrow(ConflictException);
    expect(dbMock.mocks.transaction).not.toHaveBeenCalled();
  });

  it('дедуплікує правила, очищує застарілі локальні обмеження й зберігає новий набір', async () => {
    dbMock.mocks.enqueueSelect(
      [
        {
          id: 1,
          parentId: null,
          unitType: 'university',
          name: 'КНУ',
          isActive: true,
        },
      ], // allUnits
      [{ orgUnitId: 1, childType: 'faculty' }], // stale local rule
      [{ id: 10, childType: 'university', parentType: null }], // getAll() після збереження
    );

    const result = await service.replaceAll(1, {
      rules: [
        { childType: 'university', parentType: null },
        { childType: 'university', parentType: null }, // дублікат із null
      ],
    });

    expect(dbMock.mocks.transaction).toHaveBeenCalledTimes(1);
    expect(dbMock.mocks.deleteWhere).toHaveBeenCalledTimes(1);
    expect(dbMock.mocks.insertValues).toHaveBeenCalledWith([
      { childType: 'university', parentType: null },
    ]);
    expect(result).toEqual([
      { id: 10, childType: 'university', parentType: null },
    ]);
  });
});
