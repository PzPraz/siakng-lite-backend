import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsArray,
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

  @IsString()
  @IsNotEmpty()
  dosenId: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1, { message: 'kapasitas minimal 1 orang' })
  kapasitas: number;

  @IsArray()
  @IsNotEmpty()
  schedules: {
    hari: number;
    jamMulai: string;
    jamSelesai: string;
    ruangan: string;
  }[];


}
