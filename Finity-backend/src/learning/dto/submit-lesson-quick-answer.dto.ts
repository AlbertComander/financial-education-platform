import { IsString } from 'class-validator';

export class SubmitLessonQuickAnswerDto {
  @IsString()
  answerId!: string;
}
