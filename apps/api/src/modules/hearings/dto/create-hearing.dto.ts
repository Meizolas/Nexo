import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateHearingDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 200)
  title!: string;

  @ApiProperty({ format: 'date-time' }) @IsDateString() scheduledAt!: string;

  @ApiPropertyOptional({ default: false, description: 'Libera título, data e local no portal do cliente.' })
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isClientVisible = false;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  )
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  )
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
