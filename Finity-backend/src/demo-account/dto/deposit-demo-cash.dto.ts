import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class DepositDemoCashDto {
  @IsNumber({}, { message: 'Сумма пополнения должна быть числом.' })
  @Min(1, { message: 'Сумма пополнения должна быть больше нуля.' })
  @Max(100000000, { message: 'Сумма пополнения слишком большая.' })
  amount!: number;

  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой.' })
  description?: string;
}
