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
  Query,
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
import { DocumentsService } from './documents.service.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

@ApiTags('documents')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @RequirePermissions('documents.create')
  upload(
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: false }))
    file: Express.Multer.File | undefined,
    @Body() input: UploadDocumentDto,
    @Req() request: Request,
  ) {
    return this.documents.upload(
      request.organization.id,
      request.auth.userId,
      file,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('documents.read')
  list(@Query() query: ListDocumentsDto, @Req() request: Request) {
    return this.documents.list(request.organization.id, query);
  }

  @Post(':id/download-url')
  @RequirePermissions('documents.read')
  createDownloadUrl(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.documents.createDownloadUrl(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('documents.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.documents.remove(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }
}
