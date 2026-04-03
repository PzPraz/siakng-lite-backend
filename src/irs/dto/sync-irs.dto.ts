import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class SyncIrsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  classIds: number[];
}
