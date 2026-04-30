import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PlaceDemoTradeDto {
  @IsIn(['buy', 'sell'])
  side!: 'buy' | 'sell';

  @IsInt()
  @Min(1)
  instrumentId!: number;

  @IsNumber()
  @Min(0.00000001)
  @Max(100000000)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  commissionRub?: number;
}
