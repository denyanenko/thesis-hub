import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Некоректний формат email' })
  @IsNotEmpty({ message: 'Новий email є обовʼязковим' })
  newEmail: string;

  @IsString()
  @IsNotEmpty({ message: 'Поточний пароль є обовʼязковим' })
  currentPassword: string;
}
