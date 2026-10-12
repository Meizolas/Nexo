import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  PartyRoleCode,
  Prisma,
  RoleCode,
  UserStatus,
} from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { isValidCnjNumber } from './cnj-number.js';
import type { CasePartyInputDto } from './dto/case-party-input.dto.js';
import { CreateLegalCaseDto } from './dto/create-legal-case.dto.js';
import { ListLegalCasesDto } from './dto/list-legal-cases.dto.js';
import { UpdateLegalCaseDto } from './dto/update-legal-case.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const legalCaseInclude = {
  parties: {
    orderBy: { createdAt: 'asc' },
    include: {
      party: {
        select: { id: true, type: true, name: true, taxId: true },
      },
    },
  },
  lawyers: {
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    include: {
      user: { select: { id: true, displayName: true, email: true } },
    },
  },
} satisfies Prisma.LegalCaseInclude;

@Injectable()
export class LegalCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    input: CreateLegalCaseDto,
    auditContext: AuditContext,
  ) {
    this.validateCaseNumber(input.caseNumber);
    await Promise.all([
      this.validateParties(organizationId, input.parties),
      this.validateLawyer(organizationId, input.responsibleLawyerId),
    ]);

    try {
      return await this.prisma.withTransaction(async (transaction) => {
        const legalCase = await transaction.legalCase.create({
          data: {
            organizationId,
            caseNumber: input.caseNumber,
            subject: input.subject,
            tribunal: input.tribunal,
            district: input.district,
            courtDivision: input.courtDivision,
            internalNotes: input.internalNotes,
            clientSummary: input.clientSummary,
            parties: {
              create: input.parties.map(({ partyId, role }) => ({
                partyId,
                role,
              })),
            },
            lawyers: {
              create: { userId: input.responsibleLawyerId, isPrimary: true },
            },
          },
          include: legalCaseInclude,
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'LEGAL_CASE_CREATED',
            entityType: 'LegalCase',
            entityId: legalCase.id,
            newData: this.auditData(legalCase),
          },
          transaction,
        );
        return legalCase;
      });
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async list(organizationId: string, query: ListLegalCasesDto) {
    const search = query.search?.trim();
    const digits = search?.replace(/\D/g, '');
    const where: Prisma.LegalCaseWhereInput = {
      organizationId,
      deletedAt: null,
      parties: query.partyId ? { some: { partyId: query.partyId } } : undefined,
      lawyers: query.responsibleLawyerId
        ? { some: { userId: query.responsibleLawyerId, isPrimary: true } }
        : undefined,
      OR: search
        ? [
            { subject: { contains: search, mode: 'insensitive' } },
            ...(digits && digits.length > 0
              ? [{ caseNumber: { contains: digits } }]
              : []),
          ]
        : undefined,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.legalCase.findMany({
        where,
        include: legalCaseInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.legalCase.count({ where }),
    ]);
    return createPaginatedResponse(data, totalItems, query);
  }

  async listLawyers(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
        roles: { some: { role: RoleCode.LAWYER } },
      },
      select: {
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { user: { displayName: 'asc' } },
    });
    return memberships.map(({ user }) => ({
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
    }));
  }

  async findOne(organizationId: string, id: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: legalCaseInclude,
    });
    if (!legalCase) throw this.notFound();
    return legalCase;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateLegalCaseDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, id);
    this.validateCaseNumber(input.caseNumber);
    await Promise.all([
      input.parties
        ? this.validateParties(organizationId, input.parties)
        : undefined,
      input.responsibleLawyerId
        ? this.validateLawyer(organizationId, input.responsibleLawyerId)
        : undefined,
    ]);

    try {
      return await this.prisma.withTransaction(async (transaction) => {
        const legalCase = await transaction.legalCase.update({
          where: { id },
          data: {
            caseNumber: input.caseNumber,
            subject: input.subject,
            tribunal: input.tribunal,
            district: input.district,
            courtDivision: input.courtDivision,
            internalNotes: input.internalNotes,
            clientSummary: input.clientSummary,
            parties: input.parties
              ? {
                  deleteMany: {},
                  create: input.parties.map(({ partyId, role }) => ({
                    partyId,
                    role,
                  })),
                }
              : undefined,
            lawyers: input.responsibleLawyerId
              ? {
                  deleteMany: {},
                  create: {
                    userId: input.responsibleLawyerId,
                    isPrimary: true,
                  },
                }
              : undefined,
          },
          include: legalCaseInclude,
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'LEGAL_CASE_UPDATED',
            entityType: 'LegalCase',
            entityId: id,
            previousData: this.auditData(current),
            newData: this.auditData(legalCase),
          },
          transaction,
        );
        return legalCase;
      });
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async remove(
    organizationId: string,
    id: string,
    auditContext: AuditContext,
  ): Promise<void> {
    const current = await this.findOne(organizationId, id);
    await this.prisma.withTransaction(async (transaction) => {
      await transaction.legalCase.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEGAL_CASE_DELETED',
          entityType: 'LegalCase',
          entityId: id,
          previousData: this.auditData(current),
        },
        transaction,
      );
    });
  }

  private validateCaseNumber(caseNumber?: string | null): void {
    if (caseNumber && !isValidCnjNumber(caseNumber)) {
      throw new BadRequestException({
        code: 'INVALID_CNJ_NUMBER',
        message: 'Número de processo CNJ inválido.',
      });
    }
  }

  private async validateParties(
    organizationId: string,
    parties: CasePartyInputDto[],
  ): Promise<void> {
    if (!parties.some(({ role }) => role === 'CLIENT')) {
      throw new BadRequestException({
        code: 'CLIENT_PARTY_REQUIRED',
        message: 'O processo deve possuir ao menos um cliente.',
      });
    }
    const uniqueIds = [...new Set(parties.map(({ partyId }) => partyId))];
    const records = await this.prisma.party.findMany({
      where: { id: { in: uniqueIds }, organizationId, deletedAt: null },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (records.length !== uniqueIds.length) throw this.notFound();

    const clients = new Set(
      records
        .filter(({ roles }) =>
          roles.some(({ role }) => role === PartyRoleCode.CLIENT),
        )
        .map(({ id }) => id),
    );
    if (
      parties.some(
        ({ partyId, role }) => role === 'CLIENT' && !clients.has(partyId),
      )
    ) {
      throw new BadRequestException({
        code: 'PARTY_IS_NOT_CLIENT',
        message:
          'Toda parte com papel CLIENT deve estar cadastrada como cliente.',
      });
    }
  }

  private async validateLawyer(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId,
        status: MembershipStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
        roles: { some: { role: RoleCode.LAWYER } },
      },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException({
        code: 'RESPONSIBLE_LAWYER_INVALID',
        message:
          'O advogado responsável deve possuir vínculo ativo na organização.',
      });
    }
  }

  private auditData(legalCase: {
    id: string;
    caseNumber: string | null;
    subject: string;
    tribunal: string | null;
    district: string | null;
    courtDivision: string | null;
    clientSummary: string | null;
    parties: Array<{ partyId: string; role: string }>;
    lawyers: Array<{ userId: string; isPrimary: boolean }>;
  }): Prisma.InputJsonObject {
    return {
      id: legalCase.id,
      subject: legalCase.subject,
      ...(legalCase.caseNumber ? { caseNumber: legalCase.caseNumber } : {}),
      ...(legalCase.tribunal ? { tribunal: legalCase.tribunal } : {}),
      ...(legalCase.district ? { district: legalCase.district } : {}),
      ...(legalCase.courtDivision
        ? { courtDivision: legalCase.courtDivision }
        : {}),
      ...(legalCase.clientSummary
        ? { clientSummary: legalCase.clientSummary }
        : {}),
      parties: legalCase.parties.map(({ partyId, role }) => ({
        partyId,
        role,
      })),
      lawyers: legalCase.lawyers.map(({ userId, isPrimary }) => ({
        userId,
        isPrimary,
      })),
    };
  }

  private rethrowKnownConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'LEGAL_CASE_NUMBER_CONFLICT',
        message: 'Este número de processo já está cadastrado na organização.',
      });
    }
    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Processo não encontrado.',
    });
  }
}
