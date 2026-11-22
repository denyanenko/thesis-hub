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

interface MessageResponse {
    message: string;
}

interface ResetTokenResponse {
    resetToken: string;
    message: string;
}

export async function login(email: string, password: string) {
    await http.post('/auth/login', { email, password });
}

export async function logout() {
    await http.post('/auth/logout');
}

export async function forgotPassword(email: string): Promise<string> {
    const { data } = await http.post<MessageResponse>('/auth/forgot-password', { email });
    return data.message;
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
    const { data } = await http.post<MessageResponse>('/auth/reset-password', {
        token,
        newPassword,
    });
    return data.message;
}

export async function changePassword(
    currentPassword: string,
    newPassword: string,
): Promise<string> {
    const { data } = await http.post<MessageResponse>('/auth/change-password', {
        currentPassword,
        newPassword,
    });
    return data.message;
}

export async function emergencyPasswordLock(token: string): Promise<ResetTokenResponse> {
    const { data } = await http.post<ResetTokenResponse>('/auth/emergency-password-lock', {
        token,
    });
    return data;
}

export async function requestEmailChange(
    newEmail: string,
    currentPassword: string,
): Promise<string> {
    const { data } = await http.post<MessageResponse>('/auth/change-email/request', {
        newEmail,
        currentPassword,
    });
    return data.message;
}

export async function confirmEmailChange(token: string): Promise<string> {
    const { data } = await http.post<MessageResponse>('/auth/change-email/confirm', {
        token,
    });
    return data.message;
}

export async function revertEmailChange(token: string): Promise<ResetTokenResponse> {
    const { data } = await http.post<ResetTokenResponse>('/auth/change-email/revert', {
        token,
    });
    return data;
}

export async function fetchMe(): Promise<AuthUser> {
    const { data } = await http.get<MeResponse>('/auth/me');
    const { user } = data;
    return { id: user.sub, email: user.email, role: user.role };
}
