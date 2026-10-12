import { Type, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseTenantDto {
  @ApiProperty()
  @IsUUID('4')
  partyId!: string;

  @ApiProperty()
  @IsBoolean()
  isFinancialResponsible!: boolean;
}

export class CreateLeaseDto {
  @ApiProperty()
  @IsUUID('4')
  unitId!: string;

  @ApiProperty({ type: [LeaseTenantDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LeaseTenantDto)
  tenants!: LeaseTenantDto[];

  @ApiProperty({ example: '2026-10-12' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-10-11' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiProperty({ example: '2500.00' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  monthlyRent!: string;

  @ApiProperty({ default: 'BRL' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency = 'BRL';

  @ApiProperty({ minimum: 1, maximum: 28 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay!: number;
}

export class UpdateLeaseDto extends CreateLeaseDto {}
