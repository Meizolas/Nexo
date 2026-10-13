import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ChargesController } from './charges.controller.js';
import { ChargesService } from './charges.service.js';
import { LeasesController } from './leases.controller.js';
import { LeasesService } from './leases.service.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { PaymentProofsController } from './payment-proofs.controller.js';
import { PaymentProofsService } from './payment-proofs.service.js';

@Module({
  imports: [AuditModule, DocumentsModule],
  controllers: [
    PropertiesController,
    LeasesController,
    ChargesController,
    PaymentProofsController,
  ],
  providers: [
    PropertiesService,
    LeasesService,
    ChargesService,
    PaymentProofsService,
  ],
  exports: [PropertiesService, LeasesService, ChargesService],
})
export class RealEstateModule {}
