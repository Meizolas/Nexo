import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { LegalDocumentsController } from './legal-documents.controller.js';
import { LegalDocumentsService } from './legal-documents.service.js';

@Module({
  imports: [DocumentsModule],
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
