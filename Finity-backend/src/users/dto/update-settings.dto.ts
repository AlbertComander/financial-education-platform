import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ui_lang?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;

  @IsOptional()
  notifications_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  personalization_level?: number;
}
