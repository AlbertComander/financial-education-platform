import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDemoAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['USD', 'EUR', 'RUB'])
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  initialCash?: number;
}
