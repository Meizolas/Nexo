import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListLegalCasesDto extends PageOptionsDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  partyId?: string;

  @IsUUID()
  @IsOptional()
  responsibleLawyerId?: string;
}
