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
import { CreateLeaseDto, UpdateLeaseDto } from './dto/create-lease.dto.js';
import { EndLeaseDto } from './dto/end-lease.dto.js';
import { ListLeasesDto } from './dto/list-leases.dto.js';
import { LeasesService } from './leases.service.js';

@ApiTags('real-estate-leases')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('real-estate/leases')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Post()
  @RequirePermissions('real-estate.leases.create')
  create(@Body() input: CreateLeaseDto, @Req() request: Request) {
    return this.leases.create(
      request.organization.id,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('real-estate.leases.read')
  list(@Query() query: ListLeasesDto, @Req() request: Request) {
    return this.leases.list(request.organization.id, query);
  }

  @Get(':id')
  @RequirePermissions('real-estate.leases.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.leases.findOne(request.organization.id, id);
  }

  @Patch(':id')
  @RequirePermissions('real-estate.leases.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateLeaseDto,
    @Req() request: Request,
  ) {
    return this.leases.update(
      request.organization.id,
      id,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':id/activate')
  @RequirePermissions('real-estate.leases.activate')
  activate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.leases.activate(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }

  @Post(':id/cancel')
  @RequirePermissions('real-estate.leases.cancel')
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.leases.cancel(
      request.organization.id,
      id,
      requestAuditContext(request),
    );
  }

  @Post(':id/end')
  @RequirePermissions('real-estate.leases.end')
  end(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: EndLeaseDto,
    @Req() request: Request,
  ) {
    return this.leases.end(
      request.organization.id,
      id,
      input,
      requestAuditContext(request),
    );
  }
}
