import { PartialType } from '@nestjs/swagger';
import { CreateLegalDeadlineDto } from './create-legal-deadline.dto.js';

export class UpdateLegalDeadlineDto extends PartialType(
  CreateLegalDeadlineDto,
) {}
