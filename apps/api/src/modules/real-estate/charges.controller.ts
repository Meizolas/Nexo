import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { requestAuditContext } from '../../common/audit/request-audit-context.js';
import { ORGANIZATION_HEADER } from '../auth/auth.constants.js';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { ChargesService } from './charges.service.js';
import { GenerateChargesDto } from './dto/generate-charges.dto.js';
import { ListChargesDto } from './dto/list-charges.dto.js';

@ApiTags('real-estate-charges')
@ApiBearerAuth()
@ApiHeader({ name: ORGANIZATION_HEADER, required: true })
@Controller('real-estate/charges')
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Post('generate')
  @RequirePermissions('real-estate.charges.generate')
  generate(@Body() input: GenerateChargesDto, @Req() request: Request) {
    return this.charges.generate(
      request.organization.id,
      input,
      requestAuditContext(request),
    );
  }

  @Get()
  @RequirePermissions('real-estate.charges.read')
  list(@Query() query: ListChargesDto, @Req() request: Request) {
    return this.charges.list(request.organization.id, query);
  }

  @Get(':id')
  @RequirePermissions('real-estate.charges.read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    return this.charges.findOne(request.organization.id, id);
  }
}
