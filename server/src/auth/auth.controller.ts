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
import { AuthService, type JwtPayload, type TokenPair } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
import { TokenActionDto } from './dto/token-action.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { AppConfigService } from '../config/app-config.service.js';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from './auth-cookies.util.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  private setAuthCookies(res: Response, tokens: TokenPair) {
    setAuthCookies(res, tokens, this.config);
  }

  private clearAuthCookies(res: Response) {
    clearAuthCookies(res);
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

  // @Auth() стоїть НИЖЧЕ за @UseGuards(ThrottlerGuard), бо декоратори застосовуються знизу вгору:
  // так JwtAuthGuard виконується першим, і ThrottlerGuard бачить req.user.sub
  @UseGuards(ThrottlerGuard)
  @Throttle({
    account: { ttl: minutes(5), limit: 5 },
    ip: { ttl: minutes(5), limit: 30 },
  })
  @Auth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const tokens = await this.authService.changePassword(
      req.user.sub,
      dto,
      userAgent,
      ipAddress,
    );
    this.setAuthCookies(res, tokens);
    return {
      message:
        'Пароль успішно змінено. Усі інші активні сеанси завершено.',
    };
  }

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 15 },
  })
  @Post('emergency-password-lock')
  @HttpCode(HttpStatus.OK)
  async emergencyPasswordLock(
    @Body() dto: TokenActionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { resetToken } = await this.authService.emergencyLockPassword(
      dto.token,
    );
    this.clearAuthCookies(res);
    return {
      resetToken,
      message:
        'Усі сеанси завершено, а поточний пароль заблоковано. Встановіть новий пароль.',
    };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({
    account: { ttl: minutes(5), limit: 3 },
    ip: { ttl: minutes(5), limit: 20 },
  })
  @Auth()
  @Post('change-email/request')
  @HttpCode(HttpStatus.OK)
  async requestEmailChange(
    @Body() dto: RequestEmailChangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.authService.requestEmailChange(req.user.sub, dto);
    return {
      message: `Лист із посиланням для підтвердження надіслано на ${dto.newEmail}`,
    };
  }

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 15 },
  })
  @Post('change-email/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmEmailChange(
    @Body() dto: TokenActionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.confirmEmailChange(dto.token);
    this.clearAuthCookies(res);
    return {
      message:
        'Електронну пошту успішно змінено. Увійдіть із новою адресою.',
    };
  }

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 15 },
  })
  @Post('change-email/revert')
  @HttpCode(HttpStatus.OK)
  async revertEmailChange(
    @Body() dto: TokenActionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { resetToken } = await this.authService.revertEmailChange(dto.token);
    this.clearAuthCookies(res);
    return {
      resetToken,
      message:
        'Попередню електронну пошту повернуто, усі сеанси завершено. Встановіть новий пароль.',
    };
  }

  @Auth()
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return {
      user: req.user,
    };
  }
}
