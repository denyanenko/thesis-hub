import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import type { OrgScopeService } from '../org-units/org-scope.service.js';
import type { AdminActor, OrgUnitType } from '../org-units/org-units.types.js';
import { EducationalProgramsService } from './educational-programs.service.js';
import type { DegreeLevel } from './educational-programs.types.js';

function makeOrgUnit(
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
    id: 100,
    parentId: 10,
    unitType: 'department' as OrgUnitType,
    name: 'Кафедра інформаційних систем та технологій',
    shortName: 'ІСТ',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    deactivatedAt: null,
    deactivationReason: null,
    replacedById: null,
    ...overrides,
  };
}

function makeSpecialty(
  overrides: Partial<{
    id: number;
    code: string;
    name: string;
    isActive: boolean;
  }> = {},
) {
  return {
    id: 1,
    code: 'F6',
    name: 'Інформаційні системи і технології',
    isActive: true,
    replacedById: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    deactivatedAt: null,
    deactivationReason: null,
    ...overrides,
  };
}

function makeProgram(
  overrides: Partial<{
    id: number;
    specialtyId: number;
    orgUnitId: number;
    name: string;
    degreeLevel: DegreeLevel;
    isActive: boolean;
    replacedById: number | null;
    deactivatedAt: string | null;
    deactivationReason: string | null;
  }> = {},
) {
  return {
    id: 10,
    specialtyId: 1,
    orgUnitId: 100,
    name: 'Інформаційні управляючі системи та технології',
    degreeLevel: 'bachelor' as DegreeLevel,
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
  const enqueueSelect = (...items: unknown[]) => {
    selectResults.push(...items);
  };

  const select = vi.fn(() => {
    const nextResult = () => Promise.resolve(selectResults.shift() ?? []);
    const builder = {
      from: vi.fn(() => builder),
      where: vi.fn(() => builder),
      groupBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      then: (
        onFulfilled: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => nextResult().then(onFulfilled, onRejected),
    };
    return builder;
  });

  const insertReturning = vi.fn().mockResolvedValue([makeProgram({ id: 55 })]);
  const insertValues = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: insertReturning });
  });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const updateReturning = vi.fn().mockResolvedValue([makeProgram()]);
  const updateWhere = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: updateReturning });
  });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: deleteWhere });

  const findProgram = vi.fn();
  const findSpecialty = vi.fn();
  const findOrgUnit = vi.fn();

  const tx = { select, insert, update, delete: del };
  const transaction = vi.fn(
    async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx),
  );

  return {
    db: {
      query: {
        educationalPrograms: { findFirst: findProgram },
        specialties: { findFirst: findSpecialty },
        orgUnits: { findFirst: findOrgUnit },
      },
      select,
      insert,
      update,
      delete: del,
      transaction,
    } as unknown as DrizzleDB,
    mocks: {
      enqueueSelect,
      findProgram,
      findSpecialty,
      findOrgUnit,
      insert,
      insertReturning,
      update,
      updateSet,
      updateReturning,
      delete: del,
    },
  };
}

function createScopeMock(actor: AdminActor) {
  return {
    getAdminActor: vi.fn().mockResolvedValue(actor),
    assertUnitInScope: vi.fn().mockResolvedValue(undefined),
    getSubtreeNodes: vi.fn().mockResolvedValue([]),
  };
}

describe('EducationalProgramsService', () => {
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
  let service: EducationalProgramsService;

  beforeEach(() => {
    dbMock = createDbMock();
    scopeMock = createScopeMock(superAdmin);
    service = new EducationalProgramsService(
      dbMock.db,
      scopeMock as unknown as OrgScopeService,
    );
  });

  describe('findAll', () => {
    it('обмежує список ОП та кафедр піддеревом локального адміністратора', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);
      scopeMock.getSubtreeNodes.mockResolvedValue([
        { id: 10, isActive: true, depth: 0 },
        { id: 100, isActive: true, depth: 1 },
      ]);

      const faculty = makeOrgUnit({
        id: 10,
        parentId: 1,
        unitType: 'faculty',
        name: 'ФІОТ',
        shortName: 'ФІОТ',
      });
      const deptInScope = makeOrgUnit({ id: 100, parentId: 10, shortName: 'ІСТ' });
      const deptOutside = makeOrgUnit({
        id: 200,
        parentId: 20,
        name: 'Кафедра ПМА',
        shortName: 'ПМА',
      });
      const specF6 = makeSpecialty({ id: 1, code: 'F6', isActive: true });
      const specOld = makeSpecialty({ id: 2, code: '126', isActive: false });
      const progInScope = makeProgram({ id: 10, orgUnitId: 100, specialtyId: 1 });
      const progOutside = makeProgram({ id: 11, orgUnitId: 200, specialtyId: 1 });

      dbMock.mocks.enqueueSelect(
        [progInScope, progOutside],
        [specF6, specOld],
        [faculty, deptInScope, deptOutside],
        [{ educationalProgramId: 10, total: 2, active: 2 }],
      );

      const res = await service.findAll(2, true);

      expect(res.programs).toHaveLength(1);
      expect(res.programs[0].id).toBe(10);
      expect(res.programs[0].department.parentShortName).toBe('ФІОТ');
      expect(res.programs[0].counts).toEqual({
        groups: 2,
        activeGroups: 2,
        predecessors: 0,
      });
      expect(res.programs[0].canDelete).toBe(false);
      expect(res.availableDepartments.map((d) => d.id)).toEqual([100]);
      expect(res.activeSpecialties.map((s) => s.code)).toEqual(['F6']);
    });
  });

  describe('create', () => {
    it('забороняє привʼязувати ОП не до кафедри (напр. до факультету)', async () => {
      dbMock.mocks.findOrgUnit.mockResolvedValue(
        makeOrgUnit({ id: 10, unitType: 'faculty', name: 'ФІОТ' }),
      );

      await expect(
        service.create(1, {
          specialtyId: 1,
          orgUnitId: 10,
          name: 'Тестова ОП',
          degreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('забороняє привʼязувати ОП до неактивної кафедри', async () => {
      dbMock.mocks.findOrgUnit.mockResolvedValue(
        makeOrgUnit({ id: 100, isActive: false }),
      );

      await expect(
        service.create(1, {
          specialtyId: 1,
          orgUnitId: 100,
          name: 'Тестова ОП',
          degreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('забороняє привʼязувати ОП до неактивної спеціальності', async () => {
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 100 }));
      dbMock.mocks.findSpecialty.mockResolvedValue(
        makeSpecialty({ id: 2, code: '126', isActive: false }),
      );

      await expect(
        service.create(1, {
          specialtyId: 2,
          orgUnitId: 100,
          name: 'Тестова ОП',
          degreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('перетворює PG 23505 на ConflictException', async () => {
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 100 }));
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 1 }));
      dbMock.mocks.insertReturning.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.create(1, {
          specialtyId: 1,
          orgUnitId: 100,
          name: 'ІУСТ',
          degreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('забороняє локальному адміну створювати ОП поза його підрозділом', async () => {
      scopeMock.getAdminActor.mockResolvedValue(facultyAdmin);
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 200 }));
      scopeMock.assertUnitInScope.mockRejectedValueOnce(
        new ForbiddenException('Поза scope'),
      );

      await expect(
        service.create(2, {
          specialtyId: 1,
          orgUnitId: 200,
          name: 'Чужа ОП',
          degreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('activate', () => {
    it('забороняє активувати ОП, для якої вже вказано правонаступника', async () => {
      dbMock.mocks.findProgram.mockResolvedValue(
        makeProgram({ id: 10, isActive: false, replacedById: 11 }),
      );

      await expect(service.activate(1, 10)).rejects.toThrow(ConflictException);
    });

    it('забороняє активувати ОП, якщо її спеціальність неактивна', async () => {
      dbMock.mocks.findProgram.mockResolvedValue(
        makeProgram({ id: 10, isActive: false, specialtyId: 2 }),
      );
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 100 }));
      dbMock.mocks.findSpecialty.mockResolvedValue(
        makeSpecialty({ id: 2, code: '126', isActive: false }),
      );

      await expect(service.activate(1, 10)).rejects.toThrow(BadRequestException);
    });
  });

  describe('replace', () => {
    it('відхиляє одночасне передання targetProgramId і newName', async () => {
      await expect(
        service.replace(1, 10, {
          targetProgramId: 11,
          newName: 'Нова назва',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('відхиляє створення нової ОП-правонаступника, якщо параметри ідентичні поточній', async () => {
      dbMock.mocks.findProgram.mockResolvedValue(
        makeProgram({
          id: 10,
          name: 'ІУСТ',
          specialtyId: 1,
          orgUnitId: 100,
          degreeLevel: 'bachelor',
        }),
      );

      await expect(
        service.replace(1, 10, {
          newName: 'ІУСТ',
          newSpecialtyId: 1,
          newOrgUnitId: 100,
          newDegreeLevel: 'bachelor',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('створює нову ОП-правонаступника та деактивує стару', async () => {
      const source = makeProgram({ id: 10, name: 'Стара назва ОП' });
      const createdTarget = makeProgram({
        id: 15,
        name: 'Оновлена назва ОП',
        isActive: true,
      });
      const updatedSource = makeProgram({
        id: 10,
        name: 'Стара назва ОП',
        isActive: false,
        replacedById: 15,
      });

      dbMock.mocks.findProgram.mockResolvedValueOnce(source);
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 100 }));
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 1 }));
      dbMock.mocks.insertReturning.mockResolvedValueOnce([createdTarget]);
      dbMock.mocks.updateReturning.mockResolvedValueOnce([updatedSource]);

      const res = await service.replace(1, 10, {
        newName: 'Оновлена назва ОП',
        reason: 'Рішення Вченої ради 2026',
      });

      expect(res.source.id).toBe(10);
      expect(res.source.isActive).toBe(false);
      expect(res.target.id).toBe(15);
      expect(res.target.name).toBe('Оновлена назва ОП');
    });

    it('підтримує злиття з уже існуючою активною ОП', async () => {
      const source = makeProgram({ id: 10, name: 'Стара ОП' });
      const target = makeProgram({ id: 20, name: 'Обʼєднана ОП', isActive: true });
      const updatedSource = makeProgram({
        id: 10,
        name: 'Стара ОП',
        isActive: false,
        replacedById: 20,
      });

      dbMock.mocks.findProgram
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(target);
      dbMock.mocks.findSpecialty.mockResolvedValue(makeSpecialty({ id: 1 }));
      dbMock.mocks.findOrgUnit.mockResolvedValue(makeOrgUnit({ id: 100 }));
      dbMock.mocks.updateReturning.mockResolvedValueOnce([updatedSource]);

      const res = await service.replace(1, 10, { targetProgramId: 20 });

      expect(res.target.id).toBe(20);
      expect(dbMock.mocks.insert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('забороняє видаляти ОП, якщо до неї привʼязані групи або попередні ОП', async () => {
      dbMock.mocks.findProgram.mockResolvedValue(makeProgram({ id: 10 }));
      dbMock.mocks.enqueueSelect([{ total: 2 }], [{ total: 0 }]);

      await expect(service.remove(1, 10)).rejects.toThrow(ConflictException);
      expect(dbMock.mocks.delete).not.toHaveBeenCalled();
    });

    it('видаляє порожню ОП без груп та попередників', async () => {
      dbMock.mocks.findProgram.mockResolvedValue(makeProgram({ id: 10 }));
      dbMock.mocks.enqueueSelect([{ total: 0 }], [{ total: 0 }]);

      await service.remove(1, 10);

      expect(dbMock.mocks.delete).toHaveBeenCalledTimes(1);
    });
  });
});
