import type { Response } from 'express';
import ms from 'ms';
import type { TokenPair } from './auth.service.js';
import type { AppConfigService } from '../config/app-config.service.js';
import { API_PREFIX } from '../config/api.constants.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_PATH = `/${API_PREFIX}/auth/refresh`;

export function setAuthCookies(
  res: Response,
  tokens: TokenPair,
  config: AppConfigService,
): void {
  const isProd = config.get('NODE_ENV') === 'production';

  const accessMaxAge = ms(config.get('JWT_ACCESS_EXPIRES_IN'));
  const refreshMaxAge = ms(config.get('REFRESH_TOKEN_EXPIRES_IN'));

  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: accessMaxAge,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: REFRESH_PATH,
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}
