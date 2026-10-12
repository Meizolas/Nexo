import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ManagePartyLinkDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partyId!: string;

  @ApiProperty({ format: 'uuid', description: 'Usuário ativo com papel CLIENT nesta organização.' })
  @IsUUID()
  userId!: string;
}
