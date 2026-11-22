import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { OrgHierarchyRulesService } from './org-hierarchy-rules.service.js';
import { ReplaceHierarchyRulesDto } from './dto/replace-hierarchy-rules.dto.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Auth('admin')
@Controller('org-hierarchy-rules')
export class OrgHierarchyRulesController {
  constructor(
    private readonly hierarchyRulesService: OrgHierarchyRulesService,
  ) {}

  @Get()
  getAll() {
    return this.hierarchyRulesService.getAll();
  }

  @Put()
  replaceAll(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ReplaceHierarchyRulesDto,
  ) {
    return this.hierarchyRulesService.replaceAll(req.user.sub, dto);
  }
}
