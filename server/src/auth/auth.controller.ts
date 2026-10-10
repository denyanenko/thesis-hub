import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import ms from 'ms';
import { AppConfigService } from '../config/app-config.service.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = '/auth/refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  private setAuthCookies(res: Response, tokens: TokenPair) {
    const isProd = this.config.get('NODE_ENV') === 'production';

    const accessMaxAge = ms(this.config.get('JWT_ACCESS_EXPIRES_IN'));
    const refreshMaxAge = ms(this.config.get('REFRESH_TOKEN_EXPIRES_IN'));

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

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const tokens = await this.authService.login(dto, userAgent, ipAddress);
    this.setAuthCookies(res, tokens);
    return { message: 'Вхід виконано успішно' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh-токен відсутній');
    }
    const tokens = await this.authService.refresh(
      rawRefreshToken,
      userAgent,
      ipAddress,
    );
    this.setAuthCookies(res, tokens);
    return { message: 'Токени оновлено' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }
    this.clearAuthCookies(res);
    return { message: 'Вихід виконано' };
  }

  @Auth()
  @Get('profile')
  getProfile(@Req() req: any) {
    return {
      message: 'Ви маєте доступ до захищеного ресурсу',
      user: req.user,
    };
  }
}
