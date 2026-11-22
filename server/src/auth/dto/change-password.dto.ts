import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Поточний пароль є обовʼязковим' })
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'Новий пароль повинен містити щонайменше 8 символів',
  })
  @MaxLength(128, {
    message: 'Новий пароль не може перевищувати 128 символів',
  })
  newPassword: string;
}
