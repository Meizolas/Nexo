import { ChargeStatus, ChargeType, LeaseStatus, Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { ChargesService } from './charges.service.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const leaseId = '22222222-2222-4222-8222-222222222222';
const chargeId = '33333333-3333-4333-8333-333333333333';
const auditContext = {
  actorUserId: '44444444-4444-4444-8444-444444444444',
  correlationId: '55555555-5555-4555-8555-555555555555',
};

function charge() {
  return {
    id: chargeId,
    organizationId,
    leaseId,
    type: ChargeType.RENT,
    competence: new Date('2026-10-01T00:00:00.000Z'),
    dueDate: new Date('2026-10-10T00:00:00.000Z'),
    baseAmount: new Prisma.Decimal('2500.00'),
    currency: 'BRL',
    status: ChargeStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
    lease: {
      unit: {
        id: 'unit-id',
        name: 'Apartamento 12',
        property: { id: 'property-id', name: 'Horizonte' },
      },
      tenants: [],
    },
  };
}

describe('ChargesService', () => {
  it('rejects an invalid monthly competence', async () => {
    const service = new ChargesService({} as PrismaService, {} as AuditService);

    await expect(
      service.generate(organizationId, { competence: '2026-13' }, auditContext),
    ).rejects.toMatchObject({
      response: { code: 'CHARGE_COMPETENCE_INVALID' },
    });
  });

  it('generates a rent snapshot with the contract due day', async () => {
    let createdData: unknown;
    let auditData: unknown[] | undefined;
    let leaseQuery: unknown;
    const tx = {
      charge: {
        createMany: async (input: unknown) => {
          createdData = input;
          return { count: 1 };
        },
        findMany: async () => [charge()],
      },
    };
    const prisma = {
      lease: {
        findMany: async (input: unknown) => {
          leaseQuery = input;
          return [
            {
              id: leaseId,
              monthlyRent: new Prisma.Decimal('2500.00'),
              currency: 'BRL',
              dueDay: 10,
            },
          ];
        },
      },
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    const audit = {
      record: async (...args: unknown[]) => {
        auditData = args;
      },
    } as unknown as AuditService;
    const service = new ChargesService(prisma, audit);

    const result = await service.generate(
      organizationId,
      { competence: '2026-10' },
      auditContext,
    );

    expect(result).toMatchObject({
      competence: '2026-10',
      createdCount: 1,
      existingCount: 0,
      charges: [{ id: chargeId }],
    });
    expect(leaseQuery).toEqual(
      expect.objectContaining({
        where: {
          organizationId,
          status: LeaseStatus.ACTIVE,
          startDate: { lte: new Date('2026-10-31T00:00:00.000Z') },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date('2026-10-01T00:00:00.000Z') } },
          ],
        },
      }),
    );
    expect(createdData).toEqual(
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            leaseId,
            type: ChargeType.RENT,
            dueDate: new Date('2026-10-10T00:00:00.000Z'),
            baseAmount: new Prisma.Decimal('2500.00'),
          }),
        ],
      }),
    );
    expect(auditData).toEqual([
      expect.objectContaining({
        action: 'RECURRING_CHARGES_GENERATED',
        newData: expect.objectContaining({ createdCount: 1 }),
      }),
      tx,
    ]);
  });

  it('reports an existing charge when generation is repeated', async () => {
    const tx = {
      charge: {
        createMany: async () => ({ count: 0 }),
        findMany: async () => [charge()],
      },
    };
    const prisma = {
      lease: {
        findMany: async () => [
          {
            id: leaseId,
            monthlyRent: new Prisma.Decimal('9999.00'),
            currency: 'BRL',
            dueDay: 20,
          },
        ],
      },
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    const service = new ChargesService(prisma, {
      record: async () => undefined,
    } as unknown as AuditService);

    const result = await service.generate(
      organizationId,
      { competence: '2026-10' },
      auditContext,
    );

    expect(result).toMatchObject({
      createdCount: 0,
      existingCount: 1,
      charges: [{ id: chargeId, baseAmount: new Prisma.Decimal('2500.00') }],
    });
  });

  it('completes an empty competence without attempting a bulk insert', async () => {
    let createManyCalled = false;
    const tx = {
      charge: {
        createMany: async () => {
          createManyCalled = true;
          return { count: 0 };
        },
        findMany: async () => [],
      },
    };
    const prisma = {
      lease: { findMany: async () => [] },
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    const service = new ChargesService(prisma, {
      record: async () => undefined,
    } as unknown as AuditService);

    const result = await service.generate(
      organizationId,
      { competence: '2026-10' },
      auditContext,
    );

    expect(createManyCalled).toBe(false);
    expect(result).toMatchObject({
      createdCount: 0,
      existingCount: 0,
      charges: [],
    });
  });
});
