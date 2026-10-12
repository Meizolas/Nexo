import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartyType, Prisma } from '@prisma/client';
import { AuditService, RecordAuditEventInput } from '../audit/audit.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { CreatePartyDto } from './dto/create-party.dto.js';
import { ListPartiesDto } from './dto/list-parties.dto.js';
import { UpdatePartyDto } from './dto/update-party.dto.js';
import { isValidCnpj, isValidCpf } from './party-identifiers.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const partyInclude = { roles: { select: { role: true } } } as const;

@Injectable()
export class PartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    input: CreatePartyDto,
    auditContext: AuditContext,
  ) {
    this.validateTaxId(input.type, input.taxId);

    try {
      return await this.prisma.withTransaction(async (transaction) => {
        const party = await transaction.party.create({
          data: {
            organizationId,
            type: input.type,
            name: input.name,
            taxId: input.taxId,
            email: input.email,
            phone: input.phone,
            roles: { create: input.roles.map((role) => ({ role })) },
          },
          include: partyInclude,
        });

        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PARTY_CREATED',
            entityType: 'Party',
            entityId: party.id,
            newData: this.auditData(party),
          },
          transaction,
        );
        return party;
      });
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async list(organizationId: string, query: ListPartiesDto) {
    const search = query.search?.trim();
    const searchDigits = search?.replace(/\D/g, '');
    const where: Prisma.PartyWhereInput = {
      organizationId,
      deletedAt: null,
      type: query.type,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            ...(searchDigits ? [{ taxId: { contains: searchDigits } }] : []),
          ]
        : undefined,
      roles: query.role ? { some: { role: query.role } } : undefined,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.party.findMany({
        where,
        include: partyInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.party.count({ where }),
    ]);

    return createPaginatedResponse(data, totalItems, query);
  }

  async findOne(organizationId: string, id: string) {
    const party = await this.prisma.party.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: partyInclude,
    });
    if (!party) throw this.notFound();
    return party;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdatePartyDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, id);
    const type = input.type ?? current.type;
    const taxId = input.taxId === undefined ? current.taxId : input.taxId;
    this.validateTaxId(type, taxId ?? undefined);

    try {
      return await this.prisma.withTransaction(async (transaction) => {
        const party = await transaction.party.update({
          where: { id },
          data: {
            type: input.type,
            name: input.name,
            taxId: input.taxId,
            email: input.email,
            phone: input.phone,
            roles: input.roles
              ? {
                  deleteMany: {},
                  create: input.roles.map((role) => ({ role })),
                }
              : undefined,
          },
          include: partyInclude,
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PARTY_UPDATED',
            entityType: 'Party',
            entityId: id,
            previousData: this.auditData(current),
            newData: this.auditData(party),
          },
          transaction,
        );
        return party;
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
      await transaction.party.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'PARTY_DELETED',
          entityType: 'Party',
          entityId: id,
          previousData: this.auditData(current),
        },
        transaction,
      );
    });
  }

  private validateTaxId(type: PartyType, taxId?: string): void {
    if (!taxId) return;
    const valid =
      type === PartyType.PERSON ? isValidCpf(taxId) : isValidCnpj(taxId);
    if (!valid) {
      throw new BadRequestException({
        code: 'INVALID_TAX_ID',
        message: type === PartyType.PERSON ? 'CPF inválido.' : 'CNPJ inválido.',
      });
    }
  }

  private auditData(party: {
    id: string;
    type: PartyType;
    name: string;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    roles: Array<{ role: string }>;
  }): Prisma.InputJsonObject {
    return {
      id: party.id,
      type: party.type,
      name: party.name,
      taxId: party.taxId,
      email: party.email,
      phone: party.phone,
      roles: party.roles.map(({ role }) => role),
    };
  }

  private rethrowKnownConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PARTY_TAX_ID_CONFLICT',
        message: 'CPF ou CNPJ já cadastrado nesta organização.',
      });
    }
    throw error;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
  }
}
