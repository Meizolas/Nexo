import { PaymentProofStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewPaymentProofDto {
  @ApiProperty({
    enum: [PaymentProofStatus.ACCEPTED, PaymentProofStatus.REJECTED],
  })
  @IsEnum(PaymentProofStatus)
  status!: PaymentProofStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;
}
