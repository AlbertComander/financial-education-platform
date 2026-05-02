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
  @IsString({ message: 'Название пополнения должно быть строкой.' })
  title!: string;

  @IsNumber({}, { message: 'Сумма пополнения должна быть числом.' })
  @Min(1, { message: 'Сумма пополнения должна быть больше нуля.' })
  @Max(100000000, { message: 'Сумма пополнения слишком большая.' })
  amount!: number;

  @IsInt({ message: 'День пополнения должен быть целым числом.' })
  @Min(1, { message: 'День пополнения должен быть от 1 до 31.' })
  @Max(31, { message: 'День пополнения должен быть от 1 до 31.' })
  dayOfMonth!: number;

  @IsOptional()
  @IsBoolean({ message: 'Статус автопополнения должен быть true или false.' })
  isActive?: boolean;
}
