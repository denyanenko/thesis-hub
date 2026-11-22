import { IsNotEmpty, IsString } from 'class-validator';

export class TokenActionDto {
  @IsString()
  @IsNotEmpty({ message: 'Токен є обовʼязковим' })
  token: string;
}
