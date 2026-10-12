import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHearingStatusDto {
  @ApiProperty({ enum: ['COMPLETED', 'CANCELED'] })
  @IsIn(['COMPLETED', 'CANCELED'])
  status!: 'COMPLETED' | 'CANCELED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
