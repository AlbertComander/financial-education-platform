import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDemoAccountDto } from './dto/create-demo-account.dto';
import { DepositDemoCashDto } from './dto/deposit-demo-cash.dto';
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
    const [transactions, incomeRules, instruments] = await Promise.all([
      this.prisma.demo_cash_transactions.findMany({
        where: { account_id: account.id },
        orderBy: { effective_at: 'desc' },
        take: 8,
      }),
      this.prisma.demo_income_rules.findMany({
        where: { account_id: account.id },
        orderBy: { created_at: 'desc' },
      }),
      this.listInstruments(),
    ]);

    return {
      account,
      transactions,
      incomeRules,
      instruments,
      summary: {
        cashBalance: account.cash_balance,
        positionsValue: new Prisma.Decimal(0),
        totalValue: account.cash_balance,
        investedValue: new Prisma.Decimal(0),
      },
    };
  }

  async createOrUpdateAccount(userId: bigint, dto: CreateDemoAccountDto) {
    const currency = dto.currency ?? 'USD';
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
      currency: 'USD',
      initialCash: 10000,
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

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
