import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { SetDemoFavoriteDto } from './dto/set-demo-favorite.dto';
import { UpdateDemoAccountStateDto } from './dto/update-demo-account-state.dto';
import { UpsertIncomeRuleDto } from './dto/upsert-income-rule.dto';

@Controller('demo-account')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DemoAccountController {
  constructor(private readonly demoAccount: DemoAccountService) {}

  private getUserId(req: Request): bigint {
    const sub = (req.user as { sub?: string })?.sub;
    if (!sub) throw new UnauthorizedException('Нужно войти в аккаунт.');
    return BigInt(sub);
  }

  private parseAccountId(accountId?: string): bigint | undefined {
    if (!accountId) return undefined;
    try {
      const parsed = BigInt(accountId);
      return parsed > 0n ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  @Get()
  getOverview(@Req() req: Request, @Query('accountId') accountId?: string) {
    return this.demoAccount.getOverview(this.getUserId(req), this.parseAccountId(accountId));
  }

  @Post()
  createAccount(@Req() req: Request, @Body() dto: CreateDemoAccountDto) {
    return this.demoAccount.createOrUpdateAccount(this.getUserId(req), dto);
  }

  @Patch()
  updateAccountState(
    @Req() req: Request,
    @Body() dto: UpdateDemoAccountStateDto,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.updateAccountState(this.getUserId(req), this.parseAccountId(accountId), dto);
  }

  @Post('cash/deposit')
  depositCash(
    @Req() req: Request,
    @Body() dto: DepositDemoCashDto,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.depositCash(this.getUserId(req), this.parseAccountId(accountId), dto);
  }

  @Post('cash/exchange')
  exchangeCurrency(
    @Req() req: Request,
    @Body() dto: ExchangeDemoCurrencyDto,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.exchangeCurrency(this.getUserId(req), this.parseAccountId(accountId), dto);
  }

  @Post('income-rules')
  createIncomeRule(
    @Req() req: Request,
    @Body() dto: UpsertIncomeRuleDto,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.createIncomeRule(this.getUserId(req), this.parseAccountId(accountId), dto);
  }

  @Post('trades')
  placeTrade(
    @Req() req: Request,
    @Body() dto: PlaceDemoTradeDto,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.placeTrade(this.getUserId(req), this.parseAccountId(accountId), dto);
  }

  @Get('instruments')
  listInstruments(@Req() req: Request) {
    return this.demoAccount.listInstruments(this.getUserId(req));
  }

  @Post('instruments/:instrumentId/favorite')
  setFavoriteInstrument(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
    @Body() dto: SetDemoFavoriteDto,
  ) {
    return this.demoAccount.setFavoriteInstrument(
      this.getUserId(req),
      instrumentId,
      dto.isFavorite,
    );
  }

  @Get('instruments/:instrumentId')
  getInstrumentDetails(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
    @Query('period') period?: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.demoAccount.getInstrumentDetails(
      instrumentId,
      period,
      this.getUserId(req),
      this.parseAccountId(accountId),
    );
  }

  @Post('instruments/quotes/refresh')
  refreshQuotes() {
    return this.demoAccount.refreshQuotes();
  }
}
