import { Module } from '@nestjs/common';
import { OrgUnitsModule } from '../org-units/org-units.module.js';
import { EducationalProgramsController } from './educational-programs.controller.js';
import { EducationalProgramsService } from './educational-programs.service.js';

@Module({
  imports: [OrgUnitsModule],
  controllers: [EducationalProgramsController],
  providers: [EducationalProgramsService],
  exports: [EducationalProgramsService],
})
export class EducationalProgramsModule {}
