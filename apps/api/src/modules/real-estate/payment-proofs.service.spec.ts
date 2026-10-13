import { PaymentProofStatus } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuditService } from '../audit/audit.service.js';
import type { DocumentsService } from '../documents/documents.service.js';
import { PaymentProofsService } from './payment-proofs.service.js';

const organizationId = '11111111-1111-4111-8111-111111111111';
const chargeId = '22222222-2222-4222-8222-222222222222';
const proofId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const auditContext = { actorUserId: userId, correlationId: 'correlation-id' };

describe('PaymentProofsService', () => {
  it('requires a note when rejecting a proof', async () => {
    const service = new PaymentProofsService(
      {} as PrismaService,
      {} as DocumentsService,
      {} as AuditService,
    );

    await expect(
      service.review(
        organizationId,
        chargeId,
        proofId,
        userId,
        { status: PaymentProofStatus.REJECTED },
        auditContext,
      ),
    ).rejects.toMatchObject({
      response: { code: 'PAYMENT_PROOF_REJECTION_NOTE_REQUIRED' },
    });
  });

  it('reviews a pending proof without changing the charge status', async () => {
    let updateData: unknown;
    let auditAction: string | undefined;
    const document = {
      id: '55555555-5555-4555-8555-555555555555',
      sizeBytes: 1024n,
    };
    const tx = {
      paymentProof: {
        findFirst: async () => ({
          id: proofId,
          status: PaymentProofStatus.PENDING,
        }),
        updateMany: async (input: unknown) => {
          updateData = input;
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({
          id: proofId,
          status: PaymentProofStatus.ACCEPTED,
          document,
          reviewedBy: { id: userId, displayName: 'Administrador' },
        }),
      },
    };
    const prisma = {
      withTransaction: async (
        operation: (transaction: typeof tx) => Promise<unknown>,
      ) => operation(tx),
    } as unknown as PrismaService;
    const audit = {
      record: async (input: { action: string }) => {
        auditAction = input.action;
      },
    } as unknown as AuditService;
    const service = new PaymentProofsService(
      prisma,
      {} as DocumentsService,
      audit,
    );

    const result = await service.review(
      organizationId,
      chargeId,
      proofId,
      userId,
      { status: PaymentProofStatus.ACCEPTED, note: 'Arquivo conferido' },
      auditContext,
    );

    expect(result).toMatchObject({
      id: proofId,
      status: PaymentProofStatus.ACCEPTED,
      document: { sizeBytes: 1024 },
    });
    expect(updateData).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentProofStatus.ACCEPTED,
          reviewedByUserId: userId,
        }),
      }),
    );
    expect(auditAction).toBe('PAYMENT_PROOF_REVIEWED');
  });
});
