import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaseStatus,
  PartyRoleCode,
  Prisma,
  PropertyStatus,
  UnitStatus,
} from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { CreateLeaseDto, UpdateLeaseDto } from './dto/create-lease.dto.js';
import { EndLeaseDto } from './dto/end-lease.dto.js';
import { ListLeasesDto } from './dto/list-leases.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const leaseInclude = {
  unit: {
    include: {
      property: { select: { id: true, name: true, status: true } },
    },
  },
  tenants: {
    orderBy: [{ isFinancialResponsible: 'desc' }, { createdAt: 'asc' }],
    include: { party: { select: { id: true, name: true, type: true } } },
  },
} satisfies Prisma.LeaseInclude;

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    input: CreateLeaseDto,
    auditContext: AuditContext,
  ) {
    this.validateInput(input);
    await this.assertReferences(organizationId, input);
    const startDate = this.parseDate(input.startDate);
    const endDate = input.endDate ? this.parseDate(input.endDate) : null;
    this.assertDateRange(startDate, endDate);

    return this.prisma.withTransaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          organizationId,
          unitId: input.unitId,
          startDate,
          endDate,
          monthlyRent: new Prisma.Decimal(input.monthlyRent),
          currency: input.currency,
          dueDay: input.dueDay,
          tenants: {
            create: input.tenants.map((tenant) => ({
              organizationId,
              partyId: tenant.partyId,
              isFinancialResponsible: tenant.isFinancialResponsible,
            })),
          },
        },
        include: leaseInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEASE_CREATED',
          entityType: 'Lease',
          entityId: lease.id,
          newData: this.auditData(lease),
        },
        tx,
      );
      return lease;
    });
  }

  async list(organizationId: string, query: ListLeasesDto) {
    const where: Prisma.LeaseWhereInput = {
      organizationId,
      status: query.status,
      unitId: query.unitId,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.lease.findMany({
        where,
        include: leaseInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.lease.count({ where }),
    ]);
    return createPaginatedResponse(data, totalItems, query);
  }

  async findOne(organizationId: string, id: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id, organizationId },
      include: leaseInclude,
    });
    if (!lease) throw this.notFound();
    return lease;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateLeaseDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, id);
    this.assertStatus(current.status, LeaseStatus.DRAFT);
    this.validateInput(input);
    await this.assertReferences(organizationId, input);
    const startDate = this.parseDate(input.startDate);
    const endDate = input.endDate ? this.parseDate(input.endDate) : null;
    this.assertDateRange(startDate, endDate);

    return this.prisma.withTransaction(async (tx) => {
      const updated = await tx.lease.updateMany({
        where: { id, organizationId, status: LeaseStatus.DRAFT },
        data: {
          unitId: input.unitId,
          startDate,
          endDate,
          monthlyRent: new Prisma.Decimal(input.monthlyRent),
          currency: input.currency,
          dueDay: input.dueDay,
        },
      });
      if (updated.count !== 1) {
        throw this.transitionConflict(LeaseStatus.DRAFT);
      }
      await tx.leaseTenant.deleteMany({ where: { leaseId: id } });
      await tx.leaseTenant.createMany({
        data: input.tenants.map((tenant) => ({
          organizationId,
          leaseId: id,
          partyId: tenant.partyId,
          isFinancialResponsible: tenant.isFinancialResponsible,
        })),
      });
      const lease = await tx.lease.findUniqueOrThrow({
        where: { id },
        include: leaseInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEASE_UPDATED',
          entityType: 'Lease',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(lease),
        },
        tx,
      );
      return lease;
    });
  }

  async activate(
    organizationId: string,
    id: string,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, id);
    this.assertStatus(current.status, LeaseStatus.DRAFT);
    await this.assertReferences(organizationId, {
      unitId: current.unitId,
      tenants: current.tenants.map((tenant) => ({
        partyId: tenant.partyId,
        isFinancialResponsible: tenant.isFinancialResponsible,
      })),
    });

    const overlap = await this.prisma.lease.findFirst({
      where: {
        organizationId,
        unitId: current.unitId,
        status: LeaseStatus.ACTIVE,
        ...(current.endDate ? { startDate: { lte: current.endDate } } : {}),
        OR: [{ endDate: null }, { endDate: { gte: current.startDate } }],
      },
      select: { id: true },
    });
    if (overlap) throw this.overlapConflict();

    try {
      return await this.transition(
        current,
        LeaseStatus.ACTIVE,
        { activatedAt: new Date() },
        'LEASE_ACTIVATED',
        auditContext,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2004' || error.code === 'P2002')
      ) {
        throw this.overlapConflict();
      }
      throw error;
    }
  }

  async cancel(organizationId: string, id: string, auditContext: AuditContext) {
    const current = await this.findOne(organizationId, id);
    this.assertStatus(current.status, LeaseStatus.DRAFT);
    return this.transition(
      current,
      LeaseStatus.CANCELED,
      { canceledAt: new Date() },
      'LEASE_CANCELED',
      auditContext,
    );
  }

  async end(
    organizationId: string,
    id: string,
    input: EndLeaseDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, id);
    this.assertStatus(current.status, LeaseStatus.ACTIVE);
    const endDate = this.parseDate(input.endDate);
    this.assertDateRange(current.startDate, endDate);
    return this.transition(
      current,
      LeaseStatus.ENDED,
      { endDate, endedAt: new Date() },
      'LEASE_ENDED',
      auditContext,
    );
  }

  private async transition(
    current: Prisma.LeaseGetPayload<{ include: typeof leaseInclude }>,
    status: LeaseStatus,
    data: Prisma.LeaseUpdateManyMutationInput,
    action: string,
    auditContext: AuditContext,
  ) {
    return this.prisma.withTransaction(async (tx) => {
      const updated = await tx.lease.updateMany({
        where: {
          id: current.id,
          organizationId: current.organizationId,
          status: current.status,
        },
        data: { ...data, status },
      });
      if (updated.count !== 1) {
        throw this.transitionConflict(current.status);
      }
      const lease = await tx.lease.findUniqueOrThrow({
        where: { id: current.id },
        include: leaseInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId: current.organizationId,
          action,
          entityType: 'Lease',
          entityId: current.id,
          previousData: this.auditData(current),
          newData: this.auditData(lease),
        },
        tx,
      );
      return lease;
    });
  }

  private validateInput(input: Pick<CreateLeaseDto, 'tenants'>) {
    const tenantIds = input.tenants.map(({ partyId }) => partyId);
    if (new Set(tenantIds).size !== tenantIds.length) {
      throw new BadRequestException({
        code: 'LEASE_TENANT_DUPLICATED',
        message: 'Um locatário não pode aparecer mais de uma vez no contrato.',
      });
    }
    if (
      input.tenants.filter(({ isFinancialResponsible }) =>
        Boolean(isFinancialResponsible),
      ).length !== 1
    ) {
      throw new BadRequestException({
        code: 'LEASE_FINANCIAL_RESPONSIBLE_INVALID',
        message:
          'O contrato deve possuir exatamente um responsável financeiro.',
      });
    }
  }

  private async assertReferences(
    organizationId: string,
    input: Pick<CreateLeaseDto, 'unitId' | 'tenants'>,
  ) {
    const [unit, tenants] = await Promise.all([
      this.prisma.unit.findFirst({
        where: {
          id: input.unitId,
          organizationId,
          status: UnitStatus.ACTIVE,
          deletedAt: null,
          property: {
            status: PropertyStatus.ACTIVE,
            deletedAt: null,
          },
        },
        select: { id: true },
      }),
      this.prisma.party.findMany({
        where: {
          organizationId,
          id: { in: input.tenants.map(({ partyId }) => partyId) },
          deletedAt: null,
          roles: { some: { role: PartyRoleCode.TENANT } },
        },
        select: { id: true },
      }),
    ]);
    if (!unit) {
      throw new BadRequestException({
        code: 'LEASE_UNIT_INVALID',
        message: 'A unidade deve estar ativa nesta organização.',
      });
    }
    if (tenants.length !== input.tenants.length) {
      throw new BadRequestException({
        code: 'LEASE_TENANT_INVALID',
        message:
          'Todos os locatários devem estar ativos e possuir papel TENANT nesta organização.',
      });
    }
  }

  private assertStatus(actual: LeaseStatus, expected: LeaseStatus) {
    if (actual !== expected) {
      throw this.transitionConflict(expected);
    }
  }

  private transitionConflict(expected: LeaseStatus) {
    return new ConflictException({
      code: 'LEASE_STATUS_TRANSITION_INVALID',
      message: `A operação exige contrato no estado ${expected}.`,
    });
  }

  private assertDateRange(startDate: Date, endDate: Date | null) {
    if (endDate && endDate < startDate) {
      throw new BadRequestException({
        code: 'LEASE_DATE_RANGE_INVALID',
        message: 'A data final não pode ser anterior à data inicial.',
      });
    }
  }

  private parseDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: 'LEASE_DATE_INVALID',
        message: 'Informe uma data válida.',
      });
    }
    return date;
  }

  private auditData(
    lease: Prisma.LeaseGetPayload<{ include: typeof leaseInclude }>,
  ): Prisma.InputJsonObject {
    return {
      id: lease.id,
      unitId: lease.unitId,
      status: lease.status,
      startDate: lease.startDate.toISOString().slice(0, 10),
      ...(lease.endDate
        ? { endDate: lease.endDate.toISOString().slice(0, 10) }
        : {}),
      monthlyRent: lease.monthlyRent.toString(),
      currency: lease.currency,
      dueDay: lease.dueDay,
      tenants: lease.tenants.map((tenant) => ({
        partyId: tenant.partyId,
        isFinancialResponsible: tenant.isFinancialResponsible,
      })),
    };
  }

  private overlapConflict() {
    return new ConflictException({
      code: 'LEASE_OCCUPANCY_OVERLAP',
      message:
        'Já existe um contrato ativo com período sobreposto para esta unidade.',
    });
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Contrato não encontrado.',
    });
  }
}
