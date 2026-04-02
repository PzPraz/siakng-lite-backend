import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateGradeDto {
  @IsNumber()
  @IsNotEmpty()
  componentId: number;

  @IsNumber()
  @IsOptional()
  value: number;
}