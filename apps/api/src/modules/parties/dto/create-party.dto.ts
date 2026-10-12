import { PartyRoleCode, PartyType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeDigits } from '../party-identifiers.js';

export class CreatePartyDto {
  @ApiProperty({ enum: PartyType })
  @IsEnum(PartyType)
  type!: PartyType;

  @ApiProperty({ maxLength: 160 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional({
    description: 'CPF ou CNPJ, armazenado sem pontuação.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim().length > 0
      ? normalizeDigits(value)
      : undefined,
  )
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim().length > 0
      ? value.trim().toLowerCase()
      : undefined,
  )
  @IsEmail()
  @MaxLength(320)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim().length > 0
      ? normalizeDigits(value)
      : undefined,
  )
  @Matches(/^\d{10,13}$/)
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: PartyRoleCode, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(PartyRoleCode, { each: true })
  roles!: PartyRoleCode[];
}
