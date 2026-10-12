import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveLegalDeadlineDto {
  @ApiProperty({ enum: ['COMPLETED', 'DISMISSED'] })
  @IsIn(['COMPLETED', 'DISMISSED'])
  status!: 'COMPLETED' | 'DISMISSED';
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
