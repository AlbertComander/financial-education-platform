import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const QUESTION_TYPES = ['single', 'multiple'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export class QuestionAnswerInputDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;

  @IsIn(QUESTION_TYPES)
  @IsOptional()
  qType?: QuestionType;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuestionAnswerInputDto)
  answers!: QuestionAnswerInputDto[];
}

export class UpdateQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(1000)
  text?: string;

  @IsIn(QUESTION_TYPES)
  @IsOptional()
  qType?: QuestionType;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}
