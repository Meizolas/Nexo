import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Dados inválidos.' })
  message!: string;

  @ApiProperty({ isArray: true, type: Object })
  details!: unknown[];

  @ApiProperty({ example: 'b3e9d018-1d6e-4db9-bf96-b79e590f6752' })
  correlationId!: string;
}
