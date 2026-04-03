import { IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested} from "class-validator";
import { Type } from "class-transformer";

class ComponentItemDto {
  @IsString()
  @IsNotEmpty()
  componentName: string;

  @IsNumber()
  @IsNotEmpty()
  weight: number;
}

export class CreateGradeComponentDto {
  @IsNumber()
  @IsNotEmpty()
  classId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentItemDto)
  components: ComponentItemDto[];
}