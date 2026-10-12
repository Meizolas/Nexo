import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';

@Module({
  imports: [AuditModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class RealEstateModule {}
