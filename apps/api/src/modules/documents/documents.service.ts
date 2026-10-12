import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { createPaginatedResponse } from '../../common/pagination/paginated-response.js';
import type { EnvironmentVariables } from '../../config/environment.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  PRIVATE_STORAGE,
  type PrivateStorage,
} from '../../integrations/storage/storage.types.js';
import {
  AuditService,
  type RecordAuditEventInput,
} from '../audit/audit.service.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';

type AuditContext = Pick<
  RecordAuditEventInput,
  'actorUserId' | 'correlationId' | 'ipAddress' | 'userAgent'
>;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Map<string, readonly string[]>([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ['.docx'],
  ],
]);

@Injectable()
export class DocumentsService {
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    config: ConfigService<EnvironmentVariables, true>,
    @Inject(PRIVATE_STORAGE) private readonly storage: PrivateStorage,
  ) {
    this.bucket = config.get('SUPABASE_STORAGE_BUCKET', { infer: true });
  }

  async upload(
    organizationId: string,
    userId: string,
    file: Express.Multer.File | undefined,
    input: UploadDocumentDto,
    auditContext: AuditContext,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Selecione um arquivo para enviar.',
      });
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'O arquivo deve ter no máximo 20 MB.',
      });
    }

    const detected = await fileTypeFromBuffer(file.buffer);
    const originalExtension = extname(file.originalname).toLowerCase();
    const allowedExtensions = detected
      ? ALLOWED_TYPES.get(detected.mime)
      : undefined;
    if (
      !detected ||
      !allowedExtensions?.includes(originalExtension) ||
      file.mimetype !== detected.mime
    ) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'Formato permitido: PDF, JPEG, PNG, WebP ou DOCX.',
      });
    }

    const extension = allowedExtensions[0];
    const storagePath = `${organizationId}/${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.upload({
      bucket: this.bucket,
      path: storagePath,
      content: file.buffer,
      contentType: detected.mime,
    });

    try {
      const document = await this.prisma.withTransaction(
        async (transaction) => {
          const created = await transaction.document.create({
            data: {
              organizationId,
              uploadedByUserId: userId,
              originalName: this.safeOriginalName(file.originalname),
              storageBucket: this.bucket,
              storagePath,
              mimeType: detected.mime,
              sizeBytes: file.size,
              sha256,
              visibility: input.visibility,
              contextType: input.contextType,
              contextId: input.contextId,
            },
          });
          await this.audit.record(
            {
              ...auditContext,
              organizationId,
              action: 'DOCUMENT_UPLOADED',
              entityType: 'Document',
              entityId: created.id,
              newData: {
                originalName: created.originalName,
                mimeType: created.mimeType,
                sizeBytes: Number(created.sizeBytes),
                visibility: created.visibility,
                sha256: created.sha256,
              },
            },
            transaction,
          );
          return created;
        },
      );
      return this.serialize(document);
    } catch (error) {
      await this.storage
        .remove(this.bucket, storagePath)
        .catch(() => undefined);
      throw error;
    }
  }

  async list(organizationId: string, query: ListDocumentsDto) {
    const where: Prisma.DocumentWhereInput = {
      organizationId,
      status: DocumentStatus.ACTIVE,
      deletedAt: null,
      visibility: query.visibility,
      contextType: query.contextType,
      contextId: query.contextId,
    };
    const [documents, totalItems] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return createPaginatedResponse(
      documents.map((document) => this.serialize(document)),
      totalItems,
      query,
    );
  }

  async createDownloadUrl(
    organizationId: string,
    id: string,
    auditContext: AuditContext,
  ) {
    const document = await this.findOne(organizationId, id);
    const url = await this.storage.createSignedDownloadUrl(
      document.storageBucket,
      document.storagePath,
      60,
    );
    await this.audit.record({
      ...auditContext,
      organizationId,
      action: 'DOCUMENT_DOWNLOAD_URL_CREATED',
      entityType: 'Document',
      entityId: id,
    });
    return { url, expiresInSeconds: 60 };
  }

  async remove(
    organizationId: string,
    id: string,
    auditContext: AuditContext,
  ): Promise<void> {
    const document = await this.findOne(organizationId, id);
    await this.prisma.withTransaction(async (transaction) => {
      await transaction.document.update({
        where: { id },
        data: { status: DocumentStatus.DELETED, deletedAt: new Date() },
      });
      await this.audit.record(
        {
          ...auditContext,
          organizationId,
          action: 'DOCUMENT_DELETED',
          entityType: 'Document',
          entityId: id,
          previousData: { originalName: document.originalName },
        },
        transaction,
      );
    });
    await this.storage
      .remove(document.storageBucket, document.storagePath)
      .catch(() => undefined);
  }

  private async findOne(organizationId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        organizationId,
        status: DocumentStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (!document) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Documento não encontrado.',
      });
    }
    return document;
  }

  private serialize<T extends { sizeBytes: bigint }>(document: T) {
    return { ...document, sizeBytes: Number(document.sizeBytes) };
  }

  private safeOriginalName(name: string): string {
    const extension = extname(name);
    const base = name.slice(0, name.length - extension.length);
    const cleanBase = base.replace(/[^\p{L}\p{N}._ -]/gu, '_').trim();
    return `${cleanBase || 'documento'}${extension}`.slice(0, 255);
  }
}
