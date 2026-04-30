import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertIncomeRuleDto {
  @IsString()
  title!: string;

  @IsNumber()
  @Min(1)
  @Max(100000000)
  amount!: number;

  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
