import { DocumentVisibility } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListDocumentsDto extends PageOptionsDto {
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  contextType?: string;

  @IsUUID()
  @IsOptional()
  contextId?: string;
}
