import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupsService } from './groups.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Академічні групи')
@Auth('admin')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'Отримати список академічних груп у межах зони відповідальності',
    description:
      'Для головного адміністратора повертає всі академічні групи університету; для адміністратора підрозділу — групи освітніх програм кафедр у межах його піддерева.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Включити архівні (деактивовані / випущені) групи',
  })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.groupsService.findAll(req.user.sub, includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Отримати детальну інформацію про академічну групу',
  })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.findOne(req.user.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Створити нову академічну групу',
  })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Редагувати академічну групу',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(req.user.sub, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Перевести академічну групу в архів (деактивувати / випустити)',
  })
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.deactivate(req.user.sub, id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Повторно активувати архівну академічну групу',
  })
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.activate(req.user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Видалити порожню академічну групу',
  })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.groupsService.remove(req.user.sub, id);
    return { message: 'Академічну групу успішно видалено' };
  }
}
