import { http } from './client';
import type { UserRole } from './auth';

/** Ідентифікатор запиту профілю */
export const PROFILE_KEY = ['profile'] as const;

export interface OrgUnit {
    id: number;
    name: string;
    shortName: string | null;
}

export interface UserProfile {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    patronymic: string | null;
    role: UserRole;
    student: {
        studentNumber: string;
        group: {
            id: number;
            name: string;
            enrollmentYear: number;
            educationalProgram: {
                id: number;
                name: string;
                degreeLevel: string;
                specialty: { code: string; name: string };
            };
        };
    } | null;
    supervisor: {
        academicDegree: string | null;
        academicTitle: string | null;
        position: string | null;
        orgUnit: OrgUnit;
    } | null;
    admin: {
        position: string | null;
        orgUnit: OrgUnit | null;
    } | null;
}

export async function fetchProfile(): Promise<UserProfile> {
    const { data } = await http.get<UserProfile>('/profile');
    return data;
}