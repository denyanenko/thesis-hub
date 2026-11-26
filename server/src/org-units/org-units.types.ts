import { orgUnitType } from '../database/schema.js';

export type OrgUnitType = (typeof orgUnitType.enumValues)[number];

export const ORG_UNIT_TYPES: readonly OrgUnitType[] = orgUnitType.enumValues;

export const ORG_UNIT_TYPE_LABELS: Record<OrgUnitType, string> = {
  university: 'Університет',
  institute: 'Інститут',
  faculty: 'Факультет',
  department: 'Кафедра',
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

export function getPgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  if ('code' in err && typeof err.code === 'string') return err.code;
  if ('cause' in err && err.cause && typeof err.cause === 'object') {
    const cause = err.cause as { code?: unknown };
    if (typeof cause.code === 'string') return cause.code;
  }
  return undefined;
}

export function getPgErrorMessage(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  if ('cause' in err && err.cause && typeof err.cause === 'object') {
    const cause = err.cause as { message?: unknown };
    if (typeof cause.message === 'string') return cause.message;
  }
  if ('message' in err && typeof err.message === 'string') return err.message;
  return undefined;
}

export function formatParentTypeLabel(parentType: OrgUnitType | null): string {
  return parentType ? ORG_UNIT_TYPE_LABELS[parentType] : 'кореневого рівня';
}
