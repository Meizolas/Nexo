import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, PartyRoleCode, RoleCode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { UploadDocumentDto } from '../documents/dto/upload-document.dto.js';
import { CreateLegalServiceRequestDto } from './dto/create-legal-service-request.dto.js';
import { ManagePartyLinkDto } from './dto/manage-party-link.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;
const CASE_CONTEXT = 'LEGAL_CASE';

@Injectable()
export class LegalPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly documents: DocumentsService,
  ) {}

  async listCases(organizationId: string, userId: string) {
    const links = await this.prisma.partyUserLink.findMany({
      where: {
        organizationId,
        userId,
        revokedAt: null,
        user: {
          status: 'ACTIVE',
          memberships: {
            some: {
              organizationId,
              status: 'ACTIVE',
              roles: { some: { role: RoleCode.CLIENT } },
            },
          },
        },
        party: {
          deletedAt: null,
          roles: { some: { role: PartyRoleCode.CLIENT } },
        },
      },
      select: { partyId: true },
    });
    const partyIds = [...new Set(links.map(({ partyId }) => partyId))];
    if (!partyIds.length) return [];

    const cases = await this.prisma.legalCase.findMany({
      where: {
        organizationId,
        deletedAt: null,
        parties: { some: { partyId: { in: partyIds }, role: 'CLIENT' } },
      },
      select: {
        id: true,
        caseNumber: true,
        subject: true,
        clientSummary: true,
        tribunal: true,
        district: true,
        movements: {
          where: {
            isPublished: true,
            clientDescription: { not: null },
            deletedAt: null,
          },
          select: { id: true, occurredAt: true, clientDescription: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        },
        hearings: {
          where: {
            status: 'SCHEDULED',
            isClientVisible: true,
            scheduledAt: { gte: new Date() },
            deletedAt: null,
          },
          select: { id: true, title: true, scheduledAt: true, location: true },
          orderBy: { scheduledAt: 'asc' },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const documents = await this.prisma.document.findMany({
      where: {
        organizationId,
        contextType: CASE_CONTEXT,
        contextId: { in: cases.map(({ id }) => id) },
        visibility: 'CLIENT_VISIBLE',
        status: DocumentStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        contextId: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const documentsByCase = new Map<string, typeof documents>();
    for (const document of documents) {
      if (!document.contextId) continue;
      const current = documentsByCase.get(document.contextId) ?? [];
      current.push(document);
      documentsByCase.set(document.contextId, current);
    }

    return cases.map((legalCase) => ({
      ...legalCase,
      documents: (documentsByCase.get(legalCase.id) ?? []).map(
        ({ contextId: _contextId, sizeBytes, ...document }) => ({
          ...document,
          sizeBytes: Number(sizeBytes),
        }),
      ),
    }));
  }

  async listPartyAccess(organizationId: string) {
    return this.prisma.partyUserLink.findMany({
      where: { organizationId, revokedAt: null },
      select: {
        id: true,
        partyId: true,
        userId: true,
        party: { select: { name: true } },
        user: { select: { displayName: true } },
      },
      orderBy: [{ party: { name: 'asc' } }, { user: { displayName: 'asc' } }],
    });
  }

  async createDocumentDownloadUrl(
    organizationId: string,
    userId: string,
    documentId: string,
    auditContext: AuditContext,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
        contextType: CASE_CONTEXT,
        visibility: 'CLIENT_VISIBLE',
        status: DocumentStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, contextId: true },
    });
    if (!document?.contextId) throw this.notFound();
    const linkedCase = await this.prisma.legalCase.findFirst({
      where: {
        id: document.contextId,
        organizationId,
        deletedAt: null,
        parties: {
          some: {
            role: 'CLIENT',
            party: {
              deletedAt: null,
              roles: { some: { role: PartyRoleCode.CLIENT } },
              portalLinks: {
                some: {
                  userId,
                  organizationId,
                  revokedAt: null,
                  user: {
                    status: 'ACTIVE',
                    memberships: {
                      some: {
                        organizationId,
                        status: 'ACTIVE',
                        roles: { some: { role: RoleCode.CLIENT } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!linkedCase) throw this.notFound();
    return this.documents.createDownloadUrl(
      organizationId,
      document.id,
      auditContext,
    );
  }

  async uploadClientDocument(
    organizationId: string,
    userId: string,
    caseId: string,
    file: Express.Multer.File | undefined,
    auditContext: AuditContext,
  ) {
    await this.assertClientCaseAccess(organizationId, userId, caseId);
    const documentInput = Object.assign(new UploadDocumentDto(), {
      visibility: 'INTERNAL',
      contextType: CASE_CONTEXT,
      contextId: caseId,
    });
    return this.documents.upload(
      organizationId,
      userId,
      file,
      documentInput,
      auditContext,
    );
  }

  async createServiceRequest(
    organizationId: string,
    userId: string,
    caseId: string,
    input: CreateLegalServiceRequestDto,
    auditContext: AuditContext,
  ) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        parties: {
          some: {
            role: 'CLIENT',
            party: {
              deletedAt: null,
              roles: { some: { role: PartyRoleCode.CLIENT } },
              portalLinks: {
                some: {
                  organizationId,
                  userId,
                  revokedAt: null,
                  user: {
                    status: 'ACTIVE',
                    memberships: {
                      some: {
                        organizationId,
                        status: 'ACTIVE',
                        roles: { some: { role: RoleCode.CLIENT } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        subject: true,
        lawyers: {
          select: {
            userId: true,
            user: {
              select: {
                status: true,
                memberships: {
                  where: {
                    organizationId,
                    status: 'ACTIVE',
                    roles: { some: { role: RoleCode.LAWYER } },
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!legalCase) throw this.notFound();
    const recipients = [
      ...new Set(
        legalCase.lawyers
          .filter(
            ({ user }) =>
              user.status === 'ACTIVE' && user.memberships.length > 0,
          )
          .map(({ userId: recipientId }) => recipientId),
      ),
    ];
    if (!recipients.length) {
      throw new BadRequestException({
        code: 'LEGAL_CASE_NO_ACTIVE_LAWYER',
        message:
          'Não há profissional ativo associado para receber a solicitação.',
      });
    }

    return this.prisma.withTransaction(async (tx) => {
      const notifications = await Promise.all(
        recipients.map((recipientUserId) =>
          tx.notification.create({
            data: {
              organizationId,
              recipientUserId,
              type: 'LEGAL_CLIENT_SERVICE_REQUEST',
              title: `Solicitação do cliente: ${input.subject.trim()}`.slice(
                0,
                160,
              ),
              body: `${input.message.trim()}\n\nProcesso: ${legalCase.subject}`.slice(
                0,
                2000,
              ),
              data: { legalCaseId: legalCase.id, requestedByUserId: userId },
            },
            select: { id: true },
          }),
        ),
      );
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEGAL_CLIENT_SERVICE_REQUESTED',
          entityType: 'LegalCase',
          entityId: legalCase.id,
          newData: { notificationCount: notifications.length },
        },
        tx,
      );
      return { accepted: true };
    });
  }

  async grantPartyAccess(
    organizationId: string,
    actorUserId: string,
    input: ManagePartyLinkDto,
    auditContext: AuditContext,
  ) {
    const [party, membership] = await Promise.all([
      this.prisma.party.findFirst({
        where: {
          id: input.partyId,
          organizationId,
          deletedAt: null,
          roles: { some: { role: PartyRoleCode.CLIENT } },
        },
        select: { id: true },
      }),
      this.prisma.membership.findFirst({
        where: {
          organizationId,
          userId: input.userId,
          status: 'ACTIVE',
          roles: { some: { role: RoleCode.CLIENT } },
          user: { status: 'ACTIVE' },
        },
        select: { id: true },
      }),
    ]);
    if (!party || !membership)
      throw new BadRequestException({
        code: 'PORTAL_LINK_TARGET_INVALID',
        message:
          'A parte deve ser cliente e o usuário precisa ter vínculo ativo com papel CLIENT nesta organização.',
      });

    return this.prisma.withTransaction(async (tx) => {
      const existing = await tx.partyUserLink.findUnique({
        where: {
          organizationId_partyId_userId: {
            organizationId,
            partyId: input.partyId,
            userId: input.userId,
          },
        },
      });
      const link = existing
        ? await tx.partyUserLink.update({
            where: { id: existing.id },
            data: { revokedAt: null, grantedByUserId: actorUserId },
          })
        : await tx.partyUserLink.create({
            data: {
              organizationId,
              partyId: input.partyId,
              userId: input.userId,
              grantedByUserId: actorUserId,
            },
          });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: existing?.revokedAt
            ? 'LEGAL_PORTAL_ACCESS_RESTORED'
            : existing
              ? 'LEGAL_PORTAL_ACCESS_CONFIRMED'
              : 'LEGAL_PORTAL_ACCESS_GRANTED',
          entityType: 'PartyUserLink',
          entityId: link.id,
          newData: { partyId: link.partyId, userId: link.userId },
        },
        tx,
      );
      return {
        id: link.id,
        partyId: link.partyId,
        userId: link.userId,
        active: !link.revokedAt,
      };
    });
  }

  async revokePartyAccess(
    organizationId: string,
    id: string,
    auditContext: AuditContext,
  ) {
    const link = await this.prisma.partyUserLink.findFirst({
      where: { id, organizationId, revokedAt: null },
    });
    if (!link) throw this.notFound();
    await this.prisma.withTransaction(async (tx) => {
      await tx.partyUserLink.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'LEGAL_PORTAL_ACCESS_REVOKED',
          entityType: 'PartyUserLink',
          entityId: id,
          previousData: { partyId: link.partyId, userId: link.userId },
          newData: { revoked: true },
        },
        tx,
      );
    });
  }

  private notFound() {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
  }

  private async assertClientCaseAccess(
    organizationId: string,
    userId: string,
    caseId: string,
  ) {
    const legalCase = await this.prisma.legalCase.findFirst({
      where: {
        id: caseId,
        organizationId,
        deletedAt: null,
        parties: {
          some: {
            role: 'CLIENT',
            party: {
              deletedAt: null,
              roles: { some: { role: PartyRoleCode.CLIENT } },
              portalLinks: {
                some: {
                  organizationId,
                  userId,
                  revokedAt: null,
                  user: {
                    status: 'ACTIVE',
                    memberships: {
                      some: {
                        organizationId,
                        status: 'ACTIVE',
                        roles: { some: { role: RoleCode.CLIENT } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    if (!legalCase) throw this.notFound();
  }
}
