import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class DepositDemoCashDto {
  @IsNumber()
  @Min(1)
  @Max(100000000)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
