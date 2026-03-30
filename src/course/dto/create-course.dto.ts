import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  kode: string;

  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  sks: number;
}
