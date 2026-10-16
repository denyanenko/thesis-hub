import { QueryClient } from '@tanstack/react-query';
import { ME_KEY } from './auth.ts';
import { setSessionExpiredHandler } from './client.ts';

export const queryClient = new QueryClient();

// Коли axios остаточно не зміг оновити токен, скидаємо «поточного користувача» в кеші
setSessionExpiredHandler(() => queryClient.setQueryData(ME_KEY, null));