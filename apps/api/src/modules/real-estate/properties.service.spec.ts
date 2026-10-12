import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import { PropertiesService } from './properties.service.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const auditContext = {
  actorUserId: '33333333-3333-4333-8333-333333333333',
  correlationId: '44444444-4444-4444-8444-444444444444',
};

describe('PropertiesService', () => {
  it('rejects an owner who is not an active OWNER in the organization', async () => {
    const prisma = {
      party: { findMany: async () => [] },
      withTransaction: async () => {
        throw new Error('must not persist');
      },
    } as unknown as PrismaService;
    const service = new PropertiesService(prisma, {} as AuditService);

    await expect(
      service.create(
        organizationId,
        {
          name: 'Edifício Horizonte',
          ownerPartyIds: [ownerId],
        } as never,
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'PROPERTY_OWNER_INVALID' },
    });
  });

  it('does not create the same active owner relationship twice', async () => {
    const prisma = {
      property: {
        findFirst: async () => ({ id: 'property-id' }),
      },
      party: {
        findFirst: async () => ({ id: ownerId, name: 'Proprietária' }),
      },
      ownership: {
        findFirst: async ({ where }: { where: Record<string, unknown> }) => {
          expect(where).toEqual({
            organizationId,
            propertyId: 'property-id',
            partyId: ownerId,
            endedAt: null,
          });
          return { id: 'existing-ownership' };
        },
      },
      withTransaction: async () => {
        throw new Error('must not persist');
      },
    } as unknown as PrismaService;
    const service = new PropertiesService(prisma, {} as AuditService);

    await expect(
      service.addOwner(
        organizationId,
        'property-id',
        { partyId: ownerId },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'PROPERTY_OWNER_ALREADY_ACTIVE' },
    });
  });
});
