import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    const environment = validateEnvironment({
      API_PORT: '3100',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/platform',
      LOG_LEVEL: 'debug',
      NODE_ENV: 'test',
      SUPABASE_JWT_ISSUER: 'https://test.supabase.co/auth/v1',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-with-safe-length',
    });

    expect(environment.API_PORT).toBe(3100);
    expect(environment.LOG_LEVEL).toBe('debug');
    expect(environment.NODE_ENV).toBe('test');
  });

  it('rejects a missing database URL', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'test',
        SUPABASE_JWT_ISSUER: 'https://test.supabase.co/auth/v1',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-with-safe-length',
      }),
    ).toThrow('Invalid environment configuration');
  });
});
