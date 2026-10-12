import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { DocumentsService } from '../documents/documents.service.js';
import { LegalPortalService } from './legal-portal.service.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const caseId = '33333333-3333-4333-8333-333333333333';
const auditContext = {
  actorUserId: userId,
  correlationId: '44444444-4444-4444-8444-444444444444',
};

describe('LegalPortalService client submissions', () => {
  it('does not upload a document when the user has no linked client case', async () => {
    const prisma = {
      legalCase: { findFirst: async () => null },
    } as unknown as PrismaService;
    const uploadCalls: unknown[][] = [];
    const documents = {
      upload: (...args: unknown[]) => {
        uploadCalls.push(args);
        return Promise.resolve(undefined);
      },
    } as unknown as DocumentsService;
    const service = new LegalPortalService(
      prisma,
      {} as AuditService,
      documents,
    );

    await expect(
      service.uploadClientDocument(
        organizationId,
        userId,
        caseId,
        {} as Express.Multer.File,
        auditContext,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(uploadCalls).toHaveLength(0);
  });

  it('stores a client submission as internal and binds it to the authorized case', async () => {
    const prisma = {
      legalCase: { findFirst: async () => ({ id: caseId }) },
    } as unknown as PrismaService;
    const uploadCalls: unknown[][] = [];
    const documents = {
      upload: (...args: unknown[]) => {
        uploadCalls.push(args);
        return Promise.resolve({ id: 'document-id' });
      },
    } as unknown as DocumentsService;
    const service = new LegalPortalService(
      prisma,
      {} as AuditService,
      documents,
    );
    const file = { originalname: 'evidence.pdf' } as Express.Multer.File;

    await service.uploadClientDocument(
      organizationId,
      userId,
      caseId,
      file,
      auditContext,
    );

    expect(uploadCalls).toHaveLength(1);
    expect(uploadCalls[0]).toEqual([
      organizationId,
      userId,
      file,
      expect.objectContaining({
        visibility: 'INTERNAL',
        contextType: 'LEGAL_CASE',
        contextId: caseId,
      }),
      auditContext,
    ]);
  });

  it('forwards an authorized service request only to currently active assigned lawyers', async () => {
    const notificationData: Array<Record<string, unknown>> = [];
    const auditEvents: Array<Record<string, unknown>> = [];
    const prisma = {
      legalCase: {
        findFirst: async () => ({
          id: caseId,
          subject: 'Ação judicial',
          lawyers: [
            {
              userId: 'lawyer-active',
              user: { status: 'ACTIVE', memberships: [{ id: 'membership' }] },
            },
            {
              userId: 'lawyer-disabled',
              user: {
                status: 'DISABLED',
                memberships: [{ id: 'old-membership' }],
              },
            },
          ],
        }),
      },
      withTransaction: async (
        callback: (transaction: unknown) => Promise<unknown>,
      ) =>
        callback({
          notification: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              notificationData.push(data);
              return { id: 'notification-id' };
            },
          },
        }),
    } as unknown as PrismaService;
    const audit = {
      record: async (event: Record<string, unknown>) => {
        auditEvents.push(event);
      },
    } as unknown as AuditService;
    const service = new LegalPortalService(
      prisma,
      audit,
      {} as DocumentsService,
    );

    await service.createServiceRequest(
      organizationId,
      userId,
      caseId,
      {
        subject: 'Dúvida sobre o andamento',
        message: 'Gostaria de conversar sobre a próxima etapa do processo.',
      },
      auditContext,
    );

    expect(notificationData).toHaveLength(1);
    expect(notificationData[0]).toEqual(
      expect.objectContaining({
        recipientUserId: 'lawyer-active',
        type: 'LEGAL_CLIENT_SERVICE_REQUEST',
        data: { legalCaseId: caseId, requestedByUserId: userId },
      }),
    );
    expect(auditEvents[0]).toEqual(
      expect.objectContaining({
        action: 'LEGAL_CLIENT_SERVICE_REQUESTED',
        entityId: caseId,
        newData: { notificationCount: 1 },
      }),
    );
    expect(JSON.stringify(auditEvents)).not.toContain('próxima etapa');
  });
});
