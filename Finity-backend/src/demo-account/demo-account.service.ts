import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDemoAccountDto } from './dto/create-demo-account.dto';
import { DepositDemoCashDto } from './dto/deposit-demo-cash.dto';
import { PlaceDemoTradeDto } from './dto/place-demo-trade.dto';
import { UpsertIncomeRuleDto } from './dto/upsert-income-rule.dto';
import {
  DEMO_INSTRUMENTS,
  MarketDataService,
} from './market-data.service';

@Injectable()
export class DemoAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketData: MarketDataService,
  ) {}

  async getOverview(userId: bigint) {
    const account = await this.ensureAccount(userId);
    await this.applyDueIncomeRules(account.id);
    const freshAccount = await this.prisma.demo_accounts.findUniqueOrThrow({
      where: { id: account.id },
    });
    const [transactions, incomeRules, instruments, positions, trades] =
      await Promise.all([
      this.prisma.demo_cash_transactions.findMany({
        where: { account_id: freshAccount.id },
        orderBy: { effective_at: 'desc' },
        take: 8,
      }),
      this.prisma.demo_income_rules.findMany({
        where: { account_id: freshAccount.id },
        orderBy: { created_at: 'desc' },
      }),
      this.listInstruments(),
      this.prisma.demo_positions.findMany({
        where: { account_id: freshAccount.id },
        include: {
          demo_instruments: {
            include: { demo_price_cache: true },
          },
        },
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.demo_trades.findMany({
        where: { account_id: freshAccount.id },
        include: { demo_instruments: true },
        orderBy: { executed_at: 'desc' },
        take: 8,
      }),
    ]);
    const rates = this.extractRates(instruments);
    const positionViews = positions.map((position) =>
      this.toPositionView(position, rates),
    );
    const positionsValue = positionViews.reduce(
      (sum, position) => sum.plus(position.marketValueRub),
      new Prisma.Decimal(0),
    );
    const investedValue = positionViews.reduce(
      (sum, position) => sum.plus(position.costBasisRub),
      new Prisma.Decimal(0),
    );

    return {
      account: freshAccount,
      transactions,
      incomeRules,
      instruments,
      positions: positionViews,
      trades,
      summary: {
        cashBalance: freshAccount.cash_balance,
        positionsValue,
        totalValue: freshAccount.cash_balance.plus(positionsValue),
        investedValue,
      },
    };
  }

  async createOrUpdateAccount(userId: bigint, dto: CreateDemoAccountDto) {
    const currency = 'RUB';
    const initialCash = new Prisma.Decimal(dto.initialCash ?? 0);

    const existing = await this.prisma.demo_accounts.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      return this.prisma.demo_accounts.update({
        where: { id: existing.id },
        data: {
          name: dto.name ?? existing.name,
          currency,
          updated_at: new Date(),
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.demo_accounts.create({
        data: {
          user_id: userId,
          name: dto.name ?? 'Демо-счет',
          currency,
          cash_balance: initialCash,
        },
      });

      if (initialCash.greaterThan(0)) {
        await tx.demo_cash_transactions.create({
          data: {
            account_id: account.id,
            kind: 'manual_deposit',
            amount: initialCash,
            currency,
            description: 'Стартовый демо-капитал',
          },
        });
      }

      return account;
    });
  }

  async depositCash(userId: bigint, dto: DepositDemoCashDto) {
    const account = await this.ensureAccount(userId);
    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.demo_accounts.update({
        where: { id: account.id },
        data: {
          cash_balance: { increment: amount },
          updated_at: new Date(),
        },
      });

      const transaction = await tx.demo_cash_transactions.create({
        data: {
          account_id: account.id,
          kind: 'manual_deposit',
          amount,
          currency: account.currency,
          description: dto.description ?? 'Ручное пополнение демо-счета',
        },
      });

      await tx.demo_portfolio_snapshots.create({
        data: {
          account_id: account.id,
          cash_value: updated.cash_balance,
          positions_value: new Prisma.Decimal(0),
          total_value: updated.cash_balance,
          invested_value: new Prisma.Decimal(0),
        },
      });

      return { account: updated, transaction };
    });
  }

  async createIncomeRule(userId: bigint, dto: UpsertIncomeRuleDto) {
    const account = await this.ensureAccount(userId);
    const nextRunAt = this.nextMonthlyRun(dto.dayOfMonth);

    return this.prisma.demo_income_rules.create({
      data: {
        account_id: account.id,
        title: dto.title,
        amount: new Prisma.Decimal(dto.amount),
        currency: account.currency,
        day_of_month: dto.dayOfMonth,
        is_active: dto.isActive ?? true,
        next_run_at: nextRunAt,
      },
    });
  }

  async placeTrade(userId: bigint, dto: PlaceDemoTradeDto) {
    const account = await this.ensureAccount(userId);
    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id: BigInt(dto.instrumentId) },
      include: { demo_price_cache: true },
    });

    if (!instrument || !instrument.is_active) {
      throw new BadRequestException('Instrument is not available');
    }

    if (!instrument.demo_price_cache) {
      throw new BadRequestException('Refresh quotes before trading this instrument');
    }

    const quote = instrument.demo_price_cache;
    const rates = await this.getRubRates();
    const quantity = new Prisma.Decimal(dto.quantity);
    const price = quote.price;
    const commissionRub = new Prisma.Decimal(dto.commissionRub ?? 0);
    const grossRub = this.convertToRub(
      price.mul(quantity),
      instrument.demo_price_cache.currency,
      rates,
    );
    const cashImpact = grossRub.plus(commissionRub);

    return this.prisma.$transaction(async (tx) => {
      const currentAccount = await tx.demo_accounts.findUniqueOrThrow({
        where: { id: account.id },
      });
      const currentPosition = await tx.demo_positions.findUnique({
        where: {
          account_id_instrument_id: {
            account_id: account.id,
            instrument_id: instrument.id,
          },
        },
      });

      if (dto.side === 'buy') {
        if (currentAccount.cash_balance.lessThan(cashImpact)) {
          throw new BadRequestException('Not enough demo cash for this trade');
        }

        const oldQuantity = currentPosition?.quantity ?? new Prisma.Decimal(0);
        const oldAvgPrice = currentPosition?.avg_price ?? new Prisma.Decimal(0);
        const newQuantity = oldQuantity.plus(quantity);
        const newAvgPrice = oldQuantity
          .mul(oldAvgPrice)
          .plus(quantity.mul(price))
          .div(newQuantity);

        await tx.demo_accounts.update({
          where: { id: account.id },
          data: {
            cash_balance: { decrement: cashImpact },
            updated_at: new Date(),
          },
        });

        await tx.demo_positions.upsert({
          where: {
            account_id_instrument_id: {
              account_id: account.id,
              instrument_id: instrument.id,
            },
          },
          update: {
            quantity: newQuantity,
            avg_price: newAvgPrice,
            updated_at: new Date(),
          },
          create: {
            account_id: account.id,
            instrument_id: instrument.id,
            quantity,
            avg_price: price,
          },
        });
      } else {
        if (!currentPosition || currentPosition.quantity.lessThan(quantity)) {
          throw new BadRequestException('Not enough position quantity to sell');
        }

        const newQuantity = currentPosition.quantity.minus(quantity);
        await tx.demo_accounts.update({
          where: { id: account.id },
          data: {
            cash_balance: { increment: grossRub.minus(commissionRub) },
            updated_at: new Date(),
          },
        });

        if (newQuantity.equals(0)) {
          await tx.demo_positions.delete({
            where: {
              account_id_instrument_id: {
                account_id: account.id,
                instrument_id: instrument.id,
              },
            },
          });
        } else {
          await tx.demo_positions.update({
            where: {
              account_id_instrument_id: {
                account_id: account.id,
                instrument_id: instrument.id,
              },
            },
            data: {
              quantity: newQuantity,
              updated_at: new Date(),
            },
          });
        }
      }

      const trade = await tx.demo_trades.create({
        data: {
          account_id: account.id,
          instrument_id: instrument.id,
          side: dto.side,
          quantity,
          price,
          currency: quote.currency,
          commission: commissionRub,
        },
      });

      const updatedAccount = await tx.demo_accounts.findUniqueOrThrow({
        where: { id: account.id },
      });
      await tx.demo_portfolio_snapshots.create({
        data: {
          account_id: account.id,
          cash_value: updatedAccount.cash_balance,
          positions_value: new Prisma.Decimal(0),
          total_value: updatedAccount.cash_balance,
          invested_value: new Prisma.Decimal(0),
        },
      });

      return { trade };
    });
  }

  async listInstruments() {
    await this.ensureInstrumentCatalog();
    return this.prisma.demo_instruments.findMany({
      where: { is_active: true },
      include: { demo_price_cache: true },
      orderBy: [{ asset_type: 'asc' }, { symbol: 'asc' }],
    });
  }

  async refreshQuotes() {
    await this.ensureInstrumentCatalog();
    const instruments = await this.prisma.demo_instruments.findMany({
      where: { is_active: true },
    });

    try {
      const quotes = await this.marketData.getQuotes(
        instruments.map((instrument) => instrument.provider_symbol),
      );
      const quoteMap = new Map(quotes.map((quote) => [quote.providerSymbol, quote]));

      await this.prisma.$transaction(
        instruments.flatMap((instrument) => {
          const quote = quoteMap.get(instrument.provider_symbol.toLowerCase());
          if (!quote) return [];

          return this.prisma.demo_price_cache.upsert({
            where: { instrument_id: instrument.id },
            update: {
              price: new Prisma.Decimal(quote.price),
              currency: quote.currency,
              change_abs:
                quote.changeAbs === null ? null : new Prisma.Decimal(quote.changeAbs),
              change_percent:
                quote.changePercent === null
                  ? null
                  : new Prisma.Decimal(quote.changePercent),
              as_of: quote.asOf,
              provider: quote.provider,
              raw_json: this.toPrismaJson(quote.raw),
              updated_at: new Date(),
            },
            create: {
              instrument_id: instrument.id,
              price: new Prisma.Decimal(quote.price),
              currency: quote.currency,
              change_abs:
                quote.changeAbs === null ? null : new Prisma.Decimal(quote.changeAbs),
              change_percent:
                quote.changePercent === null
                  ? null
                  : new Prisma.Decimal(quote.changePercent),
              as_of: quote.asOf,
              provider: quote.provider,
              raw_json: this.toPrismaJson(quote.raw),
            },
          });
        }),
      );
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error
          ? error.message
          : 'Market data provider is unavailable',
      );
    }

    return this.listInstruments();
  }

  private async ensureAccount(userId: bigint) {
    const account = await this.prisma.demo_accounts.findUnique({
      where: { user_id: userId },
    });

    if (account) return account;
    return this.createOrUpdateAccount(userId, {
      name: 'Демо-счет',
      currency: 'RUB',
      initialCash: 100000,
    });
  }

  private async ensureInstrumentCatalog() {
    await this.prisma.$transaction(
      DEMO_INSTRUMENTS.map((instrument) =>
        this.prisma.demo_instruments.upsert({
          where: { code: instrument.code },
          update: {
            symbol: instrument.symbol,
            name: instrument.name,
            asset_type: instrument.assetType,
            currency: instrument.currency,
            exchange: instrument.exchange,
            sector: instrument.sector,
            provider: 'stooq',
            provider_symbol: instrument.providerSymbol,
            is_active: true,
            updated_at: new Date(),
          },
          create: {
            code: instrument.code,
            symbol: instrument.symbol,
            name: instrument.name,
            asset_type: instrument.assetType,
            currency: instrument.currency,
            exchange: instrument.exchange,
            sector: instrument.sector,
            provider: 'stooq',
            provider_symbol: instrument.providerSymbol,
          },
        }),
      ),
    );
  }

  private async applyDueIncomeRules(accountId: bigint) {
    const now = new Date();
    const dueRules = await this.prisma.demo_income_rules.findMany({
      where: {
        account_id: accountId,
        is_active: true,
        next_run_at: { lte: now },
      },
      orderBy: { next_run_at: 'asc' },
    });

    if (dueRules.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const rule of dueRules) {
        const effectiveAt = rule.next_run_at ?? now;
        const updatedAccount = await tx.demo_accounts.update({
          where: { id: accountId },
          data: {
            cash_balance: { increment: rule.amount },
            updated_at: new Date(),
          },
        });

        await tx.demo_cash_transactions.create({
          data: {
            account_id: accountId,
            kind: 'scheduled_income',
            amount: rule.amount,
            currency: rule.currency,
            description: rule.title,
            effective_at: effectiveAt,
          },
        });

        await tx.demo_income_rules.update({
          where: { id: rule.id },
          data: {
            next_run_at: this.nextMonthlyRunAfter(rule.day_of_month, effectiveAt),
            updated_at: new Date(),
          },
        });

        await tx.demo_portfolio_snapshots.create({
          data: {
            account_id: accountId,
            cash_value: updatedAccount.cash_balance,
            positions_value: new Prisma.Decimal(0),
            total_value: updatedAccount.cash_balance,
            invested_value: new Prisma.Decimal(0),
            snapshot_at: effectiveAt,
          },
        });
      }
    });
  }

  private async getRubRates() {
    const instruments = await this.prisma.demo_instruments.findMany({
      where: { symbol: { in: ['USDRUB', 'EURRUB'] } },
      include: { demo_price_cache: true },
    });
    return this.extractRates(instruments);
  }

  private extractRates(
    instruments: Array<{
      symbol: string;
      demo_price_cache: { price: Prisma.Decimal | null } | null;
    }>,
  ) {
    const usdRub = instruments.find((instrument) => instrument.symbol === 'USDRUB');
    const eurRub = instruments.find((instrument) => instrument.symbol === 'EURRUB');

    return {
      USD: usdRub?.demo_price_cache?.price ?? null,
      EUR: eurRub?.demo_price_cache?.price ?? null,
    };
  }

  private convertToRub(
    amount: Prisma.Decimal,
    currency: string,
    rates: { USD: Prisma.Decimal | null; EUR: Prisma.Decimal | null },
  ) {
    if (currency === 'RUB') return amount;
    if (currency === 'USD' && rates.USD) return amount.mul(rates.USD);
    if (currency === 'EUR' && rates.EUR) return amount.mul(rates.EUR);

    throw new BadRequestException(`RUB rate is missing for ${currency}`);
  }

  private toPositionView(
    position: {
      account_id: bigint;
      instrument_id: bigint;
      quantity: Prisma.Decimal;
      avg_price: Prisma.Decimal;
      created_at: Date;
      updated_at: Date;
      demo_instruments: {
        id: bigint;
        code: string;
        symbol: string;
        name: string;
        asset_type: string;
        currency: string;
        exchange: string | null;
        sector: string | null;
        provider: string;
        provider_symbol: string;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        demo_price_cache: {
          price: Prisma.Decimal;
          currency: string;
          change_abs: Prisma.Decimal | null;
          change_percent: Prisma.Decimal | null;
          as_of: Date;
          provider: string;
          updated_at: Date;
        } | null;
      };
    },
    rates: { USD: Prisma.Decimal | null; EUR: Prisma.Decimal | null },
  ) {
    const quote = position.demo_instruments.demo_price_cache;
    const marketPrice = quote?.price ?? position.avg_price;
    const quoteCurrency = quote?.currency ?? position.demo_instruments.currency;
    const marketValueRub = this.convertToRub(
      marketPrice.mul(position.quantity),
      quoteCurrency,
      rates,
    );
    const costBasisRub = this.convertToRub(
      position.avg_price.mul(position.quantity),
      quoteCurrency,
      rates,
    );
    const unrealizedPnlRub = marketValueRub.minus(costBasisRub);
    const unrealizedPnlPercent = costBasisRub.equals(0)
      ? new Prisma.Decimal(0)
      : unrealizedPnlRub.div(costBasisRub).mul(100);

    return {
      ...position,
      marketPrice,
      marketValueRub,
      costBasisRub,
      unrealizedPnlRub,
      unrealizedPnlPercent,
    };
  }

  private nextMonthlyRun(dayOfMonth: number): Date {
    const now = new Date();
    const next = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, 9, 0, 0),
    );

    if (next <= now) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }

    return next;
  }

  private nextMonthlyRunAfter(dayOfMonth: number, after: Date): Date {
    return new Date(
      Date.UTC(after.getUTCFullYear(), after.getUTCMonth() + 1, dayOfMonth, 9, 0, 0),
    );
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
