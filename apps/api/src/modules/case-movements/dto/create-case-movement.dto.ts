import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCaseMovementDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ description: 'Conteúdo restrito à equipe interna.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 10_000)
  internalDescription!: string;

  @ApiPropertyOptional({
    description: 'Conteúdo preparado para publicação explícita.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() ? value.trim() : null,
  )
  @IsString()
  @MaxLength(5_000)
  @IsOptional()
  clientDescription?: string | null;
}
