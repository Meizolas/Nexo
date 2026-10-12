import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export interface RecordAuditEventInput {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  correlationId: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: RecordAuditEventInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    const database = transaction ?? this.prisma;
    await database.auditEvent.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        entityId: input.entityId,
        entityType: input.entityType,
        ipAddress: input.ipAddress,
        newData: input.newData,
        organizationId: input.organizationId,
        previousData: input.previousData,
        userAgent: input.userAgent,
      },
    });
  }
}
