import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSpecialtyDto {
  @ApiProperty({
    description: 'Код спеціальності за класифікатором МОН (напр. F6 або 126)',
    example: 'F6',
    maxLength: 32,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'Код спеціальності повинен бути рядком' })
  @IsNotEmpty({ message: 'Код спеціальності є обовʼязковим' })
  @MaxLength(32, {
    message: 'Код спеціальності не може перевищувати 32 символи',
  })
  @Matches(/^[A-ZА-ЯІЇЄҐ0-9._-]+$/i, {
    message:
      'Код спеціальності може містити лише літери, цифри, крапку, дефіс або підкреслення',
  })
  code: string;

  @ApiProperty({
    description: 'Повна назва спеціальності',
    example: 'Інформаційні системи і технології',
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Назва спеціальності повинна бути рядком' })
  @IsNotEmpty({ message: 'Назва спеціальності є обовʼязковою' })
  @MaxLength(255, {
    message: 'Назва спеціальності не може перевищувати 255 символів',
  })
  name: string;
}
