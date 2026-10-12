import { ChargeAdjustmentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddChargeAdjustmentDto {
  @ApiProperty({ enum: ChargeAdjustmentType })
  @IsEnum(ChargeAdjustmentType)
  type!: ChargeAdjustmentType;

  @ApiProperty({ example: '125.50' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount!: string;

  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 500)
  reason!: string;
}
