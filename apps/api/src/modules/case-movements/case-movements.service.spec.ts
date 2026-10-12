import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { CaseMovementsService } from './case-movements.service.js';

describe('CaseMovementsService', () => {
  it('keeps client text unpublished when a movement is created', async () => {
    let createData: Record<string, unknown> | undefined;
    let auditedData: unknown;
    const movement = {
      id: '55555555-5555-4555-8555-555555555555',
      legalCaseId: '22222222-2222-4222-8222-222222222222',
      occurredAt: new Date('2026-10-06T15:00:00.000Z'),
      internalDescription: 'Conteúdo interno sigiloso',
      clientDescription: 'Resumo preparado',
      isPublished: false,
      publishedAt: null,
      createdBy: { id: '3', displayName: 'Advogada' },
      publishedBy: null,
    };
    const transaction = {
      caseMovement: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          createData = data;
          return Promise.resolve(movement);
        },
      },
    };
    const prisma = {
      legalCase: {
        findFirst: () => Promise.resolve({ id: movement.legalCaseId }),
      },
      withTransaction: (
        operation: (tx: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    } as unknown as PrismaService;
    const audit = {
      record: (input: { newData?: unknown }) => {
        auditedData = input.newData;
        return Promise.resolve();
      },
    } as unknown as AuditService;
    const service = new CaseMovementsService(prisma, audit);

    await service.create(
      '11111111-1111-4111-8111-111111111111',
      movement.legalCaseId,
      '33333333-3333-4333-8333-333333333333',
      {
        occurredAt: '2026-10-06T15:00:00.000Z',
        internalDescription: movement.internalDescription,
        clientDescription: movement.clientDescription,
      },
      { correlationId: '44444444-4444-4444-8444-444444444444' },
    );

    expect(createData).not.toHaveProperty('isPublished');
    expect(auditedData).not.toHaveProperty('internalDescription');
    expect(auditedData).toMatchObject({
      isPublished: false,
      hasClientDescription: true,
    });
  });
});
