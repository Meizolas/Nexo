import { PropertyType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePropertyDto {
  @ApiProperty({ maxLength: 160 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type: PropertyType = PropertyType.RESIDENTIAL;

  @ApiPropertyOptional({ maxLength: 240 })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(240)
  addressLine?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ description: 'UF em duas letras', example: 'SP' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toUpperCase()
      : undefined,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  state?: string;

  @ApiPropertyOptional({ description: 'CEP normalizado, com oito dígitos' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.replace(/\D/g, '')
      ? value.replace(/\D/g, '')
      : undefined,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  postalCode?: string;

  @ApiProperty({
    type: [String],
    description: 'Partes existentes na organização com papel OWNER',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ownerPartyIds!: string[];
}
