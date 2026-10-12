import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class GenerateChargesDto {
  @ApiProperty({ example: '2026-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  competence!: string;
}
