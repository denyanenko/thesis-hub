import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class DeactivateEducationalProgramDto {
  @ApiPropertyOptional({
    description: 'Підстава або коментар щодо деактивації освітньої програми',
    example: 'Припинення набору за освітньою програмою з 2026 року',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Причина деактивації повинна бути рядком' })
  @MaxLength(500, {
    message: 'Причина деактивації не може перевищувати 500 символів',
  })
  reason?: string | null;
}
