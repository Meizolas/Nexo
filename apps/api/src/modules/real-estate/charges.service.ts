import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChargeStatus, ChargeType, LeaseStatus, Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { GenerateChargesDto } from './dto/generate-charges.dto.js';
import { ListChargesDto } from './dto/list-charges.dto.js';

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

  private withDerivedStatus<T extends { status: ChargeStatus; dueDate: Date }>(
    charges: T[],
  ) {
    const today = this.todayInBusinessTimezone();
    return charges.map((charge) => ({
      ...charge,
      isOverdue: charge.status === ChargeStatus.OPEN && charge.dueDate < today,
    }));
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
