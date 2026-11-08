import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { ProfileService } from './profile.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Auth()
  @Get()
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.profileService.getByUserId(req.user.sub);
  }
}
