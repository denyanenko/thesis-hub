import { useQuery } from '@tanstack/react-query';
import { fetchProfile, PROFILE_KEY } from '../api/profile';
import { useAuth } from './useAuth';

export function useProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: PROFILE_KEY,
        queryFn: fetchProfile,
        enabled: !!user, // гість не робить запит
        retry: false,
        gcTime: 0, // дані не зберігаються після закриття сторінки
    });
}