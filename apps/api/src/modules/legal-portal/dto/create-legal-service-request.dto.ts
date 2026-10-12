import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLegalServiceRequestDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @ApiProperty({ maxLength: 1750 })
  @IsString()
  @MinLength(10)
  @MaxLength(1750)
  message!: string;
}
