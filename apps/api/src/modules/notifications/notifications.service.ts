import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus, Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { ListNotificationsDto } from './dto/list-notifications.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

export interface CreateNotificationInput {
  organizationId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({ data: input });
  }

  async list(
    organizationId: string,
    recipientUserId: string,
    query: ListNotificationsDto,
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientUserId,
      status: query.status,
    };
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return createPaginatedResponse(data, totalItems, query);
  }

  async markAsRead(
    organizationId: string,
    recipientUserId: string,
    id: string,
    auditContext: AuditContext,
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, organizationId, recipientUserId },
    });
    if (!notification) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Notificação não encontrada.',
      });
    }
    if (notification.status === NotificationStatus.READ) return notification;

    return this.prisma.withTransaction(async (transaction) => {
      const updated = await transaction.notification.update({
        where: { id },
        data: { status: NotificationStatus.READ, readAt: new Date() },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'NOTIFICATION_READ',
          entityType: 'Notification',
          entityId: id,
        },
        transaction,
      );
      return updated;
    });
  }
}
