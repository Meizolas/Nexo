import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { LeasesController } from './leases.controller.js';
import { LeasesService } from './leases.service.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';

@Module({
  imports: [AuditModule],
  controllers: [PropertiesController, LeasesController],
  providers: [PropertiesService, LeasesService],
  exports: [PropertiesService, LeasesService],
})
export class RealEstateModule {}
