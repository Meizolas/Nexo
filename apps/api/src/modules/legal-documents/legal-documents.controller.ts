import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { requestAuditContext } from '../../common/audit/request-audit-context.js';
import { ORGANIZATION_HEADER } from '../auth/auth.constants.js';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { UploadLegalDocumentDto } from './dto/upload-legal-document.dto.js';
import { LegalDocumentsService } from './legal-documents.service.js';

@ApiTags('legal-documents')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('legal/cases/:caseId/documents')
export class LegalDocumentsController {
  constructor(private readonly documents: LegalDocumentsService) {}

  @Get()
  @RequirePermissions('documents.read')
  list(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Req() request: Request,
  ) {
    return this.documents.list(request.organization.id, caseId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @RequirePermissions('documents.create')
  upload(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: false }))
    file: Express.Multer.File | undefined,
    @Body() input: UploadLegalDocumentDto,
    @Req() request: Request,
  ) {
    return this.documents.upload(
      request.organization.id,
      caseId,
      request.auth.userId,
      file,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':documentId/download-url')
  @RequirePermissions('documents.read')
  createDownloadUrl(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: Request,
  ) {
    return this.documents.createDownloadUrl(
      request.organization.id,
      caseId,
      documentId,
      requestAuditContext(request),
    );
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('documents.delete')
  remove(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: Request,
  ) {
    return this.documents.remove(
      request.organization.id,
      caseId,
      documentId,
      requestAuditContext(request),
    );
  }
}
