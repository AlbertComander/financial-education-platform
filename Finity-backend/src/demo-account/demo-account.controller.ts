import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { DemoAccountService } from './demo-account.service';
import { CreateDemoAccountDto } from './dto/create-demo-account.dto';
import { DepositDemoCashDto } from './dto/deposit-demo-cash.dto';
import { ExchangeDemoCurrencyDto } from './dto/exchange-demo-currency.dto';
import { PlaceDemoTradeDto } from './dto/place-demo-trade.dto';
import { UpsertIncomeRuleDto } from './dto/upsert-income-rule.dto';

@Controller('demo-account')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DemoAccountController {
  constructor(private readonly demoAccount: DemoAccountService) {}

  private getUserId(req: Request): bigint {
    const sub = (req.user as { sub?: string })?.sub;
    if (!sub) throw new UnauthorizedException();
    return BigInt(sub);
  }

  @Get()
  getOverview(@Req() req: Request) {
    return this.demoAccount.getOverview(this.getUserId(req));
  }

  @Post()
  createAccount(@Req() req: Request, @Body() dto: CreateDemoAccountDto) {
    return this.demoAccount.createOrUpdateAccount(this.getUserId(req), dto);
  }

  @Post('cash/deposit')
  depositCash(@Req() req: Request, @Body() dto: DepositDemoCashDto) {
    return this.demoAccount.depositCash(this.getUserId(req), dto);
  }

  @Post('cash/exchange')
  exchangeCurrency(@Req() req: Request, @Body() dto: ExchangeDemoCurrencyDto) {
    return this.demoAccount.exchangeCurrency(this.getUserId(req), dto);
  }

  @Post('income-rules')
  createIncomeRule(@Req() req: Request, @Body() dto: UpsertIncomeRuleDto) {
    return this.demoAccount.createIncomeRule(this.getUserId(req), dto);
  }

  @Post('trades')
  placeTrade(@Req() req: Request, @Body() dto: PlaceDemoTradeDto) {
    return this.demoAccount.placeTrade(this.getUserId(req), dto);
  }

  @Get('instruments')
  listInstruments() {
    return this.demoAccount.listInstruments();
  }

  @Get('instruments/:instrumentId')
  getInstrumentDetails(@Param('instrumentId') instrumentId: string) {
    return this.demoAccount.getInstrumentDetails(instrumentId);
  }

  @Post('instruments/quotes/refresh')
  refreshQuotes() {
    return this.demoAccount.refreshQuotes();
  }
}
