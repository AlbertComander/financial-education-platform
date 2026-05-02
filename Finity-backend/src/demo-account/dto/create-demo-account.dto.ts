import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateDemoAccountDto {
  @IsOptional()
  @IsString({ message: 'Название счета должно быть строкой.' })
  name?: string;

  @IsOptional()
  @IsIn(['RUB'], { message: 'Демо-счет ведется только в рублях.' })
  currency?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Стартовый баланс должен быть числом.' })
  @Min(0, { message: 'Стартовый баланс не может быть отрицательным.' })
  @Max(100000000, { message: 'Стартовый баланс слишком большой.' })
  initialCash?: number;
}
