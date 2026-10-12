import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateLegalDeadlineDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 200)
  title!: string;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  )
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString() dueAt!: string;
  @ApiProperty({ enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] })
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])
  priority!: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  @ApiProperty() @IsUUID() assignedToUserId!: string;
}
