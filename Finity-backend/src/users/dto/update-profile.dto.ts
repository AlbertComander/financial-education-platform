import { Prisma } from '@prisma/client';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsObject()
  base_params?: Prisma.InputJsonValue;
}
