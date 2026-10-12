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
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { ListPropertiesDto } from './dto/list-properties.dto.js';
import { ManageOwnerDto } from './dto/manage-owner.dto.js';
import { PropertiesService } from './properties.service.js';

@ApiTags('real-estate-properties')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('real-estate/properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Post()
  @RequirePermissions('real-estate.properties.create')
  create(@Body() input: CreatePropertyDto, @Req() request: Request) {
    return this.properties.create(
      request.organization.id,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('real-estate.properties.read')
  list(@Query() query: ListPropertiesDto, @Req() request: Request) {
    return this.properties.list(request.organization.id, query);
  }

  @Get(':id')
  @RequirePermissions('real-estate.properties.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.properties.findOne(request.organization.id, id);
  }

  @Post(':propertyId/units')
  @RequirePermissions('real-estate.units.create')
  createUnit(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Body() input: CreateUnitDto,
    @Req() request: Request,
  ) {
    return this.properties.createUnit(
      request.organization.id,
      propertyId,
      input,
      requestAuditContext(request),
    );
  }

  @Post(':propertyId/owners')
  @RequirePermissions('real-estate.ownership.manage')
  addOwner(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Body() input: ManageOwnerDto,
    @Req() request: Request,
  ) {
    return this.properties.addOwner(
      request.organization.id,
      propertyId,
      input,
      requestAuditContext(request),
    );
  }

  @Patch(':propertyId/owners/:ownershipId/end')
  @RequirePermissions('real-estate.ownership.manage')
  endOwner(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Param('ownershipId', new ParseUUIDPipe()) ownershipId: string,
    @Req() request: Request,
  ) {
    return this.properties.endOwner(
      request.organization.id,
      propertyId,
      ownershipId,
      requestAuditContext(request),
    );
  }
}
