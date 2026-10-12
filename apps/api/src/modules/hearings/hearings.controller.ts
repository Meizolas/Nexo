import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { requestAuditContext } from '../../common/audit/request-audit-context.js';
import { ORGANIZATION_HEADER } from '../auth/auth.constants.js';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { CreateHearingDto } from './dto/create-hearing.dto.js';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto.js';
import { HearingsService } from './hearings.service.js';

@ApiTags('hearings')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('legal/cases/:caseId/hearings')
export class HearingsController {
  constructor(private readonly hearings: HearingsService) {}

  @Get()
  @RequirePermissions('legal.hearings.read')
  list(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Req() request: Request,
  ) {
    return this.hearings.list(request.organization.id, caseId);
  }

  @Post()
  @RequirePermissions('legal.hearings.create')
  create(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Body() input: CreateHearingDto,
    @Req() request: Request,
  ) {
    return this.hearings.create(
      request.organization.id,
      caseId,
      input,
      requestAuditContext(request),
    );
  }

  @Patch(':id/status')
  @RequirePermissions('legal.hearings.update')
  updateStatus(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateHearingStatusDto,
    @Req() request: Request,
  ) {
    return this.hearings.updateStatus(
      request.organization.id,
      caseId,
      id,
      input,
      requestAuditContext(request),
    );
  }
}
