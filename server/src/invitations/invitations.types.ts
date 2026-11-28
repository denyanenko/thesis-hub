import type { UserRole } from '../auth/auth.service.js';
import type {
  degreeLevel,
  invitationEmailStatus,
  orgUnitType,
} from '../database/schema.js';

export type DegreeLevel = (typeof degreeLevel.enumValues)[number];
export type OrgUnitType = (typeof orgUnitType.enumValues)[number];
export type InvitationEmailStatus =
  (typeof invitationEmailStatus.enumValues)[number];

export type InvitationLifecycleStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

export const USER_ROLE_LABELS_UA: Record<UserRole, string> = {
  student: 'Студент',
  supervisor: 'Науковий керівник',
  admin: 'Адміністратор',
};

export const DEGREE_LEVEL_LABELS_UA: Record<DegreeLevel, string> = {
  bachelor: 'Бакалавр',
  master: 'Магістр',
  phd: 'Доктор філософії (PhD)',
};

export const ORG_UNIT_TYPE_LABELS_UA: Record<OrgUnitType, string> = {
  university: 'Університет',
  institute: 'Інститут',
  faculty: 'Факультет',
  department: 'Кафедра',
};

export const SUPERADMIN_OPTION_LABEL =
  'Головний адміністратор (увесь університет)';

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
  /** Формат для випадаючого списку в Excel-шаблоні */
  templateOption: string;
}

export interface CatalogOrgUnitItem {
  id: number;
  name: string;
  shortName: string | null;
  unitType: OrgUnitType;
  parentId: number | null;
  orgPath: string;
  /** Формат для випадаючого списку в Excel-шаблоні */
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

export interface UploadedSpreadsheetFile {
  buffer: Buffer;
  originalname: string;
  size?: number;
  mimetype?: string;
}
