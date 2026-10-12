import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { LegalPortalController } from './legal-portal.controller.js';
import { LegalPortalService } from './legal-portal.service.js';

@Module({
  imports: [AuditModule, DocumentsModule, NotificationsModule],
  controllers: [LegalPortalController],
  providers: [LegalPortalService],
})
export class LegalPortalModule {}
