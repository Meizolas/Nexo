import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { HearingsController } from './hearings.controller.js';
import { HearingsService } from './hearings.service.js';

@Module({
  imports: [AuditModule],
  controllers: [HearingsController],
  providers: [HearingsService],
})
export class HearingsModule {}
