import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'JWT-токен запрошення із посилання в листі',
  })
  @IsString({ message: 'Токен запрошення має бути рядком' })
  @IsNotEmpty({ message: 'Токен запрошення є обовʼязковим' })
  token: string;

  @ApiProperty({
    description: 'Пароль нового користувача (від 8 до 128 символів)',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Пароль має бути рядком' })
  @MinLength(8, { message: 'Пароль повинен містити щонайменше 8 символів' })
  @MaxLength(128, { message: 'Пароль не може перевищувати 128 символів' })
  password: string;
}
