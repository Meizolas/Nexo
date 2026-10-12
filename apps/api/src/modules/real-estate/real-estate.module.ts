import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ChargesController } from './charges.controller.js';
import { ChargesService } from './charges.service.js';
import { LeasesController } from './leases.controller.js';
import { LeasesService } from './leases.service.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';

@Module({
  imports: [AuditModule],
  controllers: [PropertiesController, LeasesController, ChargesController],
  providers: [PropertiesService, LeasesService, ChargesService],
  exports: [PropertiesService, LeasesService, ChargesService],
})
export class RealEstateModule {}
