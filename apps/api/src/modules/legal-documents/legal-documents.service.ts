import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { RecordAuditEventInput } from '../audit/audit.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { ListDocumentsDto } from '../documents/dto/list-documents.dto.js';
import { UploadDocumentDto } from '../documents/dto/upload-document.dto.js';
import { UploadLegalDocumentDto } from './dto/upload-legal-document.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;
const CASE_CONTEXT = 'LEGAL_CASE';

@Injectable()
export class LegalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  async list(organizationId: string, caseId: string) {
    await this.assertCase(organizationId, caseId);
    const query = Object.assign(new ListDocumentsDto(), {
      contextType: CASE_CONTEXT,
      contextId: caseId,
      page: 1,
      pageSize: 100,
    });
    return this.documents.list(organizationId, query);
  }

  async upload(
    organizationId: string,
    caseId: string,
    userId: string,
    file: Express.Multer.File | undefined,
    input: UploadLegalDocumentDto,
    auditContext: AuditContext,
  ) {
    await this.assertCase(organizationId, caseId);
    const documentInput = Object.assign(new UploadDocumentDto(), {
      visibility: input.visibility,
      contextType: CASE_CONTEXT,
      contextId: caseId,
    });
    return this.documents.upload(
      organizationId,
      userId,
      file,
      documentInput,
      auditContext,
    );
  }

  async createDownloadUrl(
    organizationId: string,
    caseId: string,
    documentId: string,
    auditContext: AuditContext,
  ) {
    await this.findCaseDocument(organizationId, caseId, documentId);
    return this.documents.createDownloadUrl(
      organizationId,
      documentId,
      auditContext,
    );
  }

  async remove(
    organizationId: string,
    caseId: string,
    documentId: string,
    auditContext: AuditContext,
  ) {
    await this.findCaseDocument(organizationId, caseId, documentId);
    return this.documents.remove(organizationId, documentId, auditContext);
  }

  private async assertCase(organizationId: string, caseId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: { id: caseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!legalCase) throw this.notFound();
  }

  private async findCaseDocument(
    organizationId: string,
    caseId: string,
    documentId: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
        contextType: CASE_CONTEXT,
        contextId: caseId,
        status: DocumentStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!document) throw this.notFound();
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Processo ou documento não encontrado.',
    });
  }
}
