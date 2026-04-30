import { Module } from '@nestjs/common';
import { DemoAccountController } from './demo-account.controller';
import { DemoAccountService } from './demo-account.service';
import { MarketDataService } from './market-data.service';

@Module({
  controllers: [DemoAccountController],
  providers: [DemoAccountService, MarketDataService],
})
export class DemoAccountModule {}
