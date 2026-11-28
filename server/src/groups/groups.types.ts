import type {
  DegreeLevel,
  ProgramDepartmentRef,
  ProgramSpecialtyRef,
} from '../educational-programs/educational-programs.types.js';
import type { AdminActor } from '../org-units/org-units.types.js';

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
