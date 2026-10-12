import { PropertyStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageOptionsDto } from '../../../common/pagination/page-options.dto.js';

export class ListPropertiesDto extends PageOptionsDto {
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
