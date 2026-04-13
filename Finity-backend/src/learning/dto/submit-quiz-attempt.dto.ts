import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SubmitQuizMatchingPairDto {
  @Transform(({ value }) => String(value))
  @IsString()
  @IsNotEmpty()
  leftId!: string;

  @Transform(({ value }) => String(value))
  @IsString()
  @IsNotEmpty()
  rightId!: string;
}

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
  @IsOptional()
  selectedAnswerIds?: string[];

  @Transform(({ value }) =>
    typeof value === 'string' ? value : String(value ?? ''),
  )
  @IsString()
  @IsOptional()
  textAnswer?: string;

  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item) => String(item)) : [],
  )
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  orderedItemIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizMatchingPairDto)
  @IsOptional()
  matchingPairs?: SubmitQuizMatchingPairDto[];
}

export class SubmitQuizAttemptDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuizAnswerDto)
  answers!: SubmitQuizAnswerDto[];
}
