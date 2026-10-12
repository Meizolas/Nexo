export interface AuthenticatedPrincipal {
  userId: string;
  email?: string;
  assuranceLevel?: 'aal1' | 'aal2';
  authenticationMethods: string[];
  sessionId?: string;
}

export interface AuthTokenVerifier {
  verify(accessToken: string): Promise<AuthenticatedPrincipal>;
}

export interface OrganizationContext {
  id: string;
  membershipId: string;
  roles: string[];
  grants: Array<{ permission: string; effect: 'ALLOW' | 'DENY' }>;
  platformRole: 'USER' | 'SUPER_ADMIN';
}
