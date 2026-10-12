import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY, REQUIRE_MFA_KEY } from '../auth.constants.js';

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const isAdministrator =
      request.organization?.roles.includes('ORG_ADMIN') ||
      request.organization?.platformRole === 'SUPER_ADMIN';
    const requiresMfa =
      isAdministrator ||
      this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (requiresMfa && request.auth.assuranceLevel !== 'aal2') {
      throw new ForbiddenException({
        code: 'MFA_REQUIRED',
        message: 'Autenticação multifator necessária.',
      });
    }

    return true;
  }
}
