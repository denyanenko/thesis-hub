import { degreeLevel } from '../database/schema.js';
import type { AdminActor } from '../org-units/org-units.types.js';

export type DegreeLevel = (typeof degreeLevel.enumValues)[number];

export const DEGREE_LEVELS: readonly DegreeLevel[] = degreeLevel.enumValues;

export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
  bachelor: 'Бакалавр',
  master: 'Магістр',
  phd: 'Доктор філософії (PhD)',
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

export interface ReplaceEducationalProgramResponse {
  source: ProgramRef;
  target: ProgramRef;
}
