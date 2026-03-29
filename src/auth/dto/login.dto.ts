import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  npm_atau_nip: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
