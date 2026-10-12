import {
  createRemoteJWKSet,
  jwtVerify,
  JWTPayload,
  JWTVerifyGetKey,
} from 'jose';
import { AuthenticatedPrincipal, AuthTokenVerifier } from './auth.types.js';

interface AuthenticationMethod {
  method?: unknown;
}

export class SupabaseJwtVerifier implements AuthTokenVerifier {
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    jwks?: JWTVerifyGetKey,
  ) {
    const normalizedIssuer = issuer.replace(/\/$/, '');
    this.jwks =
      jwks ??
      createRemoteJWKSet(new URL(`${normalizedIssuer}/.well-known/jwks.json`));
  }

  async verify(accessToken: string): Promise<AuthenticatedPrincipal> {
    const { payload } = await jwtVerify(accessToken, this.jwks, {
      audience: this.audience,
      issuer: this.issuer,
    });

    return this.toPrincipal(payload);
  }

  private toPrincipal(payload: JWTPayload): AuthenticatedPrincipal {
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('JWT subject is missing');
    }

    const assuranceLevel =
      payload.aal === 'aal1' || payload.aal === 'aal2'
        ? payload.aal
        : undefined;
    const authenticationMethods = Array.isArray(payload.amr)
      ? payload.amr
          .map((entry: AuthenticationMethod) => entry.method)
          .filter((method): method is string => typeof method === 'string')
      : [];

    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      assuranceLevel,
      authenticationMethods,
      sessionId:
        typeof payload.session_id === 'string' ? payload.session_id : undefined,
    };
  }
}
