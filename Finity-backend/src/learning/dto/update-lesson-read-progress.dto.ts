import { IsInt, Max, Min } from 'class-validator';

export class UpdateLessonReadProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;
}

