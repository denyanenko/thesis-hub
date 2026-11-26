import { Module } from '@nestjs/common';
import { OrgUnitsModule } from '../org-units/org-units.module.js';
import { SpecialtiesController } from './specialties.controller.js';
import { SpecialtiesService } from './specialties.service.js';

@Module({
  imports: [OrgUnitsModule],
  controllers: [SpecialtiesController],
  providers: [SpecialtiesService],
  exports: [SpecialtiesService],
})
export class SpecialtiesModule {}
