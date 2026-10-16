import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

// Має збігатися з API_PREFIX у бекенді (src/config/api.constants.ts)
export const http = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Ці шляхи можуть відповісти 401 «за змістом» (невірний пароль тощо)
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

let refreshPromise: Promise<unknown> | null = null;
let onSessionExpired: (() => void) | null = null;

/** Сюди реєструється колбек, який скидає користувача, коли refresh остаточно не вдався. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
    onSessionExpired = handler;
}

function toApiError(error: AxiosError<{ message?: string | string[] }>): ApiError {
    if (!error.response) return new ApiError(0, 'Не вдалося зʼєднатися із сервером');
    const message = error.response.data?.message;
    return new ApiError(
        error.response.status,
        Array.isArray(message)
            ? message.join('\n') // NestJS повертає масив рядків при помилках валідації
            : (message ?? `Помилка запиту (${error.response.status})`),
    );
}

interface RetriableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ message?: string | string[] }>) => {
        const original = error.config as RetriableConfig | undefined;

        const canRefresh =
            error.response?.status === 401 &&
            original !== undefined &&
            !original._retry &&
            !NO_REFRESH.includes(original.url ?? '');

        if (canRefresh) {
            original._retry = true;
            refreshPromise ??= http.post('/auth/refresh').finally(() => {
                refreshPromise = null;
            });

            let refreshed = false;
            try {
                await refreshPromise;
                refreshed = true;
            } catch {
                onSessionExpired?.();
            }
            if (refreshed) return http(original); // повторюємо запит із новими cookie
        }

        return Promise.reject(toApiError(error));
    },
);