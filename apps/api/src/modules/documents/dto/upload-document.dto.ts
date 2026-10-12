import { DocumentVisibility } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UploadDocumentDto {
  @IsEnum(DocumentVisibility)
  visibility: DocumentVisibility = DocumentVisibility.INTERNAL;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  contextType?: string;

  @IsUUID()
  @IsOptional()
  contextId?: string;
}
