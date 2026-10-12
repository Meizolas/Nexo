import { Controller, Get, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ORGANIZATION_HEADER } from '../auth/auth.constants.js';
import {
  AuthenticatedOnly,
  RequirePermissions,
} from '../auth/auth.decorators.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @AuthenticatedOnly()
  list(@Req() request: Request) {
    return this.organizations.listForUser(request.auth.userId);
  }

  @Get('current')
  @RequirePermissions('organization.read')
  @ApiHeader({
    name: ORGANIZATION_HEADER,
    description:
      'UUID de uma organização em que o usuário possui vínculo ativo.',
    required: true,
  })
  @ApiOkResponse({
    schema: {
      example: {
        id: '1d16dcf5-5337-43ca-a3dc-ca5d1d788c91',
        membershipId: 'e37084d1-1131-4fef-8210-1130e5ea5873',
        roles: ['LAWYER'],
      },
    },
  })
  getCurrent(@Req() request: Request) {
    return {
      id: request.organization.id,
      membershipId: request.organization.membershipId,
      roles: request.organization.roles,
    };
  }

  @Get('members')
  @RequirePermissions('organization.read')
  @ApiHeader({ name: ORGANIZATION_HEADER, required: true })
  listActiveMembers(@Req() request: Request) {
    return this.organizations.listActiveMembers(request.organization.id);
  }
}
