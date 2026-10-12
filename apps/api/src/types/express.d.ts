import {
  AuthenticatedPrincipal,
  OrganizationContext,
} from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      auth: AuthenticatedPrincipal;
      organization: OrganizationContext;
    }
  }
}

export {};
