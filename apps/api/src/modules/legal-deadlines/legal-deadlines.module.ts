import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { LegalDeadlinesController } from './legal-deadlines.controller.js';
import { LegalDeadlinesService } from './legal-deadlines.service.js';

@Module({
  imports: [AuditModule],
  controllers: [LegalDeadlinesController],
  providers: [LegalDeadlinesService],
})
export class LegalDeadlinesModule {}
