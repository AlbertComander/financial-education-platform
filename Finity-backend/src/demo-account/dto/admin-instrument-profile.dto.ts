import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const optionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

export class UpdateDemoInstrumentMetricDto {
  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(80)
  section?: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  label!: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(160)
  value!: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(240)
  hint?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

export class UpdateDemoInstrumentDividendDto {
  @Transform(trimString)
  @IsDateString()
  recordDate!: string;

  @Transform(optionalNumber)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  amount!: number;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(12)
  currency?: string;

  @Transform(optionalNumber)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  yieldPercent?: number;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(80)
  period?: string;

  @Transform(trimString)
  @IsDateString()
  @IsOptional()
  declaredAt?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

export class UpdateDemoInstrumentProfileDto {
  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(120)
  sector?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(64)
  country?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(32)
  isin?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  websiteUrl?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  logoUrl?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(8000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDemoInstrumentMetricDto)
  @ArrayMaxSize(80)
  @IsOptional()
  metrics?: UpdateDemoInstrumentMetricDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateDemoInstrumentDividendDto)
  @ArrayMaxSize(120)
  @IsOptional()
  dividends?: UpdateDemoInstrumentDividendDto[];
}
