import { http } from './client';
import type {
    DegreeLevel,
    ProgramDepartmentRef,
    ProgramSpecialtyRef,
} from './educationalPrograms';
import type { AdminActor } from './orgUnits';

export const GROUPS_KEY = ['groups'] as const;

export interface GroupProgramRef {
    id: number;
    name: string;
    degreeLevel: DegreeLevel;
    isActive: boolean;
    specialty: ProgramSpecialtyRef;
    department: ProgramDepartmentRef;
}

export interface GroupCounts {
    students: number;
    activeStudents: number;
}

export interface GroupItem {
    id: number;
    educationalProgramId: number;
    name: string;
    enrollmentYear: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deactivatedAt: string | null;
    program: GroupProgramRef;
    counts: GroupCounts;
    canDelete: boolean;
}

export interface GroupsListResponse {
    actor: AdminActor;
    groups: GroupItem[];
    availablePrograms: GroupProgramRef[];
    availableDepartments: ProgramDepartmentRef[];
}

export interface CreateGroupPayload {
    educationalProgramId: number;
    name: string;
    enrollmentYear?: number | null;
}

export interface UpdateGroupPayload {
    educationalProgramId?: number;
    name?: string;
    enrollmentYear?: number | null;
}

export async function fetchGroups(includeInactive: boolean): Promise<GroupsListResponse> {
    const { data } = await http.get<GroupsListResponse>('/groups', {
        params: { includeInactive },
    });
    return data;
}

export async function createGroup(payload: CreateGroupPayload) {
    const { data } = await http.post<{ id: number; name: string }>('/groups', payload);
    return data;
}

export async function updateGroup(id: number, payload: UpdateGroupPayload) {
    const { data } = await http.patch<{ id: number; name: string }>(`/groups/${id}`, payload);
    return data;
}

export async function deactivateGroup(id: number) {
    const { data } = await http.post<{ id: number }>(`/groups/${id}/deactivate`);
    return data;
}

export async function activateGroup(id: number) {
    const { data } = await http.post<{ id: number }>(`/groups/${id}/activate`);
    return data;
}

export async function deleteGroup(id: number): Promise<string> {
    const { data } = await http.delete<{ message: string }>(`/groups/${id}`);
    return data.message;
}
