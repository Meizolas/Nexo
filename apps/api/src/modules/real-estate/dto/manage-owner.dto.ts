import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ManageOwnerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partyId!: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Data inicial do vínculo; padrão: agora',
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
