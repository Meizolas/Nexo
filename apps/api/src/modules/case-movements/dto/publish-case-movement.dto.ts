import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class PublishCaseMovementDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 5_000)
  clientDescription!: string;
}
