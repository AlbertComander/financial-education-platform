import { IsIn, IsNumber, Max, Min } from 'class-validator';

export class ExchangeDemoCurrencyDto {
  @IsIn(['RUB', 'USD', 'EUR', 'CNY'])
  fromCurrency!: string;

  @IsIn(['RUB', 'USD', 'EUR', 'CNY'])
  toCurrency!: string;

  @IsNumber()
  @Min(0.01)
  @Max(100000000)
  fromAmount!: number;
}
