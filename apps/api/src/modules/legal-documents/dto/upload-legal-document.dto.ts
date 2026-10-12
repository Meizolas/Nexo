import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentVisibility } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UploadLegalDocumentDto {
  @ApiPropertyOptional({
    enum: DocumentVisibility,
    default: DocumentVisibility.INTERNAL,
  })
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility: DocumentVisibility = DocumentVisibility.INTERNAL;
}
