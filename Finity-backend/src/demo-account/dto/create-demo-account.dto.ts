import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDemoAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['RUB'])
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  initialCash?: number;
}
