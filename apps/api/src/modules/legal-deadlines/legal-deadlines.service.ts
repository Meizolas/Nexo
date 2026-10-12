import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { CreateLegalDeadlineDto } from './dto/create-legal-deadline.dto.js';
import { UpdateLegalDeadlineDto } from './dto/update-legal-deadline.dto.js';
import { ResolveLegalDeadlineDto } from './dto/resolve-legal-deadline.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;
const include = {
  assignedTo: { select: { id: true, displayName: true } },
  completedBy: { select: { id: true, displayName: true } },
} satisfies Prisma.LegalDeadlineInclude;

@Injectable()
export class LegalDeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, caseId?: string, overdue = false) {
    const now = new Date();
    const where: Prisma.LegalDeadlineWhereInput = {
      organizationId,
      deletedAt: null,
      ...(caseId ? { legalCaseId: caseId } : {}),
      ...(overdue ? { status: 'OPEN', dueAt: { lte: now } } : {}),
    };
    const deadlines = await this.prisma.legalDeadline.findMany({
      where,
      include,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      take: 200,
    });
    return deadlines.map((deadline) => ({
      ...deadline,
      isOverdue: deadline.status === 'OPEN' && deadline.dueAt <= now,
    }));
  }

  async create(
    organizationId: string,
    caseId: string,
    input: CreateLegalDeadlineDto,
    auditContext: AuditContext,
  ) {
    await this.assertCase(organizationId, caseId);
    await this.assertMember(organizationId, input.assignedToUserId);
    return this.prisma.withTransaction(async (tx) => {
      const item = await tx.legalDeadline.create({
        data: {
          organizationId,
          legalCaseId: caseId,
          title: input.title,
          description: input.description,
          dueAt: new Date(input.dueAt),
          priority: input.priority,
          assignedToUserId: input.assignedToUserId,
        },
        include,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEGAL_DEADLINE_CREATED',
          entityType: 'LegalDeadline',
          entityId: item.id,
          newData: this.auditData(item),
        },
        tx,
      );
      return item;
    });
  }

  async update(
    organizationId: string,
    caseId: string,
    id: string,
    input: UpdateLegalDeadlineDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, caseId, id);
    if (current.status !== 'OPEN')
      throw new BadRequestException({
        code: 'DEADLINE_ALREADY_RESOLVED',
        message: 'Prazo tratado não pode ser alterado.',
      });
    if (!Object.keys(input).length)
      throw new BadRequestException({
        code: 'DEADLINE_UPDATE_EMPTY',
        message: 'Informe ao menos um campo para atualizar.',
      });
    if (input.assignedToUserId)
      await this.assertMember(organizationId, input.assignedToUserId);
    return this.prisma.withTransaction(async (tx) => {
      const item = await tx.legalDeadline.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
          priority: input.priority,
          assignedToUserId: input.assignedToUserId,
        },
        include,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEGAL_DEADLINE_UPDATED',
          entityType: 'LegalDeadline',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(item),
        },
        tx,
      );
      return item;
    });
  }

  async resolve(
    organizationId: string,
    caseId: string,
    id: string,
    userId: string,
    input: ResolveLegalDeadlineDto,
    auditContext: AuditContext,
  ) {
    const current = await this.findOne(organizationId, caseId, id);
    if (current.status !== 'OPEN')
      throw new BadRequestException({
        code: 'DEADLINE_ALREADY_RESOLVED',
        message: 'Prazo já tratado.',
      });
    return this.prisma.withTransaction(async (tx) => {
      const item = await tx.legalDeadline.update({
        where: { id },
        data: {
          status: input.status,
          resolutionNote: input.resolutionNote,
          completedByUserId: userId,
          completedAt: new Date(),
        },
        include,
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action:
            input.status === 'COMPLETED'
              ? 'LEGAL_DEADLINE_COMPLETED'
              : 'LEGAL_DEADLINE_DISMISSED',
          entityType: 'LegalDeadline',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(item),
        },
        tx,
      );
      return item;
    });
  }

  private async assertCase(organizationId: string, caseId: string) {
    const found = await this.prisma.legalCase.findFirst({
      where: { id: caseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!found) throw this.notFound();
  }
  private async assertMember(organizationId: string, userId: string) {
    const found = await this.prisma.membership.findFirst({
      where: { organizationId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!found)
      throw new BadRequestException({
        code: 'DEADLINE_ASSIGNEE_NOT_MEMBER',
        message: 'Responsável deve pertencer à organização.',
      });
  }
  private async findOne(organizationId: string, caseId: string, id: string) {
    const found = await this.prisma.legalDeadline.findFirst({
      where: { id, organizationId, legalCaseId: caseId, deletedAt: null },
      include,
    });
    if (!found) throw this.notFound();
    return found;
  }
  private auditData(item: {
    id: string;
    dueAt: Date;
    status: string;
    priority: string;
    assignedToUserId: string;
    completedAt: Date | null;
    resolutionNote: string | null;
  }): Prisma.InputJsonObject {
    return {
      id: item.id,
      dueAt: item.dueAt.toISOString(),
      status: item.status,
      priority: item.priority,
      assignedToUserId: item.assignedToUserId,
      ...(item.completedAt
        ? { completedAt: item.completedAt.toISOString() }
        : {}),
      ...(item.resolutionNote ? { resolutionNote: item.resolutionNote } : {}),
    };
  }
  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Prazo não encontrado.',
    });
  }
}
