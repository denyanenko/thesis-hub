import { Module } from '@nestjs/common';
import { OrgScopeService } from './org-scope.service.js';
import { OrgUnitsService } from './org-units.service.js';
import { OrgHierarchyRulesService } from './org-hierarchy-rules.service.js';
import { OrgUnitsController } from './org-units.controller.js';
import { OrgHierarchyRulesController } from './org-hierarchy-rules.controller.js';

@Module({
  controllers: [OrgUnitsController, OrgHierarchyRulesController],
  providers: [OrgScopeService, OrgUnitsService, OrgHierarchyRulesService],
  exports: [OrgScopeService],
})
export class OrgUnitsModule {}
