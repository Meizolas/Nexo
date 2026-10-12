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
import { CreateHearingDto } from './dto/create-hearing.dto.js';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

@Injectable()
export class HearingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, caseId: string) {
    await this.assertCase(organizationId, caseId);
    return this.prisma.hearing.findMany({
      where: { organizationId, legalCaseId: caseId, deletedAt: null },
      orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
    });
  }

  async create(
    organizationId: string,
    caseId: string,
    input: CreateHearingDto,
    auditContext: AuditContext,
  ) {
    await this.assertCase(organizationId, caseId);
    return this.prisma.withTransaction(async (tx) => {
      const hearing = await tx.hearing.create({
        data: {
          organizationId,
          legalCaseId: caseId,
          title: input.title,
          scheduledAt: new Date(input.scheduledAt),
          isClientVisible: input.isClientVisible,
          location: input.location,
          notes: input.notes,
        },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'HEARING_SCHEDULED',
          entityType: 'Hearing',
          entityId: hearing.id,
          newData: this.auditData(hearing),
        },
        tx,
      );
      return hearing;
    });
  }

  async updateStatus(
    organizationId: string,
    caseId: string,
    id: string,
    input: UpdateHearingStatusDto,
    auditContext: AuditContext,
  ) {
    const current = await this.prisma.hearing.findFirst({
      where: { id, organizationId, legalCaseId: caseId, deletedAt: null },
    });
    if (!current) throw this.notFound();
    if (current.status !== 'SCHEDULED')
      throw new BadRequestException({
        code: 'HEARING_ALREADY_TREATED',
        message: 'Audiência já tratada.',
      });
    return this.prisma.withTransaction(async (tx) => {
      const hearing = await tx.hearing.update({
        where: { id },
        data: { status: input.status, resolutionNote: input.resolutionNote },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action:
            input.status === 'COMPLETED'
              ? 'HEARING_COMPLETED'
              : 'HEARING_CANCELED',
          entityType: 'Hearing',
          entityId: id,
          previousData: this.auditData(current),
          newData: this.auditData(hearing),
        },
        tx,
      );
      return hearing;
    });
  }

  private async assertCase(organizationId: string, caseId: string) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: { id: caseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!legalCase) throw this.notFound();
  }
  private auditData(hearing: {
    id: string;
    title: string;
    scheduledAt: Date;
    status: string;
    isClientVisible: boolean;
    location: string | null;
    resolutionNote: string | null;
  }): Prisma.InputJsonObject {
    return {
      id: hearing.id,
      title: hearing.title,
      scheduledAt: hearing.scheduledAt.toISOString(),
      status: hearing.status,
      isClientVisible: hearing.isClientVisible,
      ...(hearing.location ? { location: hearing.location } : {}),
      ...(hearing.resolutionNote
        ? { resolutionNote: hearing.resolutionNote }
        : {}),
    };
  }
  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Processo ou audiência não encontrado.',
    });
  }
}
