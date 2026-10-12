import {
  ChargeAdjustmentStatus,
  ChargeAdjustmentType,
  ChargeStatus,
  ChargeType,
  LeaseStatus,
  Prisma,
} from '@prisma/client';
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
    adjustments: [],
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

  it('adds an audited fixed adjustment and recalculates the total', async () => {
    const adjustment = {
      id: '66666666-6666-4666-8666-666666666666',
      organizationId,
      chargeId,
      type: ChargeAdjustmentType.FINE,
      amount: new Prisma.Decimal('125.50'),
      reason: 'Multa prevista no contrato',
      status: ChargeAdjustmentStatus.ACTIVE,
      createdAt: new Date(),
      canceledAt: null,
    };
    const updatedCharge = { ...charge(), adjustments: [adjustment] };
    let auditData: unknown[] | undefined;
    const tx = {
      $queryRaw: async () => [{ id: chargeId }],
      charge: {
        findFirst: async () => charge(),
        findFirstOrThrow: async () => updatedCharge,
      },
      chargeAdjustment: { create: async () => adjustment },
    };
    const prisma = {
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

    const result = await service.addAdjustment(
      organizationId,
      chargeId,
      {
        type: ChargeAdjustmentType.FINE,
        amount: '125.50',
        reason: 'Multa prevista no contrato',
      },
      auditContext,
    );

    expect(result).toMatchObject({
      fineAmount: new Prisma.Decimal('125.50'),
      interestAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal('2625.50'),
    });
    expect(auditData).toEqual([
      expect.objectContaining({
        action: 'CHARGE_ADJUSTMENT_ADDED',
        entityId: adjustment.id,
        newData: expect.objectContaining({ amount: '125.50' }),
      }),
      tx,
    ]);
  });

  it('rejects a discount that would make the charge total negative', async () => {
    const current = {
      ...charge(),
      adjustments: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          type: ChargeAdjustmentType.DISCOUNT,
          amount: new Prisma.Decimal('2400.00'),
          reason: 'Desconto anterior',
          status: ChargeAdjustmentStatus.ACTIVE,
          createdAt: new Date(),
          canceledAt: null,
        },
      ],
    };
    let createCalled = false;
    const tx = {
      $queryRaw: async () => [{ id: chargeId }],
      charge: { findFirst: async () => current },
      chargeAdjustment: {
        create: async () => {
          createCalled = true;
        },
      },
    };
    const prisma = {
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    const service = new ChargesService(prisma, {} as AuditService);

    await expect(
      service.addAdjustment(
        organizationId,
        chargeId,
        {
          type: ChargeAdjustmentType.DISCOUNT,
          amount: '200.00',
          reason: 'Desconto adicional',
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'CHARGE_DISCOUNT_EXCEEDS_TOTAL' },
    });
    expect(createCalled).toBe(false);
  });

  it('cancels an active adjustment without deleting its history', async () => {
    const adjustment = {
      id: '66666666-6666-4666-8666-666666666666',
      organizationId,
      chargeId,
      type: ChargeAdjustmentType.INTEREST,
      amount: new Prisma.Decimal('25.00'),
      reason: 'Juros manual',
      status: ChargeAdjustmentStatus.ACTIVE,
      createdAt: new Date(),
      canceledAt: null,
    };
    const canceled = {
      ...adjustment,
      status: ChargeAdjustmentStatus.CANCELED,
      canceledAt: new Date(),
    };
    const tx = {
      $queryRaw: async () => [{ id: chargeId }],
      charge: {
        findFirst: async () => ({ ...charge(), adjustments: [adjustment] }),
        findFirstOrThrow: async () => ({
          ...charge(),
          adjustments: [canceled],
        }),
      },
      chargeAdjustment: { updateMany: async () => ({ count: 1 }) },
    };
    const prisma = {
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    let action: string | undefined;
    const service = new ChargesService(prisma, {
      record: async (input: { action: string }) => {
        action = input.action;
      },
    } as unknown as AuditService);

    const result = await service.cancelAdjustment(
      organizationId,
      chargeId,
      adjustment.id,
      auditContext,
    );

    expect(result).toMatchObject({
      interestAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal('2500.00'),
      adjustments: [{ id: adjustment.id, status: 'CANCELED' }],
    });
    expect(action).toBe('CHARGE_ADJUSTMENT_CANCELED');
  });
});
