import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DemoCashBalancePatchDto {
  @IsIn(['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'CHF', 'JPY', 'HKD'], { message: 'Валюта баланса не поддерживается.' })
  currency!: string;

  @IsNumber({}, { message: 'Баланс должен быть числом.' })
  @Min(0, { message: 'Баланс не может быть отрицательным.' })
  @Max(1000000000, { message: 'Баланс слишком большой.' })
  amount!: number;
}

export class DemoPositionPatchDto {
  @IsNumber({}, { message: 'Инструмент позиции должен быть числом.' })
  @Min(1, { message: 'Инструмент позиции должен быть выбран из каталога.' })
  instrumentId!: number;

  @IsNumber({}, { message: 'Количество в позиции должно быть числом.' })
  @Min(0, { message: 'Количество в позиции не может быть отрицательным.' })
  @Max(1000000000, { message: 'Количество в позиции слишком большое.' })
  quantity!: number;

  @IsOptional()
  @IsNumber({}, { message: 'Средняя цена должна быть числом.' })
  @Min(0, { message: 'Средняя цена не может быть отрицательной.' })
  @Max(1000000000, { message: 'Средняя цена слишком большая.' })
  avgPrice?: number;
}

export class UpdateDemoAccountStateDto {
  @IsOptional()
  @IsString({ message: 'Название счета должно быть строкой.' })
  name?: string;

  @IsOptional()
  @IsArray({ message: 'Балансы должны быть списком.' })
  @ValidateNested({ each: true })
  @Type(() => DemoCashBalancePatchDto)
  cashBalances?: DemoCashBalancePatchDto[];

  @IsOptional()
  @IsArray({ message: 'Позиции должны быть списком.' })
  @ValidateNested({ each: true })
  @Type(() => DemoPositionPatchDto)
  positions?: DemoPositionPatchDto[];
}
