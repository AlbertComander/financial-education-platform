import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SubmitQuizAnswerDto {
  @Transform(({ value }) => String(value))
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => String(item)) : [],
  )
  @IsArray()
  @IsString({ each: true })
  selectedAnswerIds!: string[];
}

export class SubmitQuizAttemptDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers!: SubmitQuizAnswerDto[];
}
