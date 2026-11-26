import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import type { OrgScopeService } from '../org-units/org-scope.service.js';
import type { AdminActor } from '../org-units/org-units.types.js';
import { SpecialtiesService } from './specialties.service.js';

function makeSpecialty(
  overrides: Partial<{
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    replacedById: number | null;
    createdAt: string;
    updatedAt: string;
    deactivatedAt: string | null;
    deactivationReason: string | null;
  }> = {},
) {
  return {
    id: 1,
    code: '126',
    name: 'Інформаційні системи та технології',
    isActive: true,
    replacedById: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    deactivatedAt: null,
    deactivationReason: null,
    ...overrides,
  };
}

function createDbMock() {
  const selectResults: unknown[] = [];
  const selectWhereCalls: unknown[][] = [];
  const enqueueSelect = (...items: unknown[]) => {
    selectResults.push(...items);
  };

  const select = vi.fn(() => {
    const result = selectResults.shift() ?? [];
    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn((...args: unknown[]) => {
        selectWhereCalls.push(args);
        return builder;
      }),
      groupBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      then: (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(onFulfilled, onRejected),
    };
    return builder;
  });

  const insertReturning = vi.fn().mockResolvedValue([makeSpecialty({ id: 50, code: 'F6' })]);
  const insertValues = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: insertReturning });
  });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const updateReturning = vi.fn().mockResolvedValue([makeSpecialty()]);
  const updateWhere = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: updateReturning });
  });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: deleteWhere });

  const findSpecialty = vi.fn();

  const tx = { select, insert, update, delete: del };
  const transaction = vi.fn(
    async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
  );

  return {
    db: {
      query: {
        specialties: { findFirst: findSpecialty },
      },
      select,
      insert,
      update,
      delete: del,
      transaction,
    } as unknown as DrizzleDB,
    mocks: {
      enqueueSelect,
      selectWhereCalls,
      findSpecialty,
      select,
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
    getSubtreeNodes: vi.fn().mockResolvedValue([
      { id: 10, isActive: true, depth: 0 },
      { id: 101, isActive: true, depth: 1 },
    ]),
    assertSuperAdmin: vi.fn((a: AdminActor, msg?: string) => {
      if (!a.isSuperAdmin) {
        throw new ForbiddenException(msg ?? 'Only superadmin');
      }
    }),
  };
}

describe('SpecialtiesService', () => {
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
  let service: SpecialtiesService;

  beforeEach(() => {
    dbMock = createDbMock();
    scopeMock = createScopeMock(superAdmin);
    service = new SpecialtiesService(
      dbMock.db,
      scopeMock as unknown as OrgScopeService,
    );
  });

  describe('findAll', () => {
    it('будує ланцюжок замін A → B → C, природне сортування та права canDelete', async () => {
      const sOldest = makeSpecialty({
        id: 1,
        code: '6.050101',
        name: 'Компʼютерні науки (архів)',
        isActive: false,
        replacedById: 2,
        deactivatedAt: '2016-01-01T00:00:00.000Z',
      });
      const sMiddle = makeSpecialty({
        id: 2,
        code: '122',
        name: 'Компʼютерні науки (2015)',
        isActive: false,
        replacedById: 3,
        deactivatedAt: '2025-01-01T00:00:00.000Z',
      });
      const sCurrent = makeSpecialty({
        id: 3,
        code: 'F3',
        name: 'Компʼютерні науки',
        isActive: true,
      });
      const sG10 = makeSpecialty({ id: 4, code: 'G10', name: 'Металургія' });
      const sG2 = makeSpecialty({
        id: 5,
        code: 'G2',
        name: 'Технології захисту навколишнього середовища',
      });

      dbMock.mocks.enqueueSelect(
        [sG10, sCurrent, sOldest, sG2, sMiddle],
        [{ specialtyId: 2, total: 3, active: 1 }],
      );

      const res = await service.findAll(1, true);

      expect(scopeMock.getSubtreeNodes).not.toHaveBeenCalled();
      expect(dbMock.mocks.selectWhereCalls).toHaveLength(0);
      expect(res.specialties.map((s) => s.code)).toEqual([
        '6.050101',
        '122',
        'F3',
        'G2',
        'G10',
      ]);

      const oldest = res.specialties.find((s) => s.id === 1)!;
      expect(oldest.replacedBy?.code).toBe('122');
      expect(oldest.currentReplacement?.code).toBe('F3');
      expect(oldest.canDelete).toBe(true);

      const middle = res.specialties.find((s) => s.id === 2)!;
      expect(middle.counts).toEqual({
        programs: 3,
        activePrograms: 1,
        predecessors: 1,
      });
      expect(middle.canDelete).toBe(false);

      const current = res.specialties.find((s) => s.id === 3)!;
      expect(current.replacedFrom.map((r) => r.code)).toEqual(['122']);
      expect(current.canDelete).toBe(false);
    });

    it('для локального адміна рахує ОП лише в межах його піддерева та повертає canDelete = false', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);
      const oldSpec = makeSpecialty({
        id: 1,
        code: '126',
        isActive: false,
        replacedById: 2,
      });
      const newSpec = makeSpecialty({ id: 2, code: 'F6', isActive: true });

      dbMock.mocks.enqueueSelect(
        [oldSpec, newSpec],
        [{ specialtyId: 2, total: 2, active: 1 }],
      );

      const res = await service.findAll(2, false);

      expect(scopeMock.getSubtreeNodes).toHaveBeenCalledWith(10);
      expect(dbMock.mocks.selectWhereCalls).toHaveLength(1);
      expect(res.actor.isSuperAdmin).toBe(false);
      expect(res.specialties).toHaveLength(1);
      expect(res.specialties[0].code).toBe('F6');
      expect(res.specialties[0].counts).toEqual({
        programs: 2,
        activePrograms: 1,
        predecessors: 1,
      });
      expect(res.specialties[0].replacedFrom.map((r) => r.code)).toEqual(['126']);
      expect(res.specialties[0].canDelete).toBe(false);
    });
  });

  describe('create', () => {
    it('забороняє локальному адміну створювати спеціальність', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);

      await expect(
        service.create(2, { code: 'F6', name: 'Інформаційні системи і технології' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('перетворює PG 23505 на ConflictException', async () => {
      dbMock.mocks.insertReturning.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.create(1, { code: 'F6', name: 'Інформаційні системи і технології' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('кидає NotFoundException, якщо спеціальність не існує', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(undefined);

      await expect(service.update(1, 999, { name: 'Нова назва' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('не робить зайвого UPDATE, якщо значення не змінилися', async () => {
      const existing = makeSpecialty({ code: 'F6', name: 'ІСТ' });
      dbMock.mocks.findSpecialty.mockResolvedValue(existing);

      const res = await service.update(1, 1, { code: 'F6', name: 'ІСТ' });

      expect(res).toEqual(existing);
      expect(dbMock.mocks.update).not.toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('забороняє активувати спеціальність, у якої вже є правонаступник', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(
        makeSpecialty({
          id: 1,
          code: '126',
          isActive: false,
          replacedById: 2,
        }),
      );

      await expect(service.activate(1, 1)).rejects.toThrow(ConflictException);
    });

    it('дозволяє активувати деактивовану спеціальність без правонаступника', async () => {
      const inactive = makeSpecialty({
        id: 1,
        code: '126',
        isActive: false,
        replacedById: null,
      });
      const reactivated = makeSpecialty({ id: 1, code: '126', isActive: true });
      dbMock.mocks.findSpecialty.mockResolvedValue(inactive);
      dbMock.mocks.updateReturning.mockResolvedValueOnce([reactivated]);

      const res = await service.activate(1, 1);

      expect(res.isActive).toBe(true);
      expect(dbMock.mocks.updateSet).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('replace', () => {
    it('відхиляє запит, де одночасно вказані targetSpecialtyId та newCode', async () => {
      await expect(
        service.replace(1, 1, {
          targetSpecialtyId: 2,
          newCode: 'F6',
          newName: 'ІСТ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє самозаміну спеціальності', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 1 }));

      await expect(
        service.replace(1, 1, { targetSpecialtyId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє заміну, якщо спеціальність уже була замінена раніше', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(
        makeSpecialty({ id: 1, isActive: false, replacedById: 2 }),
      );

      await expect(
        service.replace(1, 1, { targetSpecialtyId: 3 }),
      ).rejects.toThrow(ConflictException);
    });

    it('відхиляє заміну на неактивну цільову спеціальність', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 1 }));
      dbMock.mocks.enqueueSelect([
        makeSpecialty({ id: 2, code: 'F6', isActive: false }),
      ]);

      await expect(
        service.replace(1, 1, { targetSpecialtyId: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('створює нову спеціальність-правонаступника та деактивує стару (programsAction = keep)', async () => {
      const source = makeSpecialty({ id: 1, code: '126', isActive: true });
      const createdTarget = makeSpecialty({
        id: 2,
        code: 'F6',
        name: 'Інформаційні системи і технології',
        isActive: true,
      });
      const updatedSource = makeSpecialty({
        id: 1,
        code: '126',
        isActive: false,
        replacedById: 2,
        deactivationReason: 'Постанова КМУ № 1021',
      });

      dbMock.mocks.findSpecialty.mockResolvedValue(source);
      dbMock.mocks.insertReturning.mockResolvedValueOnce([createdTarget]);
      dbMock.mocks.updateReturning.mockResolvedValueOnce([updatedSource]);

      const res = await service.replace(1, 1, {
        newCode: 'F6',
        newName: 'Інформаційні системи і технології',
        programsAction: 'keep',
        reason: 'Постанова КМУ № 1021',
      });

      expect(res).toEqual({
        source: {
          id: 1,
          code: '126',
          name: source.name,
          isActive: false,
        },
        target: {
          id: 2,
          code: 'F6',
          name: 'Інформаційні системи і технології',
          isActive: true,
        },
        programsAction: 'keep',
        clonedProgramsCount: 0,
        linkedExistingProgramsCount: 0,
      });
    });

    it('клонує активні ОП під існуючого правонаступника та лінкує вже існуючу активну ОП', async () => {
      const source = makeSpecialty({ id: 1, code: '126', isActive: true });
      const target = makeSpecialty({
        id: 2,
        code: 'F6',
        name: 'Інформаційні системи і технології',
        isActive: true,
      });
      const updatedSource = makeSpecialty({
        id: 1,
        code: '126',
        isActive: false,
        replacedById: 2,
      });

      dbMock.mocks.findSpecialty.mockResolvedValue(source);
      // 1) select target specialty
      // 2) select active programs of source
      // 3) check existing target program for prog 10 -> none (will clone)
      // 4) check existing target program for prog 11 -> found active prog 20 (will link)
      dbMock.mocks.enqueueSelect(
        [target],
        [
          {
            id: 10,
            specialtyId: 1,
            orgUnitId: 100,
            name: 'ІСТ бакалаврат',
            degreeLevel: 'bachelor',
            isActive: true,
          },
          {
            id: 11,
            specialtyId: 1,
            orgUnitId: 100,
            name: 'ІСТ магістратура',
            degreeLevel: 'master',
            isActive: true,
          },
        ],
        [],
        [
          {
            id: 20,
            specialtyId: 2,
            orgUnitId: 100,
            name: 'ІСТ магістратура',
            degreeLevel: 'master',
            isActive: true,
          },
        ],
      );
      dbMock.mocks.updateReturning.mockResolvedValueOnce([updatedSource]);
      dbMock.mocks.insertReturning.mockResolvedValueOnce([{ id: 19 }]);

      const res = await service.replace(1, 1, {
        targetSpecialtyId: 2,
        programsAction: 'clone',
      });

      expect(res.clonedProgramsCount).toBe(1);
      expect(res.linkedExistingProgramsCount).toBe(1);
      expect(dbMock.mocks.insert).toHaveBeenCalledTimes(1);
      // 1 update for source specialty + 2 updates for old programs
      expect(dbMock.mocks.update).toHaveBeenCalledTimes(3);
    });

    it('кидає ConflictException при clone, якщо на цільовій спеціальності є неактивний дублікат ОП', async () => {
      const source = makeSpecialty({ id: 1, code: '126', isActive: true });
      const target = makeSpecialty({ id: 2, code: 'F6', isActive: true });
      const updatedSource = makeSpecialty({
        id: 1,
        code: '126',
        isActive: false,
        replacedById: 2,
      });

      dbMock.mocks.findSpecialty.mockResolvedValue(source);
      dbMock.mocks.enqueueSelect(
        [target],
        [
          {
            id: 10,
            specialtyId: 1,
            orgUnitId: 100,
            name: 'ІСТ',
            degreeLevel: 'bachelor',
            isActive: true,
          },
        ],
        [
          {
            id: 25,
            specialtyId: 2,
            orgUnitId: 100,
            name: 'ІСТ',
            degreeLevel: 'bachelor',
            isActive: false,
          },
        ],
      );
      dbMock.mocks.updateReturning.mockResolvedValueOnce([updatedSource]);

      await expect(
        service.replace(1, 1, {
          targetSpecialtyId: 2,
          programsAction: 'clone',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('забороняє видаляти спеціальність, до якої привʼязані ОП або попередні спеціальності', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 2, code: 'F6' }));
      dbMock.mocks.enqueueSelect([{ total: 1 }], [{ total: 2 }]);

      await expect(service.remove(1, 2)).rejects.toThrow(ConflictException);
      expect(dbMock.mocks.delete).not.toHaveBeenCalled();
    });

    it('видаляє порожню спеціальність без звʼязків', async () => {
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 2, code: 'F6' }));
      dbMock.mocks.enqueueSelect([{ total: 0 }], [{ total: 0 }]);

      await service.remove(1, 2);

      expect(dbMock.mocks.delete).toHaveBeenCalledTimes(1);
    });
  });
});
