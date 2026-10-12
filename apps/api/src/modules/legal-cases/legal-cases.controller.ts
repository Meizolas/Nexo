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
import { CreateLegalCaseDto } from './dto/create-legal-case.dto.js';
import { ListLegalCasesDto } from './dto/list-legal-cases.dto.js';
import { UpdateLegalCaseDto } from './dto/update-legal-case.dto.js';
import { LegalCasesService } from './legal-cases.service.js';

@ApiTags('legal-cases')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('legal/cases')
export class LegalCasesController {
  constructor(private readonly legalCases: LegalCasesService) {}

  @Post()
  @RequirePermissions('legal.cases.create')
  create(@Body() input: CreateLegalCaseDto, @Req() request: Request) {
    return this.legalCases.create(
      request.organization.id,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('legal.cases.read')
  list(@Query() query: ListLegalCasesDto, @Req() request: Request) {
    return this.legalCases.list(request.organization.id, query);
  }

  @Get('lawyers')
  @RequirePermissions('legal.cases.read')
  listLawyers(@Req() request: Request) {
    return this.legalCases.listLawyers(request.organization.id);
  }

  @Get(':id')
  @RequirePermissions('legal.cases.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.legalCases.findOne(request.organization.id, id);
  }

  @Patch(':id')
  @RequirePermissions('legal.cases.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateLegalCaseDto,
    @Req() request: Request,
  ) {
    return this.legalCases.update(
      request.organization.id,
      id,
      input,
      requestAuditContext(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('legal.cases.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.legalCases.remove(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }
}
