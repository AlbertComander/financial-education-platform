import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PlaceDemoTradeDto {
  @IsIn(['buy', 'sell'], { message: 'Тип заявки должен быть покупкой или продажей.' })
  side!: 'buy' | 'sell';

  @IsOptional()
  @IsIn(['market', 'limit'], { message: 'Тип исполнения должен быть лучшей ценой или лимитной заявкой.' })
  orderType?: 'market' | 'limit';

  @IsInt({ message: 'Инструмент должен быть выбран из каталога.' })
  @Min(1, { message: 'Инструмент должен быть выбран из каталога.' })
  instrumentId!: number;

  @IsNumber({}, { message: 'Количество должно быть числом.' })
  @Min(0.00000001, { message: 'Количество должно быть больше нуля.' })
  @Max(100000000, { message: 'Количество слишком большое.' })
  quantity!: number;

  @IsOptional()
  @IsNumber({}, { message: 'Комиссия должна быть числом.' })
  @Min(0, { message: 'Комиссия не может быть отрицательной.' })
  @Max(1000000, { message: 'Комиссия слишком большая.' })
  commission?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Лимитная цена должна быть числом.' })
  @Min(0.000001, { message: 'Лимитная цена должна быть больше нуля.' })
  @Max(1000000000, { message: 'Лимитная цена слишком большая.' })
  limitPrice?: number;
}
