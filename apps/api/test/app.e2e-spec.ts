import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApplication } from './../src/bootstrap.js';
import { AUTH_TOKEN_VERIFIER } from './../src/modules/auth/auth.constants.js';
import { PrismaService } from './../src/database/prisma.service.js';

const ORGANIZATION_A_ID = '11111111-1111-4111-8111-111111111111';
const ORGANIZATION_B_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const MEMBERSHIP_ID = '44444444-4444-4444-8444-444444444444';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const tokenVerifier = {
      async verify(token: string) {
        if (token !== 'valid-aal1' && token !== 'valid-aal2') {
          throw new Error('Invalid token');
        }

        return {
          userId: USER_ID,
          assuranceLevel: token === 'valid-aal2' ? 'aal2' : 'aal1',
          authenticationMethods: [token === 'valid-aal2' ? 'totp' : 'password'],
        };
      },
    };
    const prisma = {
      membership: {
        async findMany({ where }: { where: { userId: string } }) {
          return where.userId === USER_ID
            ? [
                {
                  id: MEMBERSHIP_ID,
                  isDefault: true,
                  organization: {
                    id: ORGANIZATION_A_ID,
                    name: 'Organização A',
                    slug: 'organizacao-a',
                  },
                  roles: [{ role: 'ORG_ADMIN' }],
                },
              ]
            : [];
        },
        async findFirst({
          where,
        }: {
          where: { organizationId: string; userId: string };
        }) {
          return where.organizationId === ORGANIZATION_A_ID &&
            where.userId === USER_ID
            ? {
                id: MEMBERSHIP_ID,
                grants: [],
                roles: [{ role: 'ORG_ADMIN' }],
                user: { platformRole: 'USER' },
              }
            : null;
        },
      },
      async $disconnect() {},
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_TOKEN_VERIFIER)
      .useValue(tokenVerifier)
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1').expect(200).expect({
      name: 'Plataforma Integrada API',
      status: 'ok',
      version: '1.0',
    });
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('returns the standardized error envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      code: 'HTTP_404',
      message: 'Cannot GET /api/v1/missing',
      details: [],
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
    });
  });

  it('rejects a private endpoint without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(401);

    expect(response.body.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('returns only an organization linked to the authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(200)
      .expect({
        id: ORGANIZATION_A_ID,
        membershipId: MEMBERSHIP_ID,
        roles: ['ORG_ADMIN'],
      });

    const deniedResponse = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_B_ID)
      .expect(404);

    expect(deniedResponse.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('lists only active memberships without requiring an organization header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('authorization', 'Bearer valid-aal1')
      .expect(200)
      .expect([
        {
          membershipId: MEMBERSHIP_ID,
          organizationId: ORGANIZATION_A_ID,
          organizationName: 'Organização A',
          organizationSlug: 'organizacao-a',
          isDefault: true,
          roles: ['ORG_ADMIN'],
        },
      ]);
  });

  it('requires MFA from organization administrators', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set('authorization', 'Bearer valid-aal1')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(403);

    expect(response.body.code).toBe('MFA_REQUIRED');
  });

  it('blocks legal case access through another organization context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/legal/cases')
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_B_ID)
      .expect(404);

    expect(response.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
