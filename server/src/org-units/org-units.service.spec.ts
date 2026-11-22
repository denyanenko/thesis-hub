import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import type { OrgScopeService } from './org-scope.service.js';
import { OrgUnitsService } from './org-units.service.js';
import type { AdminActor, OrgUnitType } from './org-units.types.js';

function makeUnit(
  overrides: Partial<{
    id: number;
    parentId: number | null;
    unitType: OrgUnitType;
    name: string;
    shortName: string | null;
    isActive: boolean;
  }> = {},
) {
  return {
    id: 10,
    parentId: 1,
    unitType: 'faculty' as OrgUnitType,
    name: 'Факультет інформатики',
    shortName: 'ФІ',
    isActive: true,
    ...overrides,
  };
}

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
      groupBy: vi.fn(() => builder),
      then: (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => nextResult().then(onFulfilled, onRejected),
    };
    return builder;
  });

  const insertReturning = vi.fn().mockResolvedValue([makeUnit({ id: 55 })]);
  const insertValues = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: insertReturning });
  });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const updateReturning = vi.fn().mockResolvedValue([makeUnit()]);
  const updateWhere = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: updateReturning });
  });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: deleteWhere });

  const findUnit = vi.fn();

  const tx = { insert, update, delete: del };
  const transaction = vi.fn(
    async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
  );

  return {
    db: {
      query: {
        orgUnits: { findFirst: findUnit },
      },
      select,
      insert,
      update,
      delete: del,
      transaction,
    } as unknown as DrizzleDB,
    mocks: {
      enqueueSelect,
      findUnit,
      insert,
      insertValues,
      insertReturning,
      update,
      updateSet,
      updateWhere,
      updateReturning,
      delete: del,
      deleteWhere,
      transaction,
    },
  };
}

function createScopeMock(actor: AdminActor) {
  return {
    getAdminActor: vi.fn().mockResolvedValue(actor),
    assertSuperAdmin: vi.fn((a: AdminActor, msg?: string) => {
      if (!a.isSuperAdmin) {
        throw new ForbiddenException(msg ?? 'Only superadmin');
      }
    }),
    assertUnitInScope: vi.fn().mockResolvedValue(undefined),
    getSubtreeNodes: vi.fn().mockResolvedValue([]),
    getVisibleIdsForAdmin: vi.fn(),
  };
}

describe('OrgUnitsService', () => {
  const superAdmin: AdminActor = {
    userId: 1,
    isSuperAdmin: true,
    orgUnitId: null,
  };
  const facultyAdmin: AdminActor = {
    userId: 2,
    isSuperAdmin: false,
    orgUnitId: 10,
  };

  let dbMock: ReturnType<typeof createDbMock>;
  let scopeMock: ReturnType<typeof createScopeMock>;
  let service: OrgUnitsService;

  beforeEach(() => {
    dbMock = createDbMock();
    scopeMock = createScopeMock(superAdmin);
    service = new OrgUnitsService(
      dbMock.db,
      scopeMock as unknown as OrgScopeService,
    );
  });

  describe('create', () => {
    it('забороняє локальному адміну створювати кореневу одиницю', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);

      await expect(
        service.create(2, {
          parentId: null,
          unitType: 'university',
          name: 'Університет',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('відхиляє створення, якщо глобальне правило не дозволяє такий тип під батьком', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(
        makeUnit({ id: 1, unitType: 'university' }),
      );
      dbMock.mocks.enqueueSelect([]); // немає відповідного глобального правила

      await expect(
        service.create(1, {
          parentId: 1,
          unitType: 'department',
          name: 'Кафедра напряму в університеті',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dbMock.mocks.insert).not.toHaveBeenCalled();
    });

    it('відхиляє створення, якщо локальне обмеження батька забороняє цей тип', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(
        makeUnit({ id: 1, unitType: 'university' }),
      );
      dbMock.mocks.enqueueSelect(
        [{ id: 1 }], // глобальне правило дозволяє faculty під university
        [{ childType: 'institute' }], // але локально цьому університету дозволені тільки institute
      );

      await expect(
        service.create(1, {
          parentId: 1,
          unitType: 'faculty',
          name: 'Факультет',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(dbMock.mocks.insert).not.toHaveBeenCalled();
    });

    it('успішно створює одиницю, коли правила дозволяють', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(
        makeUnit({ id: 1, unitType: 'university' }),
      );
      dbMock.mocks.enqueueSelect(
        [{ id: 1 }], // глобальне правило
        [], // немає локальних обмежень -> успадковує глобальні
      );
      const created = makeUnit({ id: 55, parentId: 1, unitType: 'faculty' });
      dbMock.mocks.insertReturning.mockResolvedValue([created]);

      const result = await service.create(1, {
        parentId: 1,
        unitType: 'faculty',
        name: 'Факультет інформатики',
        shortName: 'ФІ',
      });

      expect(result).toEqual(created);
      expect(dbMock.mocks.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('move', () => {
    it('відхиляє переміщення підрозділу всередину власного піддерева (захист від циклу)', async () => {
      dbMock.mocks.findUnit
        .mockResolvedValueOnce(makeUnit({ id: 10, parentId: 1 }))
        .mockResolvedValueOnce(
          makeUnit({ id: 25, parentId: 10, unitType: 'faculty' }),
        );
      scopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 25, isActive: true, depth: 1 },
      ]);

      await expect(service.move(1, 10, { parentId: 25 })).rejects.toThrow(
        BadRequestException,
      );
      expect(dbMock.mocks.update).not.toHaveBeenCalled();
    });

    it('забороняє локальному адміну переміщувати одиницю на кореневий рівень', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);
      dbMock.mocks.findUnit.mockResolvedValueOnce(
        makeUnit({ id: 15, parentId: 10, unitType: 'institute' }),
      );

      await expect(service.move(2, 15, { parentId: null })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deactivate', () => {
    it('відхиляє деактивацію без cascade, якщо є активні діти', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(makeUnit({ id: 10 }));
      scopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 20, isActive: true, depth: 1 },
      ]);

      await expect(
        service.deactivate(1, 10, { cascade: false }),
      ).rejects.toThrow(ConflictException);
      expect(dbMock.mocks.transaction).not.toHaveBeenCalled();
    });

    it('при cascade: true деактивує піддерево знизу вгору в одній транзакції', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(makeUnit({ id: 10 }));
      scopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 20, isActive: true, depth: 1 },
        { id: 30, isActive: true, depth: 2 },
        { id: 31, isActive: false, depth: 2 }, // вже неактивна — пропускається
      ]);

      const res = await service.deactivate(1, 10, { cascade: true });

      expect(res.deactivatedIds).toEqual([30, 20, 10]);
      expect(dbMock.mocks.transaction).toHaveBeenCalledTimes(1);
      expect(dbMock.mocks.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('remove', () => {
    it('відхиляє фізичне видалення непорожньої одиниці з 409', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(makeUnit({ id: 10 }));
      dbMock.mocks.enqueueSelect(
        [{ total: 0 }], // children
        [{ total: 2 }], // programs
        [{ total: 0 }], // supervisors
        [{ total: 0 }], // admins
      );

      await expect(service.remove(1, 10)).rejects.toThrow(ConflictException);
      expect(dbMock.mocks.delete).not.toHaveBeenCalled();
    });

    it('видаляє порожню одиницю', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(makeUnit({ id: 10 }));
      dbMock.mocks.enqueueSelect(
        [{ total: 0 }],
        [{ total: 0 }],
        [{ total: 0 }],
        [{ total: 0 }],
      );

      await expect(service.remove(1, 10)).resolves.toBeUndefined();
      expect(dbMock.mocks.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('setAllowedChildren', () => {
    it('відхиляє локальне обмеження, якщо вже є активні діти виключеного типу', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(
        makeUnit({ id: 1, unitType: 'university' }),
      );
      dbMock.mocks.enqueueSelect(
        [{ childType: 'institute' }, { childType: 'faculty' }], // глобально дозволені
        [{ id: 10, name: 'ФІ', unitType: 'faculty' }], // активні діти
      );

      await expect(
        service.setAllowedChildren(1, 1, { childTypes: ['institute'] }),
      ).rejects.toThrow(ConflictException);
      expect(dbMock.mocks.transaction).not.toHaveBeenCalled();
    });

    it('скидає локальні обмеження при childTypes: null', async () => {
      dbMock.mocks.findUnit.mockResolvedValue(
        makeUnit({ id: 1, unitType: 'university' }),
      );

      const res = await service.setAllowedChildren(1, 1, { childTypes: null });

      expect(res).toEqual({ allowedChildTypes: null });
      expect(dbMock.mocks.delete).toHaveBeenCalledTimes(1);
      expect(dbMock.mocks.insert).not.toHaveBeenCalled();
    });
  });
});
