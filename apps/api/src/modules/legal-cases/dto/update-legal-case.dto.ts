import { PartialType } from '@nestjs/swagger';
import { CreateLegalCaseDto } from './create-legal-case.dto.js';

export class UpdateLegalCaseDto extends PartialType(CreateLegalCaseDto) {}
