import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  AUTHENTICATED_ONLY_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../auth.constants.js';
import { hasPermission } from '../permissions.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isAuthenticatedOnly = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAuthenticatedOnly) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      throw new ForbiddenException({
        code: 'PERMISSION_POLICY_MISSING',
        message: 'Acesso não autorizado.',
      });
    }

    const { organization } = context.switchToHttp().getRequest<Request>();
    const isAllowed = requiredPermissions.every((permission) =>
      hasPermission(organization.roles, organization.grants, permission),
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: 'ACCESS_DENIED',
        message: 'Acesso não autorizado.',
      });
    }

    return true;
  }
}
