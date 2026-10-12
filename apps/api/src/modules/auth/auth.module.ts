import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/environment.js';
import { AUTH_TOKEN_VERIFIER } from './auth.constants.js';
import { SupabaseJwtVerifier } from './supabase-jwt.verifier.js';

@Module({
  providers: [
    {
      provide: AUTH_TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new SupabaseJwtVerifier(
          config.get('SUPABASE_JWT_ISSUER', { infer: true }),
          config.get('SUPABASE_JWT_AUDIENCE', { infer: true }),
        ),
    },
  ],
  exports: [AUTH_TOKEN_VERIFIER],
})
export class AuthModule {}
