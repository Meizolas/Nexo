import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { CaseMovementsController } from './case-movements.controller.js';
import { CaseMovementsService } from './case-movements.service.js';

@Module({
  imports: [AuditModule],
  controllers: [CaseMovementsController],
  providers: [CaseMovementsService],
  exports: [CaseMovementsService],
})
export class CaseMovementsModule {}
