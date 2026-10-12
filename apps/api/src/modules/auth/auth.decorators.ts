import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  AUTHENTICATED_ONLY_KEY,
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_MFA_KEY,
  SKIP_ORGANIZATION_KEY,
} from './auth.constants.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);
export const SkipOrganization = () => SetMetadata(SKIP_ORGANIZATION_KEY, true);
export const AuthenticatedOnly = () =>
  applyDecorators(
    SkipOrganization(),
    SetMetadata(AUTHENTICATED_ONLY_KEY, true),
  );
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
