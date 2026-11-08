import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { ME_KEY } from '../api/auth';
import { ApiError } from '../api/client';
import { AUTH_STALE_TIME_MS } from '../config';

let manualLogout = false;
export const isManualLogout = () => manualLogout;

// Перетворення помилки 401 (Unauthorized) на null для коректної обробки неавторизованого стану (guest state)
async function fetchMe() {
    try {
        return await authApi.fetchMe();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}

export function useAuth() {
    const queryClient = useQueryClient();

    const { data, isPending } = useQuery({
        queryKey: ME_KEY,
        queryFn: fetchMe,
        retry: false,
        staleTime: AUTH_STALE_TIME_MS,
        refetchOnWindowFocus: false,
    });

    const login = async (email: string, password: string) => {
        await authApi.login(email, password);
        queryClient.setQueryData(ME_KEY, await authApi.fetchMe());
        manualLogout = false;
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            manualLogout = true;
            queryClient.setQueryData(ME_KEY, null);
        }
    };

    return { user: data ?? null, loading: isPending, login, logout };
}
