import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { normalizeCnjNumber } from '../cnj-number.js';
import { CasePartyInputDto } from './case-party-input.dto.js';

const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateLegalCaseDto {
  @ApiPropertyOptional({ example: '0200043-65.2009.2.00.0000' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim()
      ? normalizeCnjNumber(value)
      : null,
  )
  @ValidateIf((_object, value) => value !== null && value !== undefined)
  @IsString()
  @Length(20, 20)
  caseNumber?: string | null;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 200)
  subject!: string;

  @ApiPropertyOptional()
  @Transform(optionalText)
  @IsString()
  @MaxLength(160)
  @IsOptional()
  tribunal?: string | null;

  @ApiPropertyOptional({ description: 'Comarca ou seção judiciária.' })
  @Transform(optionalText)
  @IsString()
  @MaxLength(160)
  @IsOptional()
  district?: string | null;

  @ApiPropertyOptional({ description: 'Vara ou unidade julgadora.' })
  @Transform(optionalText)
  @IsString()
  @MaxLength(160)
  @IsOptional()
  courtDivision?: string | null;

  @ApiPropertyOptional({ description: 'Nunca publicado no portal.' })
  @Transform(optionalText)
  @IsString()
  @MaxLength(10_000)
  @IsOptional()
  internalNotes?: string | null;

  @ApiPropertyOptional({
    description: 'Resumo explicitamente liberado ao cliente.',
  })
  @Transform(optionalText)
  @IsString()
  @MaxLength(5_000)
  @IsOptional()
  clientSummary?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleLawyerId!: string;

  @ApiProperty({ type: [CasePartyInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: CasePartyInputDto) => `${item.partyId}:${item.role}`)
  @ValidateNested({ each: true })
  @Type(() => CasePartyInputDto)
  parties!: CasePartyInputDto[];
}
