import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrizzleDB } from '../database/database.module.js';
import type { DegreeLevel } from '../educational-programs/educational-programs.types.js';
import type { OrgScopeService } from '../org-units/org-scope.service.js';
import type { AdminActor, OrgUnitType } from '../org-units/org-units.types.js';
import { GroupsService } from './groups.service.js';

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
  }> = {},
) {
  return {
    id: 10,
    specialtyId: 1,
    orgUnitId: 100,
    name: 'Інформаційні управляючі системи та технології',
    degreeLevel: 'master' as DegreeLevel,
    isActive: true,
    replacedById: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    deactivatedAt: null,
    deactivationReason: null,
    ...overrides,
  };
}

function makeGroup(
  overrides: Partial<{
    id: number;
    educationalProgramId: number;
    name: string;
    enrollmentYear: number | null;
    isActive: boolean;
    deactivatedAt: string | null;
  }> = {},
) {
  return {
    id: 1,
    educationalProgramId: 10,
    name: 'ІС-51мп',
    enrollmentYear: 2025,
    isActive: true,
    createdAt: '2025-09-01T00:00:00.000Z',
    updatedAt: '2025-09-01T00:00:00.000Z',
    deactivatedAt: null,
    ...overrides,
  };
}

function createDbMock() {
  const selectResults: unknown[] = [];
  const enqueueSelect = (...items: unknown[]) => {
    selectResults.push(...items);
  };

  const select = vi.fn(() => {
    const result = Promise.resolve(selectResults.shift() ?? []);
    const builder = Object.assign(result, {
      from: vi.fn(() => builder),
      innerJoin: vi.fn(() => builder),
      where: vi.fn(() => builder),
      groupBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
    });
    return builder;
  });

  const insertReturning = vi.fn().mockResolvedValue([makeGroup({ id: 42 })]);
  const insertValues = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: insertReturning });
  });
  const insert = vi.fn().mockReturnValue({ values: insertValues });

  const updateReturning = vi.fn().mockResolvedValue([makeGroup()]);
  const updateWhere = vi.fn(() => {
    const promise = Promise.resolve(undefined);
    return Object.assign(promise, { returning: updateReturning });
  });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: deleteWhere });

  return {
    db: { select, insert, update, delete: del } as unknown as DrizzleDB,
    enqueueSelect,
    insertValues,
    insertReturning,
    updateSet,
    updateReturning,
    deleteWhere,
  };
}

function createScopeMock(actor: AdminActor) {
  const assertUnitInScope = vi.fn().mockResolvedValue(undefined);
  const scope = {
    getAdminActor: vi.fn().mockResolvedValue(actor),
    getSubtreeNodes: vi
      .fn()
      .mockResolvedValue(
        actor.orgUnitId !== null ? [{ id: actor.orgUnitId }] : [],
      ),
    assertUnitInScope,
  } as unknown as OrgScopeService;

  return { scope, assertUnitInScope };
}

describe('GroupsService', () => {
  const superAdmin: AdminActor = {
    userId: 1,
    orgUnitId: null,
    isSuperAdmin: true,
  };
  const deptAdmin: AdminActor = {
    userId: 2,
    orgUnitId: 100,
    isSuperAdmin: false,
  };

  let dbMock: ReturnType<typeof createDbMock>;
  let scopeMock: ReturnType<typeof createScopeMock>;
  let service: GroupsService;

  beforeEach(() => {
    dbMock = createDbMock();
    scopeMock = createScopeMock(superAdmin);
    service = new GroupsService(dbMock.db, scopeMock.scope);
  });

  it('findAll фільтрує групи за областю відповідальності адміна підрозділу та статусом', async () => {
    scopeMock = createScopeMock(deptAdmin);
    service = new GroupsService(dbMock.db, scopeMock.scope);

    const faculty = makeOrgUnit({
      id: 10,
      parentId: 1,
      unitType: 'faculty',
      name: 'ФІОТ',
      shortName: 'ФІОТ',
    });
    const deptInScope = makeOrgUnit({ id: 100, parentId: 10 });
    const deptOutOfScope = makeOrgUnit({
      id: 200,
      parentId: 10,
      name: 'Кафедра ОТ',
      shortName: 'ОТ',
    });
    const spec = makeSpecialty();
    const progInScope = makeProgram({ id: 10, orgUnitId: 100 });
    const progOutOfScope = makeProgram({ id: 20, orgUnitId: 200 });

    dbMock.enqueueSelect(
      [
        makeGroup({
          id: 1,
          educationalProgramId: 10,
          name: 'ІС-51мп',
          isActive: true,
        }),
        makeGroup({
          id: 2,
          educationalProgramId: 10,
          name: 'ІС-31мп',
          isActive: false,
        }),
        makeGroup({
          id: 3,
          educationalProgramId: 20,
          name: 'ІО-51мп',
          isActive: true,
        }),
      ],
      [progInScope, progOutOfScope],
      [spec],
      [faculty, deptInScope, deptOutOfScope],
      [{ groupId: 1, total: 18, active: 17 }],
    );

    const res = await service.findAll(deptAdmin.userId, false);
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].name).toBe('ІС-51мп');
    expect(res.groups[0].counts).toEqual({ students: 18, activeStudents: 17 });
    expect(res.groups[0].canDelete).toBe(false);
    expect(res.availablePrograms.map((p) => p.id)).toEqual([10]);
    expect(res.availableDepartments.map((d) => d.id)).toEqual([100]);
  });

  it('create створює групу для активної освітньої програми на активній кафедрі', async () => {
    dbMock.enqueueSelect([makeProgram()], [makeOrgUnit()]);
    const created = await service.create(superAdmin.userId, {
      educationalProgramId: 10,
      name: 'ІС-52мп',
      enrollmentYear: 2025,
    });

    expect(created.id).toBe(42);
    expect(dbMock.insertValues).toHaveBeenCalledWith({
      educationalProgramId: 10,
      name: 'ІС-52мп',
      enrollmentYear: 2025,
      isActive: true,
    });
  });

  it('create відхиляє створення групи для неактивної освітньої програми', async () => {
    dbMock.enqueueSelect([makeProgram({ isActive: false })]);
    await expect(
      service.create(superAdmin.userId, {
        educationalProgramId: 10,
        name: 'ІС-52мп',
        enrollmentYear: 2025,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create відхиляє створення групи на неактивній кафедрі', async () => {
    dbMock.enqueueSelect([makeProgram()], [makeOrgUnit({ isActive: false })]);
    await expect(
      service.create(superAdmin.userId, {
        educationalProgramId: 10,
        name: 'ІС-52мп',
        enrollmentYear: 2025,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('create перетворює unique violation (23505) на ConflictException', async () => {
    dbMock.enqueueSelect([makeProgram()], [makeOrgUnit()]);
    dbMock.insertReturning.mockRejectedValueOnce({
      cause: { code: '23505' },
    });

    await expect(
      service.create(superAdmin.userId, {
        educationalProgramId: 10,
        name: 'ІС-51мп',
        enrollmentYear: 2025,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('create відхиляє адміна підрозділу поза його областю відповідальності', async () => {
    scopeMock = createScopeMock(deptAdmin);
    scopeMock.assertUnitInScope.mockRejectedValueOnce(
      new ForbiddenException('Немає прав'),
    );
    service = new GroupsService(dbMock.db, scopeMock.scope);

    dbMock.enqueueSelect([makeProgram({ orgUnitId: 200 })]);

    await expect(
      service.create(deptAdmin.userId, {
        educationalProgramId: 10,
        name: 'ІО-51мп',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('update оновлює шифр і рік вступу групи', async () => {
    dbMock.enqueueSelect([makeGroup()], [makeProgram()]);
    dbMock.updateReturning.mockResolvedValueOnce([
      makeGroup({ name: 'ІС-52мп', enrollmentYear: 2026 }),
    ]);

    const updated = await service.update(superAdmin.userId, 1, {
      name: 'ІС-52мп',
      enrollmentYear: 2026,
    });

    expect(updated.name).toBe('ІС-52мп');
    expect(dbMock.updateSet).toHaveBeenCalledWith({
      educationalProgramId: 10,
      name: 'ІС-52мп',
      enrollmentYear: 2026,
    });
  });

  it('deactivate переводить активну групу в архів', async () => {
    dbMock.enqueueSelect([makeGroup({ isActive: true })], [makeProgram()]);
    dbMock.updateReturning.mockResolvedValueOnce([
      makeGroup({ isActive: false, deactivatedAt: '2026-06-30T00:00:00.000Z' }),
    ]);

    const res = await service.deactivate(superAdmin.userId, 1);
    expect(res.isActive).toBe(false);
    expect(dbMock.updateSet).toHaveBeenCalledWith({ isActive: false });
  });

  it('activate забороняє повторну активацію групи на неактивній ОП', async () => {
    dbMock.enqueueSelect(
      [makeGroup({ isActive: false })],
      [makeProgram({ isActive: false })],
    );

    await expect(service.activate(superAdmin.userId, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('remove забороняє видалення групи, у якій є студенти', async () => {
    dbMock.enqueueSelect([makeGroup()], [makeProgram()], [{ count: 5 }]);

    await expect(service.remove(superAdmin.userId, 1)).rejects.toThrow(
      ConflictException,
    );
    expect(dbMock.deleteWhere).not.toHaveBeenCalled();
  });

  it('remove видаляє порожню групу без студентів', async () => {
    dbMock.enqueueSelect([makeGroup()], [makeProgram()], [{ count: 0 }]);

    await service.remove(superAdmin.userId, 1);
    expect(dbMock.deleteWhere).toHaveBeenCalledOnce();
  });

  it('findOne викидає NotFoundException для неіснуючої групи', async () => {
    dbMock.enqueueSelect([]);
    await expect(service.findOne(superAdmin.userId, 999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
