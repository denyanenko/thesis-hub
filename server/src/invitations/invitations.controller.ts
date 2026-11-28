import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  SkipThrottle,
  Throttle,
  ThrottlerGuard,
  minutes,
} from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { setAuthCookies } from '../auth/auth-cookies.util.js';
import type { JwtPayload, UserRole } from '../auth/auth.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { TokenActionDto } from '../auth/dto/token-action.dto.js';
import { AppConfigService } from '../config/app-config.service.js';
import { userRole } from '../database/schema.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import {
  BulkCreateInvitationsDto,
  BulkPreviewInvitationsDto,
} from './dto/bulk-invitations.dto.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto.js';
import { InvitationsService } from './invitations.service.js';
import type { UploadedSpreadsheetFile } from './invitations.types.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 МБ

function assertValidRoleParam(role: string | undefined): UserRole {
  if (!role || !(userRole.enumValues as readonly string[]).includes(role)) {
    throw new BadRequestException(
      'Параметр role є обовʼязковим і має бути одним із: student, supervisor, admin',
    );
  }
  return role as UserRole;
}

@ApiTags('Запрошення користувачів')
@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly config: AppConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Адміністративні ендпоїнти
  // ---------------------------------------------------------------------------

  @Auth('admin')
  @Get('catalog')
  @ApiOperation({
    summary: 'Отримати довідник доступних груп, кафедр та підрозділів',
    description:
      'Повертає активні сутності в межах зони відповідальності поточного адміністратора для заповнення форм та таблиць запрошень.',
  })
  getCatalog(@Req() req: AuthenticatedRequest) {
    return this.invitationsService.getCatalog(req.user.sub);
  }

  @Auth('admin')
  @Get('template')
  @ApiOperation({
    summary: 'Завантажити динамічний Excel-шаблон (.xlsx) для масового імпорту',
    description:
      'Генерує .xlsx-файл із випадаючими списками актуальних груп, кафедр або підрозділів відповідно до прав поточного адміністратора.',
  })
  @ApiQuery({
    name: 'role',
    required: true,
    enum: userRole.enumValues,
    description: 'Роль користувачів, для якої формується шаблон',
  })
  async downloadTemplate(
    @Req() req: AuthenticatedRequest,
    @Query('role') roleParam: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const role = assertValidRoleParam(roleParam);
    const { buffer, filename } = await this.invitationsService.generateTemplate(
      req.user.sub,
      role,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(buffer);
  }

  @Auth('admin')
  @Get()
  @ApiOperation({
    summary: 'Отримати реєстр запрошень у межах зони відповідальності',
  })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListInvitationsQueryDto,
  ) {
    return this.invitationsService.findAll(req.user.sub, query);
  }

  @Auth('admin')
  @Post()
  @ApiOperation({
    summary: 'Запросити одного користувача та надіслати лист із JWT-посиланням',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(req.user.sub, dto);
  }

  @Auth('admin')
  @Post('bulk/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Завантажити .xlsx або .csv файл для попередньої перевірки (dry-run)',
  })
  @ApiQuery({
    name: 'role',
    required: true,
    enum: userRole.enumValues,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  uploadAndPreview(
    @Req() req: AuthenticatedRequest,
    @Query('role') roleParam: string | undefined,
    @UploadedFile() file: UploadedSpreadsheetFile | undefined,
  ) {
    const role = assertValidRoleParam(roleParam);
    return this.invitationsService.previewUploadedFile(
      req.user.sub,
      role,
      file,
    );
  }

  @Auth('admin')
  @Post('bulk/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Перевірити масив рядків запрошень без створення записів (dry-run)',
  })
  previewBulk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkPreviewInvitationsDto,
  ) {
    return this.invitationsService.previewBulk(req.user.sub, dto);
  }

  @Auth('admin')
  @Post('bulk')
  @ApiOperation({
    summary: 'Масово створити та надіслати запрошення',
    description:
      'У гнучкому режимі (skipInvalid=true) створює та надсилає лише валідні рядки, повертаючи пропущені рядки з помилками для подальшого виправлення.',
  })
  createBulk(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkCreateInvitationsDto,
  ) {
    return this.invitationsService.createBulk(req.user.sub, dto);
  }

  @Auth('admin')
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Повторно надіслати лист-запрошення (перевипустити токен і подовжити термін дії)',
  })
  resend(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.invitationsService.resend(req.user.sub, id);
  }

  @Auth('admin')
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Відкликати невикористане запрошення',
  })
  revoke(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.invitationsService.revoke(req.user.sub, id);
  }

  // ---------------------------------------------------------------------------
  // Публічні ендпоїнти (для переходу користувача за посиланням із листа)
  // ---------------------------------------------------------------------------

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 30 },
  })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Перевірити JWT-токен запрошення та отримати дані для форми активації',
  })
  verify(@Body() dto: TokenActionDto) {
    return this.invitationsService.verifyInvitation(dto.token);
  }

  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ account: true })
  @Throttle({
    ip: { ttl: minutes(5), limit: 15 },
  })
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Прийняти запрошення, встановити пароль та автоматично увійти в систему',
  })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const { tokens, user } = await this.invitationsService.acceptInvitation(
      dto,
      userAgent,
      ipAddress,
    );
    setAuthCookies(res, tokens, this.config);
    return {
      message: 'Акаунт успішно активовано. Ласкаво просимо!',
      user,
    };
  }
}
