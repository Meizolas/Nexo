import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChargeAdjustmentStatus,
  ChargeAdjustmentType,
  ChargeStatus,
  ChargeType,
  LeaseStatus,
  Prisma,
} from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { GenerateChargesDto } from './dto/generate-charges.dto.js';
import { ListChargesDto } from './dto/list-charges.dto.js';
import { AddChargeAdjustmentDto } from './dto/charge-adjustment.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const chargeInclude = {
  lease: {
    include: {
      unit: {
        include: {
          property: { select: { id: true, name: true } },
        },
      },
      tenants: {
        where: { isFinancialResponsible: true },
        include: { party: { select: { id: true, name: true } } },
      },
    },
  },
  adjustments: { orderBy: [{ createdAt: 'desc' as const }] },
  paymentProofs: {
    include: {
      document: true,
      reviewedBy: { select: { id: true, displayName: true } },
    },
    orderBy: [{ createdAt: 'desc' as const }],
  },
} satisfies Prisma.ChargeInclude;

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generate(
    organizationId: string,
    input: GenerateChargesDto,
    auditContext: AuditContext,
  ) {
    const competence = this.parseCompetence(input.competence);
    const monthEnd = new Date(
      Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth() + 1, 0),
    );
    const leases = await this.prisma.lease.findMany({
      where: {
        organizationId,
        status: LeaseStatus.ACTIVE,
        startDate: { lte: monthEnd },
        OR: [{ endDate: null }, { endDate: { gte: competence } }],
      },
      select: {
        id: true,
        monthlyRent: true,
        currency: true,
        dueDay: true,
      },
      orderBy: { id: 'asc' },
    });

    return this.prisma.withTransaction(async (tx) => {
      const createdCount = leases.length
        ? (
            await tx.charge.createMany({
              data: leases.map((lease) => ({
                organizationId,
                leaseId: lease.id,
                type: ChargeType.RENT,
                competence,
                dueDate: new Date(
                  Date.UTC(
                    competence.getUTCFullYear(),
                    competence.getUTCMonth(),
                    lease.dueDay,
                  ),
                ),
                baseAmount: lease.monthlyRent,
                currency: lease.currency,
              })),
              skipDuplicates: true,
            })
          ).count
        : 0;
      const charges = await tx.charge.findMany({
        where: {
          organizationId,
          competence,
          type: ChargeType.RENT,
          leaseId: { in: leases.map(({ id }) => id) },
        },
        include: chargeInclude,
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'RECURRING_CHARGES_GENERATED',
          entityType: 'ChargeBatch',
          entityId: input.competence,
          newData: {
            competence: input.competence,
            type: ChargeType.RENT,
            eligibleCount: leases.length,
            createdCount,
            existingCount: leases.length - createdCount,
          },
        },
        tx,
      );
      return {
        competence: input.competence,
        createdCount,
        existingCount: leases.length - createdCount,
        charges: this.withDerivedStatus(charges),
      };
    });
  }

  async list(organizationId: string, query: ListChargesDto) {
    const competence = query.competence
      ? this.parseCompetence(query.competence)
      : undefined;
    const where: Prisma.ChargeWhereInput = {
      organizationId,
      status: query.status,
      type: query.type,
      competence,
      leaseId: query.leaseId,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.charge.findMany({
        where,
        include: chargeInclude,
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.charge.count({ where }),
    ]);
    return createPaginatedResponse(
      this.withDerivedStatus(data),
      totalItems,
      query,
    );
  }

  async findOne(organizationId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, organizationId },
      include: chargeInclude,
    });
    if (!charge) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Cobrança não encontrada.',
      });
    }
    return this.withDerivedStatus([charge])[0];
  }

  async addAdjustment(
    organizationId: string,
    chargeId: string,
    input: AddChargeAdjustmentDto,
    auditContext: AuditContext,
  ) {
    const amount = new Prisma.Decimal(input.amount);
    return this.prisma.withTransaction(async (tx) => {
      await this.lockCharge(tx, organizationId, chargeId);
      const current = await tx.charge.findFirst({
        where: { id: chargeId, organizationId },
        include: chargeInclude,
      });
      if (!current) throw this.notFound();
      this.assertOpen(current.status);

      const summary = this.financialSummary(current);
      if (
        input.type === ChargeAdjustmentType.DISCOUNT &&
        summary.totalAmount.lessThan(amount)
      ) {
        throw new BadRequestException({
          code: 'CHARGE_DISCOUNT_EXCEEDS_TOTAL',
          message: 'O desconto nÃ£o pode tornar o total da cobranÃ§a negativo.',
        });
      }

      const adjustment = await tx.chargeAdjustment.create({
        data: {
          organizationId,
          chargeId,
          type: input.type,
          amount,
          reason: input.reason,
        },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CHARGE_ADJUSTMENT_ADDED',
          entityType: 'ChargeAdjustment',
          entityId: adjustment.id,
          newData: {
            chargeId,
            type: input.type,
            amount: amount.toFixed(2),
            reason: input.reason,
          },
        },
        tx,
      );
      return this.findOneInTransaction(tx, organizationId, chargeId);
    });
  }

  async cancelAdjustment(
    organizationId: string,
    chargeId: string,
    adjustmentId: string,
    auditContext: AuditContext,
  ) {
    return this.prisma.withTransaction(async (tx) => {
      await this.lockCharge(tx, organizationId, chargeId);
      const current = await tx.charge.findFirst({
        where: { id: chargeId, organizationId },
        include: chargeInclude,
      });
      if (!current) throw this.notFound();
      this.assertOpen(current.status);
      const adjustment = current.adjustments.find(
        ({ id }) => id === adjustmentId,
      );
      if (!adjustment) {
        throw new NotFoundException({
          code: 'CHARGE_ADJUSTMENT_NOT_FOUND',
          message: 'Ajuste da cobranÃ§a nÃ£o encontrado.',
        });
      }
      if (adjustment.status !== ChargeAdjustmentStatus.ACTIVE) {
        throw new ConflictException({
          code: 'CHARGE_ADJUSTMENT_ALREADY_CANCELED',
          message: 'O ajuste jÃ¡ foi cancelado.',
        });
      }
      const summary = this.financialSummary(current);
      if (
        adjustment.type !== ChargeAdjustmentType.DISCOUNT &&
        summary.totalAmount.lessThan(adjustment.amount)
      ) {
        throw new BadRequestException({
          code: 'CHARGE_ADJUSTMENT_CANCEL_NEGATIVE_TOTAL',
          message:
            'O ajuste nÃ£o pode ser cancelado enquanto isso tornar o total negativo.',
        });
      }

      const canceledAt = new Date();
      const updated = await tx.chargeAdjustment.updateMany({
        where: {
          id: adjustmentId,
          organizationId,
          chargeId,
          status: ChargeAdjustmentStatus.ACTIVE,
        },
        data: { status: ChargeAdjustmentStatus.CANCELED, canceledAt },
      });
      if (updated.count !== 1) {
        throw new ConflictException({
          code: 'CHARGE_ADJUSTMENT_CONFLICT',
          message: 'O ajuste foi alterado por outra operaÃ§Ã£o.',
        });
      }
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CHARGE_ADJUSTMENT_CANCELED',
          entityType: 'ChargeAdjustment',
          entityId: adjustmentId,
          previousData: {
            chargeId,
            type: adjustment.type,
            amount: adjustment.amount.toFixed(2),
            reason: adjustment.reason,
            status: adjustment.status,
          },
          newData: {
            chargeId,
            status: ChargeAdjustmentStatus.CANCELED,
            canceledAt: canceledAt.toISOString(),
          },
        },
        tx,
      );
      return this.findOneInTransaction(tx, organizationId, chargeId);
    });
  }

  private withDerivedStatus<
    T extends {
      status: ChargeStatus;
      dueDate: Date;
      baseAmount: Prisma.Decimal;
      adjustments: Array<{
        type: ChargeAdjustmentType;
        amount: Prisma.Decimal;
        status: ChargeAdjustmentStatus;
      }>;
      paymentProofs: Array<{
        document: { sizeBytes: bigint };
      }>;
    },
  >(charges: T[]) {
    const today = this.todayInBusinessTimezone();
    return charges.map((charge) => {
      const summary = this.financialSummary(charge);
      return {
        ...charge,
        paymentProofs: charge.paymentProofs.map((proof) => ({
          ...proof,
          document: {
            ...proof.document,
            sizeBytes: Number(proof.document.sizeBytes),
          },
        })),
        ...summary,
        isOverdue:
          charge.status === ChargeStatus.OPEN && charge.dueDate < today,
      };
    });
  }

  private financialSummary(charge: {
    baseAmount: Prisma.Decimal;
    adjustments: Array<{
      type: ChargeAdjustmentType;
      amount: Prisma.Decimal;
      status: ChargeAdjustmentStatus;
    }>;
  }) {
    const active = charge.adjustments.filter(
      ({ status }) => status === ChargeAdjustmentStatus.ACTIVE,
    );
    const sum = (type: ChargeAdjustmentType) =>
      active
        .filter((adjustment) => adjustment.type === type)
        .reduce(
          (total, adjustment) => total.plus(adjustment.amount),
          new Prisma.Decimal(0),
        );
    const fineAmount = sum(ChargeAdjustmentType.FINE);
    const interestAmount = sum(ChargeAdjustmentType.INTEREST);
    const discountAmount = sum(ChargeAdjustmentType.DISCOUNT);
    return {
      fineAmount,
      interestAmount,
      discountAmount,
      totalAmount: charge.baseAmount
        .plus(fineAmount)
        .plus(interestAmount)
        .minus(discountAmount),
    };
  }

  private async lockCharge(
    tx: Prisma.TransactionClient,
    organizationId: string,
    chargeId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "charges" WHERE "id" = ${chargeId}::uuid AND "organization_id" = ${organizationId}::uuid FOR UPDATE`,
    );
  }

  private async findOneInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    chargeId: string,
  ) {
    const charge = await tx.charge.findFirstOrThrow({
      where: { id: chargeId, organizationId },
      include: chargeInclude,
    });
    return this.withDerivedStatus([charge])[0];
  }

  private assertOpen(status: ChargeStatus) {
    if (status !== ChargeStatus.OPEN) {
      throw new ConflictException({
        code: 'CHARGE_NOT_OPEN',
        message: 'Somente cobranÃ§as abertas podem receber ajustes.',
      });
    }
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'CobranÃ§a nÃ£o encontrada.',
    });
  }

  private todayInBusinessTimezone() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return new Date(
      Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)),
    );
  }

  private parseCompetence(value: string) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    const year = Number(match?.[1]);
    const month = Number(match?.[2]);
    if (!match || year < 2000 || year > 9999 || month < 1 || month > 12) {
      throw new BadRequestException({
        code: 'CHARGE_COMPETENCE_INVALID',
        message: 'Informe uma competência mensal válida no formato AAAA-MM.',
      });
    }
    return new Date(Date.UTC(year, month - 1, 1));
  }
}
