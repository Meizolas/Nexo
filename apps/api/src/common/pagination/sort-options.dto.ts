import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export class SortOptionsDto {
  @ApiPropertyOptional({ description: 'Campo permitido pelo recurso.' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ default: SortDirection.Asc, enum: SortDirection })
  @IsEnum(SortDirection)
  @IsOptional()
  sortDirection: SortDirection = SortDirection.Asc;
}

export function isAllowedSortField<TField extends string>(
  value: string | undefined,
  allowedFields: readonly TField[],
): value is TField {
  return value !== undefined && allowedFields.some((field) => field === value);
}
