import { LeaseStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { LeasesService } from './leases.service.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const leaseId = '22222222-2222-4222-8222-222222222222';
const unitId = '33333333-3333-4333-8333-333333333333';
const tenantId = '44444444-4444-4444-8444-444444444444';
const otherTenantId = '55555555-5555-4555-8555-555555555555';
const auditContext = {
  actorUserId: '66666666-6666-4666-8666-666666666666',
  correlationId: '77777777-7777-4777-8777-777777777777',
};

const validInput = {
  unitId,
  tenants: [{ partyId: tenantId, isFinancialResponsible: true }],
  startDate: '2026-10-12',
  monthlyRent: '2500.00',
  currency: 'BRL',
  dueDay: 10,
};

function lease(status: LeaseStatus) {
  return {
    id: leaseId,
    organizationId,
    unitId,
    status,
    startDate: new Date('2026-10-12T00:00:00.000Z'),
    endDate: null,
    monthlyRent: new Prisma.Decimal('2500.00'),
    currency: 'BRL',
    dueDay: 10,
    activatedAt: null,
    endedAt: null,
    canceledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    unit: {
      id: unitId,
      organizationId,
      propertyId: '88888888-8888-4888-8888-888888888888',
      name: 'Apartamento 12',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      property: { id: 'property-id', name: 'Horizonte', status: 'ACTIVE' },
    },
    tenants: [
      {
        organizationId,
        leaseId,
        partyId: tenantId,
        isFinancialResponsible: true,
        createdAt: new Date(),
        party: { id: tenantId, name: 'Locatário', type: 'PERSON' },
      },
    ],
  };
}

describe('LeasesService', () => {
  it('creates a draft and records its audit event in the transaction', async () => {
    const createdLease = lease(LeaseStatus.DRAFT);
    let createdWith: unknown;
    const create = async (input: unknown) => {
      createdWith = input;
      return createdLease;
    };
    const transaction = { lease: { create } };
    const prisma = {
      unit: { findFirst: async () => ({ id: unitId }) },
      party: { findMany: async () => [{ id: tenantId }] },
      withTransaction: async (
        operation: (tx: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    } as unknown as PrismaService;
    let recordedWith: unknown[] | undefined;
    const record = async (...args: unknown[]) => {
      recordedWith = args;
    };
    const service = new LeasesService(prisma, {
      record,
    } as unknown as AuditService);

    const result = await service.create(
      organizationId,
      validInput,
      auditContext,
    );

    expect(result.status).toBe(LeaseStatus.DRAFT);
    expect(createdWith).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId,
          unitId,
          currency: 'BRL',
          dueDay: 10,
        }),
      }),
    );
    expect(recordedWith).toEqual([
      expect.objectContaining({
        action: 'LEASE_CREATED',
        entityId: leaseId,
        organizationId,
      }),
      transaction,
    ]);
  });

  it('rejects duplicated tenants', async () => {
    const service = new LeasesService({} as PrismaService, {} as AuditService);

    await expect(
      service.create(
        organizationId,
        {
          ...validInput,
          tenants: [
            { partyId: tenantId, isFinancialResponsible: true },
            { partyId: tenantId, isFinancialResponsible: false },
          ],
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'LEASE_TENANT_DUPLICATED' },
    });
  });

  it('requires exactly one financial responsible tenant', async () => {
    const service = new LeasesService({} as PrismaService, {} as AuditService);

    await expect(
      service.create(
        organizationId,
        {
          ...validInput,
          tenants: [
            { partyId: tenantId, isFinancialResponsible: true },
            { partyId: otherTenantId, isFinancialResponsible: true },
          ],
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'LEASE_FINANCIAL_RESPONSIBLE_INVALID' },
    });
  });

  it('rejects a tenant outside the active organization role', async () => {
    const prisma = {
      unit: { findFirst: async () => ({ id: unitId }) },
      party: { findMany: async () => [] },
    } as unknown as PrismaService;
    const service = new LeasesService(prisma, {} as AuditService);

    await expect(
      service.create(organizationId, validInput, auditContext),
    ).rejects.toMatchObject({ response: { code: 'LEASE_TENANT_INVALID' } });
  });

  it('rejects activation when another active lease overlaps the unit', async () => {
    let leaseQuery = 0;
    const prisma = {
      lease: {
        findFirst: async () => {
          leaseQuery += 1;
          return leaseQuery === 1 ? lease(LeaseStatus.DRAFT) : { id: 'other' };
        },
      },
      unit: { findFirst: async () => ({ id: unitId }) },
      party: { findMany: async () => [{ id: tenantId }] },
    } as unknown as PrismaService;
    const service = new LeasesService(prisma, {} as AuditService);

    await expect(
      service.activate(organizationId, leaseId, auditContext),
    ).rejects.toMatchObject({ response: { code: 'LEASE_OCCUPANCY_OVERLAP' } });
  });

  it('does not end a draft lease', async () => {
    const prisma = {
      lease: { findFirst: async () => lease(LeaseStatus.DRAFT) },
    } as unknown as PrismaService;
    const service = new LeasesService(prisma, {} as AuditService);

    await expect(
      service.end(
        organizationId,
        leaseId,
        { endDate: '2026-10-12' },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'LEASE_STATUS_TRANSITION_INVALID' },
    });
  });
});
