import { Module } from '@nestjs/common';
import { OrgUnitsModule } from '../org-units/org-units.module.js';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';

@Module({
  imports: [OrgUnitsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
