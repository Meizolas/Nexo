import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChargeStatus,
  DocumentStatus,
  DocumentVisibility,
  PaymentProofStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { RecordAuditEventInput } from '../audit/audit.service.js';
import { AuditService } from '../audit/audit.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { UploadDocumentDto } from '../documents/dto/upload-document.dto.js';
import { ReviewPaymentProofDto } from './dto/review-payment-proof.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const PROOF_CONTEXT = 'CHARGE_PAYMENT_PROOF';

@Injectable()
export class PaymentProofsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    organizationId: string,
    chargeId: string,
    userId: string,
    file: Express.Multer.File | undefined,
    auditContext: AuditContext,
  ) {
    await this.assertOpenCharge(organizationId, chargeId);
    const document = await this.documents.upload(
      organizationId,
      userId,
      file,
      Object.assign(new UploadDocumentDto(), {
        visibility: DocumentVisibility.INTERNAL,
        contextType: PROOF_CONTEXT,
        contextId: chargeId,
      }),
      auditContext,
    );
    try {
      return await this.prisma.withTransaction(async (tx) => {
        const proof = await tx.paymentProof.create({
          data: { organizationId, chargeId, documentId: document.id },
          include: { document: true },
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PAYMENT_PROOF_SUBMITTED',
            entityType: 'PaymentProof',
            entityId: proof.id,
            newData: { chargeId, documentId: document.id },
          },
          tx,
        );
        return this.serialize(proof);
      });
    } catch (error) {
      await this.documents
        .remove(organizationId, document.id, auditContext)
        .catch(() => undefined);
      throw error;
    }
  }

  async review(
    organizationId: string,
    chargeId: string,
    proofId: string,
    userId: string,
    input: ReviewPaymentProofDto,
    auditContext: AuditContext,
  ) {
    if (input.status === PaymentProofStatus.PENDING) {
      throw new BadRequestException({
        code: 'PAYMENT_PROOF_REVIEW_INVALID',
        message: 'A anÃ¡lise deve aceitar ou rejeitar o comprovante.',
      });
    }
    if (input.status === PaymentProofStatus.REJECTED && !input.note?.trim()) {
      throw new BadRequestException({
        code: 'PAYMENT_PROOF_REJECTION_NOTE_REQUIRED',
        message: 'Informe o motivo da rejeiÃ§Ã£o.',
      });
    }
    return this.prisma.withTransaction(async (tx) => {
      const current = await tx.paymentProof.findFirst({
        where: { id: proofId, organizationId, chargeId },
      });
      if (!current) throw this.notFound();
      if (current.status !== PaymentProofStatus.PENDING) {
        throw new ConflictException({
          code: 'PAYMENT_PROOF_ALREADY_REVIEWED',
          message: 'O comprovante jÃ¡ foi analisado.',
        });
      }
      const reviewedAt = new Date();
      const result = await tx.paymentProof.updateMany({
        where: {
          id: proofId,
          organizationId,
          chargeId,
          status: PaymentProofStatus.PENDING,
        },
        data: {
          status: input.status,
          reviewNote: input.note || null,
          reviewedByUserId: userId,
          reviewedAt,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException({
          code: 'PAYMENT_PROOF_REVIEW_CONFLICT',
          message: 'O comprovante foi analisado por outra operaÃ§Ã£o.',
        });
      }
      const proof = await tx.paymentProof.findUniqueOrThrow({
        where: { id: proofId },
        include: {
          document: true,
          reviewedBy: { select: { id: true, displayName: true } },
        },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'PAYMENT_PROOF_REVIEWED',
          entityType: 'PaymentProof',
          entityId: proofId,
          previousData: { status: current.status },
          newData: {
            status: input.status,
            note: input.note || null,
            reviewedAt: reviewedAt.toISOString(),
          },
        },
        tx,
      );
      return this.serialize(proof);
    });
  }

  async createDownloadUrl(
    organizationId: string,
    chargeId: string,
    proofId: string,
    auditContext: AuditContext,
  ) {
    const proof = await this.prisma.paymentProof.findFirst({
      where: {
        id: proofId,
        organizationId,
        chargeId,
        document: { status: DocumentStatus.ACTIVE, deletedAt: null },
      },
      select: { documentId: true },
    });
    if (!proof) throw this.notFound();
    return this.documents.createDownloadUrl(
      organizationId,
      proof.documentId,
      auditContext,
    );
  }

  private async assertOpenCharge(organizationId: string, chargeId: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, organizationId },
      select: { status: true },
    });
    if (!charge) throw this.notFound();
    if (charge.status !== ChargeStatus.OPEN) {
      throw new ConflictException({
        code: 'CHARGE_NOT_OPEN',
        message: 'Somente cobranÃ§as abertas recebem comprovantes.',
      });
    }
  }

  private serialize<T extends { document: { sizeBytes: bigint } }>(proof: T) {
    return {
      ...proof,
      document: {
        ...proof.document,
        sizeBytes: Number(proof.document.sizeBytes),
      },
    };
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'CobranÃ§a ou comprovante nÃ£o encontrado.',
    });
  }
}
