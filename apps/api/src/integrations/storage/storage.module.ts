import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment.js';
import { SupabaseStorageService } from './supabase-storage.service.js';
import { PRIVATE_STORAGE } from './storage.types.js';

@Global()
@Module({
  providers: [
    {
      provide: PRIVATE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new SupabaseStorageService(
          config.get('SUPABASE_URL', { infer: true }),
          config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
        ),
    },
  ],
  exports: [PRIVATE_STORAGE],
})
export class StorageModule {}
