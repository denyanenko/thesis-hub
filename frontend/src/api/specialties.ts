import { http } from './client';
import type { AdminActor } from './orgUnits';

export const SPECIALTIES_KEY = ['specialties'] as const;

export type SpecialtyProgramsAction = 'keep' | 'clone';

export interface SpecialtyRef {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
}

export interface SpecialtyCounts {
    programs: number;
    activePrograms: number;
    predecessors: number;
}

export interface SpecialtyItem {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    replacedById: number | null;
    replacedBy: SpecialtyRef | null;
    currentReplacement: SpecialtyRef | null;
    replacedFrom: SpecialtyRef[];
    createdAt: string;
    updatedAt: string;
    deactivatedAt: string | null;
    deactivationReason: string | null;
    counts: SpecialtyCounts;
    canDelete: boolean;
}

export interface SpecialtiesListResponse {
    actor: AdminActor;
    specialties: SpecialtyItem[];
}

export interface CreateSpecialtyPayload {
    code: string;
    name: string;
}

export interface UpdateSpecialtyPayload {
    code?: string;
    name?: string;
}

export interface ReplaceSpecialtyPayload {
    targetSpecialtyId?: number;
    newCode?: string;
    newName?: string;
    programsAction: SpecialtyProgramsAction;
    reason?: string | null;
}

export interface ReplaceSpecialtyResponse {
    source: SpecialtyRef;
    target: SpecialtyRef;
    programsAction: SpecialtyProgramsAction;
    clonedProgramsCount: number;
    linkedExistingProgramsCount: number;
}

export async function fetchSpecialties(
    includeInactive: boolean,
): Promise<SpecialtiesListResponse> {
    const { data } = await http.get<SpecialtiesListResponse>('/specialties', {
        params: { includeInactive },
    });
    return data;
}

export async function createSpecialty(payload: CreateSpecialtyPayload) {
    const { data } = await http.post<{ id: number; code: string; name: string }>(
        '/specialties',
        payload,
    );
    return data;
}

export async function updateSpecialty(id: number, payload: UpdateSpecialtyPayload) {
    const { data } = await http.patch<{ id: number; code: string; name: string }>(
        `/specialties/${id}`,
        payload,
    );
    return data;
}

export async function deactivateSpecialty(id: number, reason?: string | null) {
    const { data } = await http.post<{ id: number }>(`/specialties/${id}/deactivate`, {
        reason: reason ?? null,
    });
    return data;
}

export async function activateSpecialty(id: number) {
    const { data } = await http.post<{ id: number }>(`/specialties/${id}/activate`);
    return data;
}

export async function replaceSpecialty(
    id: number,
    payload: ReplaceSpecialtyPayload,
): Promise<ReplaceSpecialtyResponse> {
    const { data } = await http.post<ReplaceSpecialtyResponse>(
        `/specialties/${id}/replace`,
        payload,
    );
    return data;
}

export async function deleteSpecialty(id: number): Promise<string> {
    const { data } = await http.delete<{ message: string }>(`/specialties/${id}`);
    return data.message;
}
