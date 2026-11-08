import { http } from './client';

/** Ключ, під яким «поточний користувач» лежить у кеші TanStack Query */
export const ME_KEY = ['me'] as const;

export type UserRole = 'student' | 'supervisor' | 'admin';

export interface AuthUser {
    id: number;
    email: string;
    role: UserRole;
}

interface MeResponse {
    user: { sub: number; email: string; role: UserRole; iat: number; exp: number };
}

export async function login(email: string, password: string) {
    await http.post('/auth/login', { email, password });
}

export async function logout() {
    await http.post('/auth/logout');
}

export async function fetchMe(): Promise<AuthUser> {
    const { data } = await http.get<MeResponse>('/auth/me');
    const { user } = data;
    return { id: user.sub, email: user.email, role: user.role };
}
