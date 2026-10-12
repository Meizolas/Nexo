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
const CLIENT_USER_ID = '55555555-5555-4555-8555-555555555555';
const CLIENT_PARTY_ID = '66666666-6666-4666-8666-666666666666';
const LEGAL_CASE_ID = '77777777-7777-4777-8777-777777777777';
const PROPERTY_ID = '88888888-8888-4888-8888-888888888888';
const LEASE_ID = '99999999-9999-4999-8999-999999999999';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const tokenVerifier = {
      async verify(token: string) {
        if (!['valid-aal1', 'valid-aal2', 'client-aal1'].includes(token)) {
          throw new Error('Invalid token');
        }

        return {
          userId: token === 'client-aal1' ? CLIENT_USER_ID : USER_ID,
          assuranceLevel: token === 'valid-aal2' ? 'aal2' : 'aal1',
          authenticationMethods: [token === 'valid-aal2' ? 'totp' : 'password'],
        };
      },
    };
    const prisma = {
      membership: {
        async findMany({ where }: { where: { userId: string } }) {
          return where.userId === CLIENT_USER_ID
            ? [
                {
                  id: 'client-membership',
                  isDefault: true,
                  organization: {
                    id: ORGANIZATION_A_ID,
                    name: 'Organização A',
                    slug: 'organizacao-a',
                  },
                  roles: [{ role: 'CLIENT' }],
                },
              ]
            : where.userId === USER_ID
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
          if (
            where.organizationId === ORGANIZATION_A_ID &&
            where.userId === CLIENT_USER_ID
          ) {
            return {
              id: 'client-membership',
              grants: [],
              roles: [{ role: 'CLIENT' }],
              user: { platformRole: 'USER' },
            };
          }
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
      partyUserLink: {
        async findMany({
          where,
        }: {
          where: { organizationId: string; userId: string };
        }) {
          return where.organizationId === ORGANIZATION_A_ID &&
            where.userId === CLIENT_USER_ID
            ? [{ partyId: CLIENT_PARTY_ID }]
            : [];
        },
      },
      legalCase: {
        async findMany({
          where,
        }: {
          where: { parties?: { some?: { partyId?: { in?: string[] } } } };
        }) {
          const linkedPartyIds = where.parties?.some?.partyId?.in ?? [];
          return linkedPartyIds.includes(CLIENT_PARTY_ID)
            ? [
                {
                  id: LEGAL_CASE_ID,
                  caseNumber: null,
                  subject: 'Processo autorizado',
                  clientSummary: 'Resumo publicado',
                  tribunal: null,
                  district: null,
                  movements: [
                    {
                      id: 'movement-1',
                      occurredAt: new Date('2026-10-01T12:00:00Z'),
                      clientDescription: 'Movimentação publicada',
                    },
                  ],
                  hearings: [],
                  updatedAt: new Date('2026-10-01T12:00:00Z'),
                },
              ]
            : [];
        },
      },
      document: {
        async findMany() {
          return [];
        },
      },
      property: {
        async findMany({ where }: { where: { organizationId: string } }) {
          return where.organizationId === ORGANIZATION_A_ID
            ? [
                {
                  id: PROPERTY_ID,
                  name: 'Imóvel da organização A',
                  type: 'RESIDENTIAL',
                  addressLine: null,
                  city: null,
                  state: null,
                  postalCode: null,
                  status: 'ACTIVE',
                  units: [],
                  ownerships: [],
                },
              ]
            : [];
        },
        async count({ where }: { where: { organizationId: string } }) {
          return where.organizationId === ORGANIZATION_A_ID ? 1 : 0;
        },
      },
      lease: {
        async findMany({ where }: { where: { organizationId: string } }) {
          return where.organizationId === ORGANIZATION_A_ID
            ? [
                {
                  id: LEASE_ID,
                  organizationId: ORGANIZATION_A_ID,
                  unitId: 'unit-a',
                  status: 'DRAFT',
                  startDate: new Date('2026-10-12T00:00:00Z'),
                  endDate: null,
                  monthlyRent: '2500.00',
                  currency: 'BRL',
                  dueDay: 10,
                  unit: {
                    id: 'unit-a',
                    name: 'Apartamento 12',
                    property: {
                      id: PROPERTY_ID,
                      name: 'Imóvel da organização A',
                      status: 'ACTIVE',
                    },
                  },
                  tenants: [],
                },
              ]
            : [];
        },
        async count({ where }: { where: { organizationId: string } }) {
          return where.organizationId === ORGANIZATION_A_ID ? 1 : 0;
        },
      },
      async $transaction(queries: Promise<unknown>[]) {
        return Promise.all(queries);
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

    const propertyResponse = await request(app.getHttpServer())
      .get(`/api/v1/real-estate/properties/${PROPERTY_ID}`)
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_B_ID)
      .expect(404);
    expect(propertyResponse.body.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns only the portal process associated with the client party', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/portal/legal/cases')
      .set('authorization', 'Bearer client-aal1')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: LEGAL_CASE_ID,
      subject: 'Processo autorizado',
      movements: [{ clientDescription: 'Movimentação publicada' }],
      hearings: [],
      documents: [],
    });
  });

  it('does not let a portal client manage client-to-user access links', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/portal/legal/party-links')
      .set('authorization', 'Bearer client-aal1')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(403);

    expect(response.body.code).toBe('ACCESS_DENIED');
  });

  it('lists properties only to an authorized real-estate organization member', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/real-estate/properties')
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: PROPERTY_ID, name: 'Imóvel da organização A' }],
      meta: { totalItems: 1 },
    });

    const denied = await request(app.getHttpServer())
      .get('/api/v1/real-estate/properties')
      .set('authorization', 'Bearer client-aal1')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(403);
    expect(denied.body.code).toBe('ACCESS_DENIED');
  });

  it('lists leases only to an authorized real-estate organization member', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/real-estate/leases')
      .set('authorization', 'Bearer valid-aal2')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: LEASE_ID, status: 'DRAFT' }],
      meta: { totalItems: 1 },
    });

    const denied = await request(app.getHttpServer())
      .get('/api/v1/real-estate/leases')
      .set('authorization', 'Bearer client-aal1')
      .set('x-organization-id', ORGANIZATION_A_ID)
      .expect(403);
    expect(denied.body.code).toBe('ACCESS_DENIED');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
