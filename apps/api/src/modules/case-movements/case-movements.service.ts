import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { CreateCaseMovementDto } from './dto/create-case-movement.dto.js';
import { ListCaseMovementsDto } from './dto/list-case-movements.dto.js';
import { PublishCaseMovementDto } from './dto/publish-case-movement.dto.js';
import { UpdateCaseMovementDto } from './dto/update-case-movement.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const movementInclude = {
  createdBy: { select: { id: true, displayName: true } },
  publishedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.CaseMovementInclude;

@Injectable()
export class CaseMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    legalCaseId: string,
    userId: string,
    input: CreateCaseMovementDto,
    auditContext: AuditContext,
  ) {
    await this.assertCase(organizationId, legalCaseId);
    return this.prisma.withTransaction(async (transaction) => {
      const movement = await transaction.caseMovement.create({
        data: {
          organizationId,
          legalCaseId,
          createdByUserId: userId,
          occurredAt: new Date(input.occurredAt),
          internalDescription: input.internalDescription,
          clientDescription: input.clientDescription,
        },
        include: movementInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CASE_MOVEMENT_CREATED',
          entityType: 'CaseMovement',
          entityId: movement.id,
          newData: this.auditData(movement),
        },
        transaction,
      );
      return movement;
    });
  }

  async list(
    organizationId: string,
    legalCaseId: string,
    query: ListCaseMovementsDto,
  ) {
    await this.assertCase(organizationId, legalCaseId);
    const where: Prisma.CaseMovementWhereInput = {
      organizationId,
      legalCaseId,
      deletedAt: null,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.caseMovement.findMany({
        where,
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.caseMovement.count({ where }),
    ]);
    return createPaginatedResponse(data, totalItems, query);
  }

  async update(
    organizationId: string,
    legalCaseId: string,
    id: string,
    input: UpdateCaseMovementDto,
    auditContext: AuditContext,
  ) {
    if (
      input.occurredAt === undefined &&
      input.internalDescription === undefined &&
      input.clientDescription === undefined
    ) {
      throw new BadRequestException({
        code: 'MOVEMENT_UPDATE_EMPTY',
        message: 'Informe ao menos um campo para atualizar.',
      });
    }
    const current = await this.findOne(organizationId, legalCaseId, id);
    return this.prisma.withTransaction(async (transaction) => {
      const movement = await transaction.caseMovement.update({
        where: { id },
        data: {
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
          internalDescription: input.internalDescription,
          clientDescription: input.clientDescription,
          isPublished: false,
          publishedAt: null,
          publishedByUserId: null,
        },
        include: movementInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: current.isPublished
            ? 'CASE_MOVEMENT_UPDATED_AND_UNPUBLISHED'
            : 'CASE_MOVEMENT_UPDATED',
          entityType: 'CaseMovement',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(movement),
        },
        transaction,
      );
      return movement;
    });
  }

  async publish(
    organizationId: string,
    legalCaseId: string,
    id: string,
    userId: string,
    input: PublishCaseMovementDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, legalCaseId, id);
    return this.prisma.withTransaction(async (transaction) => {
      const movement = await transaction.caseMovement.update({
        where: { id },
        data: {
          clientDescription: input.clientDescription,
          isPublished: true,
          publishedAt: new Date(),
          publishedByUserId: userId,
        },
        include: movementInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CASE_MOVEMENT_PUBLISHED',
          entityType: 'CaseMovement',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(movement),
        },
        transaction,
      );
      return movement;
    });
  }

  async unpublish(
    organizationId: string,
    legalCaseId: string,
    id: string,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, legalCaseId, id);
    return this.prisma.withTransaction(async (transaction) => {
      const movement = await transaction.caseMovement.update({
        where: { id },
        data: {
          isPublished: false,
          publishedAt: null,
          publishedByUserId: null,
        },
        include: movementInclude,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CASE_MOVEMENT_UNPUBLISHED',
          entityType: 'CaseMovement',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(movement),
        },
        transaction,
      );
      return movement;
    });
  }

  async remove(
    organizationId: string,
    legalCaseId: string,
    id: string,
    auditContext: AuditContext,
  ): Promise<void> {
    const current = await this.findOne(organizationId, legalCaseId, id);
    await this.prisma.withTransaction(async (transaction) => {
      await transaction.caseMovement.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isPublished: false,
          publishedAt: null,
          publishedByUserId: null,
        },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'CASE_MOVEMENT_DELETED',
          entityType: 'CaseMovement',
          entityId: id,
          previousData: this.auditData(current),
        },
        transaction,
      );
    });
  }

  private async assertCase(
    organizationId: string,
    legalCaseId: string,
  ): Promise<void> {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: { id: legalCaseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!legalCase) throw this.notFound();
  }

  private async findOne(
    organizationId: string,
    legalCaseId: string,
    id: string,
  ) {
    const movement = await this.prisma.caseMovement.findFirst({
      where: { id, organizationId, legalCaseId, deletedAt: null },
      include: movementInclude,
    });
    if (!movement) throw this.notFound();
    return movement;
  }

  private auditData(movement: {
    id: string;
    legalCaseId: string;
    occurredAt: Date;
    clientDescription: string | null;
    isPublished: boolean;
    publishedAt: Date | null;
  }): Prisma.InputJsonObject {
    return {
      id: movement.id,
      legalCaseId: movement.legalCaseId,
      occurredAt: movement.occurredAt.toISOString(),
      isPublished: movement.isPublished,
      hasClientDescription: Boolean(movement.clientDescription),
      ...(movement.publishedAt
        ? { publishedAt: movement.publishedAt.toISOString() }
        : {}),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Movimentação não encontrada.',
    });
  }
}
