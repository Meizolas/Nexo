import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { requestAuditContext } from '../../common/audit/request-audit-context.js';
import { ORGANIZATION_HEADER } from '../auth/auth.constants.js';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { CreateLegalDeadlineDto } from './dto/create-legal-deadline.dto.js';
import { ResolveLegalDeadlineDto } from './dto/resolve-legal-deadline.dto.js';
import { UpdateLegalDeadlineDto } from './dto/update-legal-deadline.dto.js';
import { LegalDeadlinesService } from './legal-deadlines.service.js';

@ApiTags('legal-deadlines')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('legal')
export class LegalDeadlinesController {
  constructor(private readonly deadlines: LegalDeadlinesService) {}
  @Get('deadlines/overdue')
  @RequirePermissions('legal.deadlines.read')
  overdue(@Req() req: Request) {
    return this.deadlines.list(req.organization.id, undefined, true);
  }
  @Get('cases/:caseId/deadlines')
  @RequirePermissions('legal.deadlines.read')
  list(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Req() req: Request,
  ) {
    return this.deadlines.list(req.organization.id, caseId);
  }
  @Post('cases/:caseId/deadlines')
  @RequirePermissions('legal.deadlines.create')
  create(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Body() body: CreateLegalDeadlineDto,
    @Req() req: Request,
  ) {
    return this.deadlines.create(
      req.organization.id,
      caseId,
      body,
      requestAuditContext(req),
    );
  }
  @Patch('cases/:caseId/deadlines/:id')
  @RequirePermissions('legal.deadlines.update')
  update(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateLegalDeadlineDto,
    @Req() req: Request,
  ) {
    return this.deadlines.update(
      req.organization.id,
      caseId,
      id,
      body,
      requestAuditContext(req),
    );
  }
  @Post('cases/:caseId/deadlines/:id/resolve')
  @RequirePermissions('legal.deadlines.resolve')
  resolve(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ResolveLegalDeadlineDto,
    @Req() req: Request,
  ) {
    return this.deadlines.resolve(
      req.organization.id,
      caseId,
      id,
      req.auth.userId,
      body,
      requestAuditContext(req),
    );
  }
}
