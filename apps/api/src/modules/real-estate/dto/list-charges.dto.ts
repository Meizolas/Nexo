import { ChargeStatus, ChargeType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListChargesDto extends PageOptionsDto {
  @IsOptional()
  @IsEnum(ChargeStatus)
  status?: ChargeStatus;

  @IsOptional()
  @IsEnum(ChargeType)
  type?: ChargeType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  competence?: string;

  @IsOptional()
  @IsUUID('4')
  leaseId?: string;
}
