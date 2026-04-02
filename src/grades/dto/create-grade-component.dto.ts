import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateGradeComponentDto {

  @IsNumber()
  @IsNotEmpty()
  classId: number;

  @IsString()
  @IsNotEmpty()
  componentName: string;

  @IsNumber()
  @IsNotEmpty()
  weight: number;
}