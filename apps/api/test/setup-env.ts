import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.API_PORT = '3001';
process.env.DATABASE_URL ??=
  'postgresql://platform:platform@localhost:5432/platform?schema=public';
process.env.LOG_LEVEL = 'silent';
process.env.SUPABASE_JWT_ISSUER = 'https://test.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'test-service-role-key-with-safe-length';
process.env.SUPABASE_STORAGE_BUCKET = 'documents';
