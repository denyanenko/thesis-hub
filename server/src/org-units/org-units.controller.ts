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
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { OrgUnitsService } from './org-units.service.js';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto.js';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto.js';
import { MoveOrgUnitDto } from './dto/move-org-unit.dto.js';
import { DeactivateOrgUnitDto } from './dto/deactivate-org-unit.dto.js';
import { SetAllowedChildrenDto } from './dto/set-allowed-children.dto.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Auth('admin')
@Controller('org-units')
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  @Get('tree')
  getTree(
    @Req() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.orgUnitsService.getTree(
      req.user.sub,
      includeInactive === 'true',
    );
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrgUnitDto) {
    return this.orgUnitsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrgUnitDto,
  ) {
    return this.orgUnitsService.update(req.user.sub, id, dto);
  }

  @Patch(':id/parent')
  move(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveOrgUnitDto,
  ) {
    return this.orgUnitsService.move(req.user.sub, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeactivateOrgUnitDto,
  ) {
    return this.orgUnitsService.deactivate(req.user.sub, id, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orgUnitsService.activate(req.user.sub, id);
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.orgUnitsService.remove(req.user.sub, id);
    return { message: 'Підрозділ успішно видалено' };
  }

  @Put(':id/allowed-children')
  setAllowedChildren(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetAllowedChildrenDto,
  ) {
    return this.orgUnitsService.setAllowedChildren(req.user.sub, id, dto);
  }
}
