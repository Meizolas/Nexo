import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { LegalCasesController } from './legal-cases.controller.js';
import { LegalCasesService } from './legal-cases.service.js';

@Module({
  imports: [AuditModule],
  controllers: [LegalCasesController],
  providers: [LegalCasesService],
  exports: [LegalCasesService],
})
export class LegalCasesModule {}
