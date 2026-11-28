import { http } from './client';
import type { UserRole } from './auth';

export const INVITATIONS_KEY = ['invitations'] as const;
export const INVITATION_CATALOG_KEY = ['invitations', 'catalog'] as const;

export type DegreeLevel = 'bachelor' | 'master' | 'phd';
export type OrgUnitType = 'university' | 'institute' | 'faculty' | 'department';
export type InvitationEmailStatus = 'pending' | 'sent' | 'failed';
export type InvitationLifecycleStatus =
    | 'pending'
    | 'accepted'
    | 'expired'
    | 'revoked';

export interface CatalogGroupItem {
    id: number;
    name: string;
    enrollmentYear: number | null;
    educationalProgramId: number;
    educationalProgramName: string;
    degreeLevel: DegreeLevel;
    specialtyCode: string;
    specialtyName: string;
    departmentId: number;
    departmentName: string;
    departmentShortName: string | null;
    orgPath: string;
    templateOption: string;
}

export interface CatalogOrgUnitItem {
    id: number;
    name: string;
    shortName: string | null;
    unitType: OrgUnitType;
    parentId: number | null;
    orgPath: string;
    templateOption: string;
}

export interface InvitationCatalog {
    isSuperAdmin: boolean;
    actorOrgUnitId: number | null;
    groups: CatalogGroupItem[];
    departments: CatalogOrgUnitItem[];
    orgUnits: CatalogOrgUnitItem[];
}

export interface InvitationListItem {
    id: number;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    patronymic: string | null;
    studentNumber: string | null;
    groupId: number | null;
    groupName: string | null;
    educationalProgramName: string | null;
    orgUnitId: number | null;
    orgUnitName: string | null;
    orgUnitShortName: string | null;
    orgUnitType: OrgUnitType | null;
    position: string | null;
    academicDegree: string | null;
    academicTitle: string | null;
    status: InvitationLifecycleStatus;
    emailStatus: InvitationEmailStatus;
    emailError: string | null;
    emailSentAt: string | null;
    expiresAt: string;
    acceptedAt: string | null;
    acceptedUserId: number | null;
    revokedAt: string | null;
    invitedByUserId: number | null;
    invitedByName: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InvitationListStats {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    emailFailed: number;
    emailPending: number;
}

export interface InvitationListResponse {
    items: InvitationListItem[];
    stats: InvitationListStats;
}

export interface ListInvitationsFilter {
    role?: UserRole | '';
    status?: InvitationLifecycleStatus | '';
    search?: string;
}

export interface CreateInvitationPayload {
    role: UserRole;
    email: string;
    lastName: string;
    firstName: string;
    patronymic?: string | null;
    studentNumber?: string | null;
    groupId?: number | null;
    orgUnitId?: number | null;
    position?: string | null;
    academicDegree?: string | null;
    academicTitle?: string | null;
}

export interface BulkInvitationRowInput {
    rowNumber?: number;
    email: string;
    lastName: string;
    firstName: string;
    patronymic?: string | null;
    studentNumber?: string | null;
    groupId?: number | null;
    groupRef?: string | null;
    orgUnitId?: number | null;
    orgUnitRef?: string | null;
    position?: string | null;
    academicDegree?: string | null;
    academicTitle?: string | null;
}

export interface BulkPreviewRow {
    rowNumber: number;
    email: string;
    lastName: string;
    firstName: string;
    patronymic: string | null;
    studentNumber: string | null;
    groupId: number | null;
    groupRef: string | null;
    groupLabel: string | null;
    orgUnitId: number | null;
    orgUnitRef: string | null;
    orgUnitLabel: string | null;
    position: string | null;
    academicDegree: string | null;
    academicTitle: string | null;
    isValid: boolean;
    errors: string[];
}

export interface BulkPreviewResponse {
    role: UserRole;
    totalCount: number;
    validCount: number;
    invalidCount: number;
    rows: BulkPreviewRow[];
}

export interface BulkCreateResponse {
    role: UserRole;
    createdCount: number;
    skippedCount: number;
    created: InvitationListItem[];
    skipped: BulkPreviewRow[];
}

export interface VerifiedInvitationView {
    email: string;
    role: UserRole;
    roleLabel: string;
    firstName: string;
    lastName: string;
    patronymic: string | null;
    studentNumber: string | null;
    groupName: string | null;
    educationalProgramName: string | null;
    orgUnitName: string | null;
    position: string | null;
    academicDegree: string | null;
    academicTitle: string | null;
    expiresAt: string;
}

export async function fetchInvitationCatalog(): Promise<InvitationCatalog> {
    const { data } = await http.get<InvitationCatalog>('/invitations/catalog');
    return data;
}

export async function fetchInvitations(
    filter: ListInvitationsFilter = {},
): Promise<InvitationListResponse> {
    const params: Record<string, string> = {};
    if (filter.role) params.role = filter.role;
    if (filter.status) params.status = filter.status;
    if (filter.search?.trim()) params.search = filter.search.trim();

    const { data } = await http.get<InvitationListResponse>('/invitations', {
        params,
    });
    return data;
}

export async function createInvitation(
    payload: CreateInvitationPayload,
): Promise<InvitationListItem> {
    const { data } = await http.post<InvitationListItem>('/invitations', payload);
    return data;
}

export async function downloadInvitationTemplate(role: UserRole): Promise<void> {
    const response = await http.get<Blob>('/invitations/template', {
        params: { role },
        responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'] as
        | string
        | undefined;
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] ?? `thesis-hub-template-${role}s.xlsx`;

    const blobUrl = URL.createObjectURL(response.data);
    try {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

export async function uploadBulkInvitationsFile(
    role: UserRole,
    file: File,
): Promise<BulkPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await http.post<BulkPreviewResponse>(
        '/invitations/bulk/upload',
        formData,
        {
            params: { role },
            headers: { 'Content-Type': 'multipart/form-data' },
        },
    );
    return data;
}

export async function previewBulkInvitations(
    role: UserRole,
    rows: BulkInvitationRowInput[],
): Promise<BulkPreviewResponse> {
    const { data } = await http.post<BulkPreviewResponse>(
        '/invitations/bulk/preview',
        { role, rows },
    );
    return data;
}

export async function createBulkInvitations(
    role: UserRole,
    rows: BulkInvitationRowInput[],
    skipInvalid = true,
): Promise<BulkCreateResponse> {
    const { data } = await http.post<BulkCreateResponse>('/invitations/bulk', {
        role,
        rows,
        skipInvalid,
    });
    return data;
}

export async function resendInvitation(id: number): Promise<InvitationListItem> {
    const { data } = await http.post<InvitationListItem>(
        `/invitations/${id}/resend`,
    );
    return data;
}

export async function revokeInvitation(id: number): Promise<InvitationListItem> {
    const { data } = await http.post<InvitationListItem>(
        `/invitations/${id}/revoke`,
    );
    return data;
}

export async function verifyInvitation(
    token: string,
): Promise<VerifiedInvitationView> {
    const { data } = await http.post<VerifiedInvitationView>(
        '/invitations/verify',
        { token },
    );
    return data;
}

export async function acceptInvitation(
    token: string,
    password: string,
): Promise<{ message: string }> {
    const { data } = await http.post<{ message: string }>(
        '/invitations/accept',
        { token, password },
    );
    return data;
}
