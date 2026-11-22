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
  UseGuards,
} from '@nestjs/common';
import {
  SkipThrottle,
  Throttle,
  ThrottlerGuard,
  minutes,
} from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import ms from 'ms';
import { AppConfigService } from '../config/app-config.service.js';
import { API_PREFIX } from '../config/api.constants.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_PATH = `/${API_PREFIX}/auth/refresh`;

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

  @UseGuards(ThrottlerGuard)
  @Throttle({
    account: { ttl: minutes(1), limit: 10 },
    ip: { ttl: minutes(1), limit: 60 },
  })
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

  @UseGuards(ThrottlerGuard)
  @Throttle({
    account: { ttl: minutes(5), limit: 3 },
    ip: { ttl: minutes(5), limit: 20 },
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      message:
        'Якщо акаунт із таким email існує, на нього надіслано інструкцію для відновлення пароля',
    };
  }

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 15 },
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.resetPassword(dto);
    this.clearAuthCookies(res);
    return { message: 'Пароль успішно змінено. Увійдіть із новим паролем.' };
  }

  @Auth()
  @Get('me')
  getMe(@Req() req: any) {
    return {
      user: req.user,
    };
  }
}
