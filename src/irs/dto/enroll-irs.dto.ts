import { IsInt, IsNotEmpty } from 'class-validator';

export class EnrollIrsDto {
  @IsInt({ message: 'classId harus berupa angka (integer)' })
  @IsNotEmpty({ message: 'classId tidak boleh kosong' })
  classId: number;
}
