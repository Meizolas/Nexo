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
import { CreatePartyDto } from './dto/create-party.dto.js';
import { ListPartiesDto } from './dto/list-parties.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import { PartiesService } from './parties.service.js';

@ApiTags('parties')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('parties')
export class PartiesController {
  constructor(private readonly parties: PartiesService) {}

  @Post()
  @RequirePermissions('parties.create')
  create(@Body() input: CreatePartyDto, @Req() request: Request) {
    return this.parties.create(
      request.organization.id,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('parties.read')
  list(@Query() query: ListPartiesDto, @Req() request: Request) {
    return this.parties.list(request.organization.id, query);
  }

  @Get(':id')
  @RequirePermissions('parties.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.parties.findOne(request.organization.id, id);
  }

  @Patch(':id')
  @RequirePermissions('parties.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdatePartyDto,
    @Req() request: Request,
  ) {
    return this.parties.update(
      request.organization.id,
      id,
      input,
      requestAuditContext(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('parties.delete')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.parties.remove(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }
}
