import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некоректний формат email' })
  @IsNotEmpty({ message: 'Email є обовʼязковим' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль є обовʼязковим' })
  @MinLength(6, { message: 'Пароль має містити щонайменше 6 символів' })
  password: string;
}
