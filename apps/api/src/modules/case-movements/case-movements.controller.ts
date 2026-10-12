import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CaseMovementsService } from './case-movements.service.js';
import { CreateCaseMovementDto } from './dto/create-case-movement.dto.js';
import { ListCaseMovementsDto } from './dto/list-case-movements.dto.js';
import { PublishCaseMovementDto } from './dto/publish-case-movement.dto.js';
import { UpdateCaseMovementDto } from './dto/update-case-movement.dto.js';

@ApiTags('case-movements')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('legal/cases/:caseId/movements')
export class CaseMovementsController {
  constructor(private readonly movements: CaseMovementsService) {}

  @Post()
  @RequirePermissions('legal.movements.create')
  create(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Body() input: CreateCaseMovementDto,
    @Req() request: Request,
  ) {
    return this.movements.create(
      request.organization.id,
      caseId,
      request.auth.userId,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('legal.movements.read')
  list(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Query() query: ListCaseMovementsDto,
    @Req() request: Request,
  ) {
    return this.movements.list(request.organization.id, caseId, query);
  }

  @Patch(':id')
  @RequirePermissions('legal.movements.update')
  update(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateCaseMovementDto,
    @Req() request: Request,
  ) {
    return this.movements.update(
      request.organization.id,
      caseId,
      id,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':id/publish')
  @RequirePermissions('legal.movements.publish')
  publish(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: PublishCaseMovementDto,
    @Req() request: Request,
  ) {
    return this.movements.publish(
      request.organization.id,
      caseId,
      id,
      request.auth.userId,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':id/unpublish')
  @RequirePermissions('legal.movements.publish')
  unpublish(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.movements.unpublish(
      request.organization.id,
      caseId,
      id,
      requestAuditContext(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('legal.movements.delete')
  remove(
    @Param('caseId', new ParseUUIDPipe()) caseId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.movements.remove(
      request.organization.id,
      caseId,
      id,
      requestAuditContext(request),
    );
  }
}
