import { PartyRoleCode, PartyType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListPartiesDto extends PageOptionsDto {
  @IsEnum(PartyType)
  @IsOptional()
  type?: PartyType;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @IsEnum(PartyRoleCode)
  @IsOptional()
  role?: PartyRoleCode;
}
