import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartyRoleCode, Prisma, PropertyStatus } from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { CreatePropertyDto } from './dto/create-property.dto.js';
import { CreateUnitDto } from './dto/create-unit.dto.js';
import { ListPropertiesDto } from './dto/list-properties.dto.js';
import { ManageOwnerDto } from './dto/manage-owner.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const propertyInclude = {
  units: {
    where: { deletedAt: null },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  },
  ownerships: {
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    include: { party: { select: { id: true, name: true, type: true } } },
  },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    input: CreatePropertyDto,
    auditContext: AuditContext,
  ) {
    const ownerIds = [...new Set(input.ownerPartyIds)];
    const owners = await this.prisma.party.findMany({
      where: {
        organizationId,
        id: { in: ownerIds },
        deletedAt: null,
        roles: { some: { role: PartyRoleCode.OWNER } },
      },
      select: { id: true },
    });
    if (owners.length !== ownerIds.length) {
      throw new BadRequestException({
        code: 'PROPERTY_OWNER_INVALID',
        message:
          'Todos os proprietários devem ser pessoas ativas com papel OWNER nesta organização.',
      });
    }

    try {
      return await this.prisma.withTransaction(async (tx) => {
        const property = await tx.property.create({
          data: {
            organizationId,
            name: input.name,
            type: input.type,
            addressLine: input.addressLine,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            ownerships: {
              create: ownerIds.map((partyId) => ({ organizationId, partyId })),
            },
          },
          include: propertyInclude,
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PROPERTY_CREATED',
            entityType: 'Property',
            entityId: property.id,
            newData: this.auditData(property),
          },
          tx,
        );
        return property;
      });
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async list(organizationId: string, query: ListPropertiesDto) {
    const search = query.search?.trim();
    const where: Prisma.PropertyWhereInput = {
      organizationId,
      deletedAt: null,
      status: query.status ?? PropertyStatus.ACTIVE,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        include: propertyInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.property.count({ where }),
    ]);
    return createPaginatedResponse(data, totalItems, query);
  }

  async findOne(organizationId: string, id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: propertyInclude,
    });
    if (!property) throw this.notFound();
    return property;
  }

  async createUnit(
    organizationId: string,
    propertyId: string,
    input: CreateUnitDto,
    auditContext: AuditContext,
  ) {
    await this.findOne(organizationId, propertyId);
    try {
      return await this.prisma.withTransaction(async (tx) => {
        const unit = await tx.unit.create({
          data: { organizationId, propertyId, name: input.name },
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PROPERTY_UNIT_CREATED',
            entityType: 'Unit',
            entityId: unit.id,
            newData: { id: unit.id, propertyId, name: unit.name },
          },
          tx,
        );
        return unit;
      });
    } catch (error) {
      this.rethrowKnownConflict(error);
    }
  }

  async addOwner(
    organizationId: string,
    propertyId: string,
    input: ManageOwnerDto,
    auditContext: AuditContext,
  ) {
    await this.findOne(organizationId, propertyId);
    const owner = await this.prisma.party.findFirst({
      where: {
        id: input.partyId,
        organizationId,
        deletedAt: null,
        roles: { some: { role: PartyRoleCode.OWNER } },
      },
      select: { id: true, name: true },
    });
    if (!owner) {
      throw new BadRequestException({
        code: 'PROPERTY_OWNER_INVALID',
        message:
          'O proprietário deve ser uma pessoa ativa com papel OWNER nesta organização.',
      });
    }
    const existing = await this.prisma.ownership.findFirst({
      where: {
        organizationId,
        propertyId,
        partyId: input.partyId,
        endedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'PROPERTY_OWNER_ALREADY_ACTIVE',
        message: 'Este proprietário já está vinculado ao imóvel.',
      });
    }
    try {
      return await this.prisma.withTransaction(async (tx) => {
        const ownership = await tx.ownership.create({
          data: {
            organizationId,
            propertyId,
            partyId: input.partyId,
            startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
          },
        });
        await this.audit.record(
          {
            ...auditContext,
            organizationId,
            action: 'PROPERTY_OWNER_ADDED',
            entityType: 'Ownership',
            entityId: ownership.id,
            newData: {
              propertyId,
              partyId: owner.id,
              startedAt: ownership.startedAt.toISOString(),
            },
          },
          tx,
        );
        return ownership;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'PROPERTY_OWNER_ALREADY_ACTIVE',
          message: 'Este proprietário já está vinculado ao imóvel.',
        });
      }
      throw error;
    }
  }

  async endOwner(
    organizationId: string,
    propertyId: string,
    ownershipId: string,
    auditContext: AuditContext,
  ) {
    const ownership = await this.prisma.ownership.findFirst({
      where: { id: ownershipId, organizationId, propertyId, endedAt: null },
    });
    if (!ownership) throw this.notFound();
    const endedAt = new Date();
    await this.prisma.withTransaction(async (tx) => {
      await tx.ownership.update({
        where: { id: ownershipId },
        data: { endedAt },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'PROPERTY_OWNER_ENDED',
          entityType: 'Ownership',
          entityId: ownershipId,
          previousData: {
            propertyId,
            partyId: ownership.partyId,
            startedAt: ownership.startedAt.toISOString(),
          },
          newData: { endedAt: endedAt.toISOString() },
        },
        tx,
      );
    });
  }

  private auditData(property: {
    id: string;
    name: string;
    type: string;
    addressLine: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    ownerships: Array<{ partyId: string; party: { name: string } }>;
  }): Prisma.InputJsonObject {
    return {
      id: property.id,
      name: property.name,
      type: property.type,
      ...(property.addressLine ? { addressLine: property.addressLine } : {}),
      ...(property.city ? { city: property.city } : {}),
      ...(property.state ? { state: property.state } : {}),
      ...(property.postalCode ? { postalCode: property.postalCode } : {}),
      owners: property.ownerships.map(({ partyId, party }) => ({
        partyId,
        name: party.name,
      })),
    };
  }

  private rethrowKnownConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PROPERTY_UNIT_NAME_CONFLICT',
        message: 'Já existe uma unidade com esse nome neste imóvel.',
      });
    }
    throw error;
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Imóvel ou vínculo de propriedade não encontrado.',
    });
  }
}
