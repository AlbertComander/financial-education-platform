import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTopicDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

export class UpdateTopicDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}
