import { IsBoolean } from 'class-validator';

export class SetDemoFavoriteDto {
  @IsBoolean({ message: 'Статус избранного должен быть true или false.' })
  isFavorite!: boolean;
}
