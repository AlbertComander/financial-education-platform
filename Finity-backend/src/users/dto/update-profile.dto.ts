import { Prisma } from '@prisma/client';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  goal?: string;

  @IsOptional()
  @Min(0)
  @Max(10)
  experience_lvl?: number;

  @IsOptional()
  @IsObject()
  base_params?: Prisma.InputJsonValue;
}
