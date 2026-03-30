import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClassDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10, { message: 'namaKelas maksimal 10 karakter' })
  namaKelas: string;

  @IsInt()
  @IsOptional()
  dosenId?: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1, { message: 'kapasitas minimal 1 orang' })
  kapasitas: number;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'jadwal maksimal 100 karakter' })
  jadwal?: string;
}
