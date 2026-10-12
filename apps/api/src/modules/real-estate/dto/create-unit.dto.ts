import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({
    maxLength: 100,
    description: 'Identificador da unidade, por exemplo Apto 12 ou Loja 3',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 100)
  name!: string;
}
