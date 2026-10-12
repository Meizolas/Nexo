import { PartialType } from '@nestjs/swagger';
import { CreateCaseMovementDto } from './create-case-movement.dto.js';

export class UpdateCaseMovementDto extends PartialType(CreateCaseMovementDto) {}
