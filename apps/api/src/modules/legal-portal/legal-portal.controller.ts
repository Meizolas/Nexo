import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  ParseFilePipeBuilder,
  UploadedFile,
  UseInterceptors,
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
import { ManagePartyLinkDto } from './dto/manage-party-link.dto.js';
import { CreateLegalServiceRequestDto } from './dto/create-legal-service-request.dto.js';
import { LegalPortalService } from './legal-portal.service.js';

@ApiTags('legal-portal')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('portal/legal')
export class LegalPortalController {
  constructor(private readonly portal: LegalPortalService) {}

  @Get('cases')
  @RequirePermissions('portal.legal.read')
  listCases(@Req() request: Request) {
    return this.portal.listCases(request.organization.id, request.auth.userId);
  }

  @Post('documents/:documentId/download-url')
  @RequirePermissions('portal.legal.read')
  createDocumentDownloadUrl(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Req() request: Request,
  ) {
    return this.portal.createDocumentDownloadUrl(
      request.organization.id,
      request.auth.userId,
      documentId,
      requestAuditContext(request),
    );
  }

  @Post('cases/:caseId/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @RequirePermissions('portal.legal.documents.upload')
  uploadClientDocument(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: false }))
    file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    return this.portal.uploadClientDocument(
      request.organization.id,
      request.auth.userId,
      caseId,
      file,
      requestAuditContext(request),
    );
  }

  @Post('cases/:caseId/service-requests')
  @RequirePermissions('portal.legal.service-requests.create')
  createServiceRequest(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Body() input: CreateLegalServiceRequestDto,
    @Req() request: Request,
  ) {
    return this.portal.createServiceRequest(
      request.organization.id,
      request.auth.userId,
      caseId,
      input,
      requestAuditContext(request),
    );
  }

  @Post('party-links')
  @RequirePermissions('legal.portal-access.manage')
  grantPartyAccess(@Body() input: ManagePartyLinkDto, @Req() request: Request) {
    return this.portal.grantPartyAccess(
      request.organization.id,
      request.auth.userId,
      input,
      requestAuditContext(request),
    );
  }

  @Get('party-links')
  @RequirePermissions('legal.portal-access.manage')
  listPartyAccess(@Req() request: Request) {
    return this.portal.listPartyAccess(request.organization.id);
  }

  @Delete('party-links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('legal.portal-access.manage')
  revokePartyAccess(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.portal.revokePartyAccess(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }
}
