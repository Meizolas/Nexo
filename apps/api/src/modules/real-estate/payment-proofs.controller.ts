import {
  Body,
  Controller,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Req,
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
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto.js';
import { PaymentProofsService } from './payment-proofs.service.js';

@ApiTags('real-estate-payment-proofs')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('real-estate/charges/:chargeId/payment-proofs')
export class PaymentProofsController {
  constructor(private readonly proofs: PaymentProofsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  @RequirePermissions('real-estate.payment-proofs.upload')
  upload(
    @Param('chargeId', new ParseUUIDPipe()) chargeId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: false }))
    file: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    return this.proofs.upload(
      request.organization.id,
      chargeId,
      request.auth.userId,
      file,
      requestAuditContext(request),
    );
  }

  @Post(':proofId/review')
  @RequirePermissions('real-estate.payment-proofs.review')
  review(
    @Param('chargeId', new ParseUUIDPipe()) chargeId: string,
    @Param('proofId', new ParseUUIDPipe()) proofId: string,
    @Body() input: ReviewPaymentProofDto,
    @Req() request: Request,
  ) {
    return this.proofs.review(
      request.organization.id,
      chargeId,
      proofId,
      request.auth.userId,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':proofId/download-url')
  @RequirePermissions('real-estate.payment-proofs.read')
  download(
    @Param('chargeId', new ParseUUIDPipe()) chargeId: string,
    @Param('proofId', new ParseUUIDPipe()) proofId: string,
    @Req() request: Request,
  ) {
    return this.proofs.createDownloadUrl(
      request.organization.id,
      chargeId,
      proofId,
      requestAuditContext(request),
    );
  }
}
