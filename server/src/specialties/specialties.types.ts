import type { AdminActor } from '../org-units/org-units.types.js';

export const SPECIALTY_PROGRAMS_ACTIONS = ['keep', 'clone'] as const;
export type SpecialtyProgramsAction =
  (typeof SPECIALTY_PROGRAMS_ACTIONS)[number];

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
  /** Фінальна спеціальність у ланцюжку замін (наприклад, для A → B → C це C) */
  currentReplacement: SpecialtyRef | null;
  /** Попередні спеціальності, які безпосередньо були замінені цією */
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

export interface ReplaceSpecialtyResponse {
  source: SpecialtyRef;
  target: SpecialtyRef;
  programsAction: SpecialtyProgramsAction;
  clonedProgramsCount: number;
  linkedExistingProgramsCount: number;
}
