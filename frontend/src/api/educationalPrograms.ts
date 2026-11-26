import { http } from './client';
import type { AdminActor } from './orgUnits';

export const EDUCATIONAL_PROGRAMS_KEY = ['educational-programs'] as const;

export type DegreeLevel = 'bachelor' | 'master' | 'phd';

export const DEGREE_LEVELS: readonly DegreeLevel[] = ['bachelor', 'master', 'phd'];

export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
    bachelor: 'Бакалавр',
    master: 'Магістр',
    phd: 'Доктор філософії (PhD)',
};

export const DEGREE_LEVEL_SHORT_LABELS: Record<DegreeLevel, string> = {
    bachelor: 'Бакалавр',
    master: 'Магістр',
    phd: 'PhD',
};

export interface ProgramSpecialtyRef {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
}

export interface ProgramDepartmentRef {
    id: number;
    name: string;
    shortName: string | null;
    parentName: string | null;
    parentShortName: string | null;
    isActive: boolean;
}

export interface ProgramRef {
    id: number;
    name: string;
    degreeLevel: DegreeLevel;
    specialtyCode: string;
    departmentName: string;
    departmentShortName: string | null;
    isActive: boolean;
}

export interface EducationalProgramCounts {
    groups: number;
    activeGroups: number;
    predecessors: number;
}

export interface EducationalProgramItem {
    id: number;
    specialtyId: number;
    orgUnitId: number;
    name: string;
    degreeLevel: DegreeLevel;
    isActive: boolean;
    replacedById: number | null;
    replacedBy: ProgramRef | null;
    currentReplacement: ProgramRef | null;
    replacedFrom: ProgramRef[];
    specialty: ProgramSpecialtyRef;
    department: ProgramDepartmentRef;
    createdAt: string;
    updatedAt: string;
    deactivatedAt: string | null;
    deactivationReason: string | null;
    counts: EducationalProgramCounts;
    canDelete: boolean;
}

export interface EducationalProgramsListResponse {
    actor: AdminActor;
    programs: EducationalProgramItem[];
    availableDepartments: ProgramDepartmentRef[];
    activeSpecialties: ProgramSpecialtyRef[];
}

export interface CreateEducationalProgramPayload {
    specialtyId: number;
    orgUnitId: number;
    name: string;
    degreeLevel: DegreeLevel;
}

export interface UpdateEducationalProgramPayload {
    specialtyId?: number;
    orgUnitId?: number;
    name?: string;
    degreeLevel?: DegreeLevel;
}

export interface ReplaceEducationalProgramPayload {
    targetProgramId?: number;
    newName?: string;
    newSpecialtyId?: number;
    newOrgUnitId?: number;
    newDegreeLevel?: DegreeLevel;
    reason?: string | null;
}

export interface ReplaceEducationalProgramResponse {
    source: ProgramRef;
    target: ProgramRef;
}

export async function fetchEducationalPrograms(
    includeInactive: boolean,
): Promise<EducationalProgramsListResponse> {
    const { data } = await http.get<EducationalProgramsListResponse>(
        '/educational-programs',
        {
            params: { includeInactive },
        },
    );
    return data;
}

export async function createEducationalProgram(payload: CreateEducationalProgramPayload) {
    const { data } = await http.post<{ id: number; name: string }>(
        '/educational-programs',
        payload,
    );
    return data;
}

export async function updateEducationalProgram(
    id: number,
    payload: UpdateEducationalProgramPayload,
) {
    const { data } = await http.patch<{ id: number; name: string }>(
        `/educational-programs/${id}`,
        payload,
    );
    return data;
}

export async function deactivateEducationalProgram(id: number, reason?: string | null) {
    const { data } = await http.post<{ id: number }>(
        `/educational-programs/${id}/deactivate`,
        { reason: reason ?? null },
    );
    return data;
}

export async function activateEducationalProgram(id: number) {
    const { data } = await http.post<{ id: number }>(
        `/educational-programs/${id}/activate`,
    );
    return data;
}

export async function replaceEducationalProgram(
    id: number,
    payload: ReplaceEducationalProgramPayload,
): Promise<ReplaceEducationalProgramResponse> {
    const { data } = await http.post<ReplaceEducationalProgramResponse>(
        `/educational-programs/${id}/replace`,
        payload,
    );
    return data;
}

export async function deleteEducationalProgram(id: number): Promise<string> {
    const { data } = await http.delete<{ message: string }>(
        `/educational-programs/${id}`,
    );
    return data.message;
}
