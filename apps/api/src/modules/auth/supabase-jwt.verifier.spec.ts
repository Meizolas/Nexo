import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier.js';

describe('SupabaseJwtVerifier', () => {
  const issuer = 'https://test.supabase.co/auth/v1';
  const audience = 'authenticated';

  it('validates signature and claims and maps the principal', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = 'test-key';
    publicJwk.alg = 'RS256';
    const verifier = new SupabaseJwtVerifier(
      issuer,
      audience,
      createLocalJWKSet({ keys: [publicJwk] }),
    );
    const token = await new SignJWT({
      aal: 'aal2',
      amr: [{ method: 'password' }, { method: 'totp' }],
      email: 'admin@example.com',
      session_id: 'session-1',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('33333333-3333-4333-8333-333333333333')
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    await expect(verifier.verify(token)).resolves.toEqual({
      userId: '33333333-3333-4333-8333-333333333333',
      email: 'admin@example.com',
      assuranceLevel: 'aal2',
      authenticationMethods: ['password', 'totp'],
      sessionId: 'session-1',
    });
  });

  it('rejects a token with an invalid audience', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = 'test-key';
    publicJwk.alg = 'RS256';
    const verifier = new SupabaseJwtVerifier(
      issuer,
      audience,
      createLocalJWKSet({ keys: [publicJwk] }),
    );
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('33333333-3333-4333-8333-333333333333')
      .setIssuer(issuer)
      .setAudience('another-audience')
      .setExpirationTime('5m')
      .sign(privateKey);

    await expect(verifier.verify(token)).rejects.toThrow();
  });
});
