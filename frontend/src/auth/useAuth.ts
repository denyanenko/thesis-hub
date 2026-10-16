import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { ME_KEY } from '../api/auth';
import { ApiError } from '../api/client';

// Гість це нормальний стан, а не помилка, тому 401 перетворюємо на null
async function fetchMe() {
    try {
        return await authApi.fetchProfile();
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
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const login = async (email: string, password: string) => {
        await authApi.login(email, password);
        queryClient.setQueryData(ME_KEY, await authApi.fetchProfile());
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } finally {
            queryClient.setQueryData(ME_KEY, null);
        }
    };

    return { user: data ?? null, loading: isPending, login, logout };
}