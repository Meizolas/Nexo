import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../../database/prisma.service.js';
import {
  IS_PUBLIC_KEY,
  ORGANIZATION_HEADER,
  SKIP_ORGANIZATION_KEY,
} from '../auth.constants.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.shouldSkip(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = this.readOrganizationId(request);

    if (!organizationId) {
      throw new BadRequestException({
        code: 'ORGANIZATION_REQUIRED',
        message: 'Organização ativa não informada.',
      });
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: request.auth.userId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE', deletedAt: null },
        user: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        grants: { select: { effect: true, permission: true } },
        roles: { select: { role: true } },
        user: { select: { platformRole: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Recurso não encontrado.',
      });
    }

    request.organization = {
      id: organizationId,
      membershipId: membership.id,
      roles: membership.roles.map(({ role }) => role),
      grants: membership.grants,
      platformRole: membership.user.platformRole,
    };

    return true;
  }

  private shouldSkip(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_ORGANIZATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }

  private readOrganizationId(request: Request): string | undefined {
    const value = request.headers[ORGANIZATION_HEADER];
    const candidate = Array.isArray(value) ? value[0] : value;
    return typeof candidate === 'string' && UUID_PATTERN.test(candidate)
      ? candidate
      : undefined;
  }
}
