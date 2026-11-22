import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Токен відновлення є обовʼязковим' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'Пароль повинен містити щонайменше 8 символів' })
  @MaxLength(128, { message: 'Пароль не може перевищувати 128 символів' })
  newPassword: string;
}
