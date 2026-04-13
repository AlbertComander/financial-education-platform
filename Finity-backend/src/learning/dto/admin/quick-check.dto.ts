import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LessonQuickAnswerInputDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  feedbackText?: string;
}

export class CreateLessonQuickQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LessonQuickAnswerInputDto)
  answers!: LessonQuickAnswerInputDto[];
}

export class UpdateLessonQuickQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(1000)
  text?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LessonQuickAnswerInputDto)
  @IsOptional()
  answers?: LessonQuickAnswerInputDto[];
}
