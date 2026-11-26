import { http } from './client';

export const ORG_TREE_KEY = ['org-units-tree'] as const;

export type OrgUnitType = 'university' | 'institute' | 'faculty' | 'department';

export const ORG_UNIT_TYPES: readonly OrgUnitType[] = [
    'university',
    'institute',
    'faculty',
    'department',
];

export const ORG_UNIT_TYPE_LABELS: Record<OrgUnitType, string> = {
    university: 'Університет',
    institute: 'Інститут',
    faculty: 'Факультет',
    department: 'Кафедра',
};

export const ORG_UNIT_TYPE_BADGE_BG: Record<OrgUnitType, string> = {
    university: 'primary',
    institute: 'info',
    faculty: 'success',
    department: 'secondary',
};

export interface AdminActor {
    userId: number;
    isSuperAdmin: boolean;
    orgUnitId: number | null;
}

export interface OrgUnitCounts {
    children: number;
    activeChildren: number;
    programs: number;
    activePrograms: number;
    supervisors: number;
    admins: number;
}

export interface OrgUnitTreeItem {
    id: number;
    parentId: number | null;
    unitType: OrgUnitType;
    name: string;
    shortName: string | null;
    isActive: boolean;
    inScope: boolean;
    canEdit: boolean;
    canManage: boolean;
    canDelete: boolean;
    allowedChildTypes: OrgUnitType[] | null;
    effectiveAllowedChildTypes: OrgUnitType[];
    counts: OrgUnitCounts;
}

export interface HierarchyRuleItem {
    id: number;
    childType: OrgUnitType;
    parentType: OrgUnitType | null;
}

export interface OrgUnitsTreeResponse {
    actor: AdminActor;
    units: OrgUnitTreeItem[];
    hierarchyRules: HierarchyRuleItem[];
}

export interface CreateOrgUnitPayload {
    parentId: number | null;
    unitType: OrgUnitType;
    name: string;
    shortName?: string | null;
}

export interface UpdateOrgUnitPayload {
    unitType?: OrgUnitType;
    name?: string;
    shortName?: string | null;
}

export async function fetchOrgUnitsTree(
    includeInactive: boolean,
): Promise<OrgUnitsTreeResponse> {
    const { data } = await http.get<OrgUnitsTreeResponse>('/org-units/tree', {
        params: { includeInactive },
    });
    return data;
}

export async function createOrgUnit(payload: CreateOrgUnitPayload) {
    const { data } = await http.post<{ id: number }>('/org-units', payload);
    return data;
}

export async function updateOrgUnit(id: number, payload: UpdateOrgUnitPayload) {
    const { data } = await http.patch<{ id: number }>(`/org-units/${id}`, payload);
    return data;
}

export async function moveOrgUnit(id: number, parentId: number | null) {
    const { data } = await http.patch<{ id: number }>(`/org-units/${id}/parent`, {
        parentId,
    });
    return data;
}

export async function deactivateOrgUnit(id: number, cascade: boolean) {
    const { data } = await http.post<{ deactivatedIds: number[] }>(
        `/org-units/${id}/deactivate`,
        { cascade },
    );
    return data;
}

export async function activateOrgUnit(id: number) {
    const { data } = await http.post<{ id: number }>(`/org-units/${id}/activate`);
    return data;
}

export async function deleteOrgUnit(id: number): Promise<string> {
    const { data } = await http.delete<{ message: string }>(`/org-units/${id}`);
    return data.message;
}

export async function setAllowedChildren(
    id: number,
    childTypes: OrgUnitType[] | null,
) {
    const { data } = await http.put<{ allowedChildTypes: OrgUnitType[] | null }>(
        `/org-units/${id}/allowed-children`,
        { childTypes },
    );
    return data;
}

export async function replaceHierarchyRules(
    rules: Array<{ childType: OrgUnitType; parentType: OrgUnitType | null }>,
): Promise<HierarchyRuleItem[]> {
    const { data } = await http.put<HierarchyRuleItem[]>('/org-hierarchy-rules', {
        rules,
    });
    return data;
}
