import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { LegalCasesService } from './legal-cases.service.js';

const auditContext = {
  actorUserId: '33333333-3333-4333-8333-333333333333',
  correlationId: '55555555-5555-4555-8555-555555555555',
};

describe('LegalCasesService', () => {
  it('rejects an invalid optional CNJ number before persistence', async () => {
    const service = new LegalCasesService(
      {} as PrismaService,
      {} as AuditService,
    );

    await expect(
      service.create(
        '11111111-1111-4111-8111-111111111111',
        {
          caseNumber: '02000436620092000000',
          subject: 'Ação de cobrança',
          responsibleLawyerId: '22222222-2222-4222-8222-222222222222',
          parties: [
            {
              partyId: '44444444-4444-4444-8444-444444444444',
              role: 'CLIENT',
            },
          ],
        },
        auditContext,
      ),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CNJ_NUMBER' } });
  });

  it('does not return a process from another organization', async () => {
    let receivedArguments: unknown;
    const prisma = {
      legalCase: {
        findFirst: (args: unknown) => {
          receivedArguments = args;
          return Promise.resolve(null);
        },
      },
    } as unknown as PrismaService;
    const service = new LegalCasesService(prisma, {} as AuditService);

    await expect(
      service.findOne(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(receivedArguments).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: '11111111-1111-4111-8111-111111111111',
        }),
      }),
    );
  });
});
