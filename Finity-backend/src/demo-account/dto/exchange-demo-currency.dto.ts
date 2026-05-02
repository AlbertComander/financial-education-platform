import { IsIn, IsNumber, Max, Min } from 'class-validator';

export class ExchangeDemoCurrencyDto {
  @IsIn(['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'CHF', 'JPY', 'HKD'], { message: 'Валюта списания не поддерживается.' })
  fromCurrency!: string;

  @IsIn(['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'CHF', 'JPY', 'HKD'], { message: 'Валюта покупки не поддерживается.' })
  toCurrency!: string;

  @IsNumber({}, { message: 'Сумма обмена должна быть числом.' })
  @Min(0.01, { message: 'Сумма обмена должна быть больше нуля.' })
  @Max(100000000, { message: 'Сумма обмена слишком большая.' })
  fromAmount!: number;
}
