import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDemoInstrumentProfileDto } from './dto/admin-instrument-profile.dto';
import { CreateDemoAccountDto } from './dto/create-demo-account.dto';
import { DepositDemoCashDto } from './dto/deposit-demo-cash.dto';
import { ExchangeDemoCurrencyDto } from './dto/exchange-demo-currency.dto';
import { PlaceDemoTradeDto } from './dto/place-demo-trade.dto';
import { UpdateDemoAccountStateDto } from './dto/update-demo-account-state.dto';
import { UpsertIncomeRuleDto } from './dto/upsert-income-rule.dto';
import {
  DEMO_INSTRUMENTS,
  MarketDataService,
  type MarketDividend,
} from './market-data.service';

const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'CHF', 'JPY', 'HKD'] as const;
type DemoCurrency = (typeof SUPPORTED_CURRENCIES)[number];
const BROKER_COMMISSION_RATE = new Prisma.Decimal('0.003');

const STATIC_INSTRUMENT_METRICS = [
  {
    section: 'Финансовые показатели',
    label: 'Market Cap',
    hint: 'Стоимость компании',
  },
  { section: 'Оценка стоимости', label: 'P/E', hint: 'Цена акции / прибыль' },
  { section: 'Оценка стоимости', label: 'P/S', hint: 'Цена акции / выручка' },
  { section: 'Оценка стоимости', label: 'Рост EPS', hint: 'Средний рост за 5 лет' },
  { section: 'Оценка стоимости', label: 'Рост выручки', hint: 'Средний рост за 5 лет' },
  { section: 'Рентабельность', label: 'ROE', hint: 'Доходность капитала' },
  { section: 'Рентабельность', label: 'ROA', hint: 'Доходность активов' },
  { section: 'Дивиденды', label: 'Payout Ratio', hint: 'Процент дивидендов от прибыли' },
  { section: 'Дивиденды', label: 'Средний дивидендный доход', hint: 'За 5 лет' },
  { section: 'Дивиденды', label: 'Дивидендная доходность', hint: 'За год' },
  { section: 'Торговля', label: 'Цена открытия', hint: 'Текущая сессия' },
  { section: 'Торговля', label: '52w Low', hint: 'Минимум за год' },
  { section: 'Торговля', label: '52w High', hint: 'Максимум за год' },
  { section: 'Торговля', label: 'Объем торгов', hint: 'За день' },
] as const;

@Injectable()
export class DemoAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketData: MarketDataService,
  ) {}

  async getOverview(userId: bigint, accountId?: bigint) {
    const account = await this.ensureAccount(userId, accountId);
    const userAccounts = await this.prisma.demo_accounts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'asc' },
    });
    await Promise.all(
      userAccounts.map(async (item) => {
        await this.applyDueIncomeRules(item.id);
        await this.applyDueBondCoupons(item.id);
      }),
    );
    const freshAccount = await this.prisma.demo_accounts.findUniqueOrThrow({
      where: { id: account.id },
    });
    await this.ensureCashBalances(freshAccount.id);

    const accountIds = userAccounts.map((item) => item.id);
    const [transactions, incomeRules, instruments, positions, allPositions, trades, cashBalances] =
      await Promise.all([
        this.prisma.demo_cash_transactions.findMany({
          where: { account_id: freshAccount.id },
          orderBy: { effective_at: 'desc' },
          take: 100,
        }),
        this.prisma.demo_income_rules.findMany({
          where: { account_id: freshAccount.id },
          orderBy: { created_at: 'desc' },
        }),
        this.listInstruments(userId),
        this.prisma.demo_positions.findMany({
          where: { account_id: freshAccount.id },
          include: {
            demo_instruments: {
              include: { demo_price_cache: true },
            },
          },
          orderBy: { updated_at: 'desc' },
        }),
        this.prisma.demo_positions.findMany({
          where: { account_id: { in: accountIds } },
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
          take: 10,
        }),
        this.prisma.demo_cash_balances.findMany({
          where: { account_id: freshAccount.id },
          orderBy: { currency: 'asc' },
        }),
      ]);

    const rates = this.extractRates(instruments);
    const positionViews = positions.map((position) =>
      this.toPositionView(position, rates),
    );
    const allPositionViews = allPositions.map((position) =>
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
    const cashValueRub = cashBalances.reduce(
      (sum, balance) =>
        sum.plus(this.convertToRub(balance.amount, balance.currency, rates, false)),
      new Prisma.Decimal(0),
    );
    const totalValue = cashValueRub.plus(positionsValue);
    await this.recordOverviewSnapshot(
      freshAccount.id,
      cashValueRub,
      positionsValue,
      totalValue,
      investedValue,
    );
    const now = new Date();
    const snapshotFrom = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const snapshots = await this.prisma.demo_portfolio_snapshots.findMany({
      where: {
        account_id: freshAccount.id,
        snapshot_at: { gte: snapshotFrom },
      },
      orderBy: { snapshot_at: 'asc' },
      take: 1000,
    });

    const accountSummaries = await Promise.all(
      userAccounts.map((item) => this.buildAccountListItem(item, rates)),
    );

    return {
      accounts: accountSummaries,
      account: freshAccount,
      cashBalances,
      transactions,
      incomeRules,
      instruments,
      positions: positionViews,
      allPositions: allPositionViews,
      trades: trades.map((trade) => ({
        ...trade,
        demo_instruments: this.enrichInstrument(trade.demo_instruments),
      })),
      snapshots,
      summary: {
        cashBalance: this.balanceAmount(cashBalances, 'RUB'),
        cashValueRub,
        positionsValue,
        totalValue,
        investedValue,
      },
    };
  }

  async createOrUpdateAccount(userId: bigint, dto: CreateDemoAccountDto) {
    const initialCash = new Prisma.Decimal(dto.initialCash ?? 0);
    const accountsCount = await this.prisma.demo_accounts.count({
      where: { user_id: userId },
    });
    const defaultName = accountsCount === 0 ? 'Демо-счет' : `Демо-счет ${accountsCount + 1}`;

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.demo_accounts.create({
        data: {
          user_id: userId,
          name: dto.name?.trim() || defaultName,
          currency: 'RUB',
          cash_balance: initialCash,
        },
      });

      await this.ensureCashBalancesTx(tx, account.id, initialCash);

      if (initialCash.greaterThan(0)) {
        await tx.demo_cash_transactions.create({
          data: {
            account_id: account.id,
            kind: 'manual_deposit',
            amount: initialCash,
            currency: 'RUB',
            description: 'Стартовый демо-капитал',
          },
        });
      }

      return account;
    });
  }

  async depositCash(userId: bigint, accountId: bigint | undefined, dto: DepositDemoCashDto) {
    const account = await this.ensureAccount(userId, accountId);
    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.incrementCashBalanceTx(tx, account.id, 'RUB', amount);
      const updated = await tx.demo_accounts.update({
        where: { id: account.id },
        data: {
          cash_balance: balance.amount,
          updated_at: new Date(),
        },
      });

      const transaction = await tx.demo_cash_transactions.create({
        data: {
          account_id: account.id,
          kind: 'manual_deposit',
          amount,
          currency: 'RUB',
          description: dto.description ?? 'Ручное пополнение демо-счета',
        },
      });

      await this.createSnapshotTx(tx, account.id, updated.cash_balance);
      return { account: updated, transaction };
    });
  }

  async updateAccountState(userId: bigint, accountId: bigint | undefined, dto: UpdateDemoAccountStateDto) {
    const account = await this.ensureAccount(userId, accountId);

    return this.prisma.$transaction(async (tx) => {
      await this.ensureCashBalancesTx(tx, account.id);

      if (dto.cashBalances) {
        for (const item of dto.cashBalances) {
          const currency = item.currency as DemoCurrency;
          const nextAmount = new Prisma.Decimal(item.amount);
          const current = await this.getBalanceTx(tx, account.id, currency);
          const correction = nextAmount.minus(current.amount);

          await tx.demo_cash_balances.update({
            where: {
              account_id_currency: {
                account_id: account.id,
                currency,
              },
            },
            data: {
              amount: nextAmount,
              updated_at: new Date(),
            },
          });

          if (!correction.equals(0)) {
            await tx.demo_cash_transactions.create({
              data: {
                account_id: account.id,
                kind: 'manual_adjustment',
                amount: correction,
                currency,
                description: `Коррекция баланса ${currency}`,
              },
            });
          }
        }
      }

      if (dto.positions) {
        for (const item of dto.positions) {
          const instrument = await tx.demo_instruments.findUnique({
            where: { id: BigInt(item.instrumentId) },
            include: { demo_price_cache: true },
          });
          if (!instrument || !instrument.is_active) {
            throw new BadRequestException('Инструмент недоступен.');
          }

          const quantity = new Prisma.Decimal(item.quantity);
          if (quantity.equals(0)) {
            await tx.demo_positions.deleteMany({
              where: {
                account_id: account.id,
                instrument_id: instrument.id,
              },
            });
            continue;
          }

          const fallbackPrice =
            instrument.demo_price_cache?.price ?? new Prisma.Decimal(0);
          const avgPrice =
            item.avgPrice === undefined
              ? fallbackPrice
              : new Prisma.Decimal(item.avgPrice);

          await tx.demo_positions.upsert({
            where: {
              account_id_instrument_id: {
                account_id: account.id,
                instrument_id: instrument.id,
              },
            },
            update: {
              quantity,
              avg_price: avgPrice,
              updated_at: new Date(),
            },
            create: {
              account_id: account.id,
              instrument_id: instrument.id,
              quantity,
              avg_price: avgPrice,
            },
          });
        }
      }

      const rubBalance = await this.getBalanceTx(tx, account.id, 'RUB');
      const updated = await tx.demo_accounts.update({
        where: { id: account.id },
        data: {
          name: dto.name ?? account.name,
          cash_balance: rubBalance.amount,
          updated_at: new Date(),
        },
      });
      await this.createSnapshotTx(tx, account.id, rubBalance.amount);

      return updated;
    });
  }

  async exchangeCurrency(userId: bigint, accountId: bigint | undefined, dto: ExchangeDemoCurrencyDto) {
    if (dto.fromCurrency === dto.toCurrency) {
      throw new BadRequestException('Выберите разные валюты.');
    }

    const account = await this.ensureAccount(userId, accountId);
    const fromCurrency = dto.fromCurrency as DemoCurrency;
    const toCurrency = dto.toCurrency as DemoCurrency;
    const fromAmount = new Prisma.Decimal(dto.fromAmount);
    const instruments = await this.listInstruments();
    const rates = this.extractRates(instruments);
    const rubValue = this.convertToRub(fromAmount, fromCurrency, rates);
    const toAmount = this.convertRubTo(rubValue, toCurrency, rates);

    return this.prisma.$transaction(async (tx) => {
      await this.decrementCashBalanceTx(tx, account.id, fromCurrency, fromAmount);
      await this.incrementCashBalanceTx(tx, account.id, toCurrency, toAmount);

      await tx.demo_cash_transactions.createMany({
        data: [
          {
            account_id: account.id,
            kind: 'currency_exchange_out',
            amount: fromAmount.negated(),
            currency: fromCurrency,
            description: `Обмен ${fromCurrency} на ${toCurrency}`,
          },
          {
            account_id: account.id,
            kind: 'currency_exchange_in',
            amount: toAmount,
            currency: toCurrency,
            description: `Обмен ${fromCurrency} на ${toCurrency}`,
          },
        ],
      });

      const rubBalance = await this.getBalanceTx(tx, account.id, 'RUB');
      await tx.demo_accounts.update({
        where: { id: account.id },
        data: { cash_balance: rubBalance.amount, updated_at: new Date() },
      });
      await this.createSnapshotTx(tx, account.id, rubBalance.amount);

      return { fromCurrency, toCurrency, fromAmount, toAmount };
    });
  }

  async createIncomeRule(userId: bigint, accountId: bigint | undefined, dto: UpsertIncomeRuleDto) {
    const account = await this.ensureAccount(userId, accountId);
    const nextRunAt = this.nextMonthlyRun(dto.dayOfMonth);

    return this.prisma.demo_income_rules.create({
      data: {
        account_id: account.id,
        title: dto.title,
        amount: new Prisma.Decimal(dto.amount),
        currency: 'RUB',
        day_of_month: dto.dayOfMonth,
        is_active: dto.isActive ?? true,
        next_run_at: nextRunAt,
      },
    });
  }

  async placeTrade(userId: bigint, accountId: bigint | undefined, dto: PlaceDemoTradeDto) {
    const account = await this.ensureAccount(userId, accountId);
    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id: BigInt(dto.instrumentId) },
      include: { demo_price_cache: true },
    });

    if (!instrument || !instrument.is_active) {
      throw new BadRequestException('Инструмент недоступен для торговли.');
    }

    if (!instrument.demo_price_cache) {
      throw new BadRequestException('Обновите котировки перед сделкой по этому инструменту.');
    }

    const quote = instrument.demo_price_cache;
    if (instrument.asset_type === 'currency') {
      return this.placeCurrencyTrade(account.id, instrument, dto);
    }

    const tradeCurrency = quote.currency as DemoCurrency;
    const quantity = new Prisma.Decimal(dto.quantity);
    const price = this.resolveOrderPrice(instrument, quote.price, dto);
    const gross = price.mul(quantity);
    const commission = gross.mul(BROKER_COMMISSION_RATE);
    const cashImpact = gross.plus(commission);

    return this.prisma.$transaction(async (tx) => {
      const currentPosition = await tx.demo_positions.findUnique({
        where: {
          account_id_instrument_id: {
            account_id: account.id,
            instrument_id: instrument.id,
          },
        },
      });

      if (dto.side === 'buy') {
        await this.decrementCashBalanceTx(tx, account.id, tradeCurrency, cashImpact);
        const oldQuantity = currentPosition?.quantity ?? new Prisma.Decimal(0);
        const oldAvgPrice = currentPosition?.avg_price ?? new Prisma.Decimal(0);
        const newQuantity = oldQuantity.plus(quantity);
        const newAvgPrice = oldQuantity
          .mul(oldAvgPrice)
          .plus(quantity.mul(price))
          .div(newQuantity);

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
          throw new BadRequestException('Недостаточно бумаг для продажи.');
        }

        const newQuantity = currentPosition.quantity.minus(quantity);
        await this.incrementCashBalanceTx(
          tx,
          account.id,
          tradeCurrency,
          gross.minus(commission),
        );

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
          currency: tradeCurrency,
          commission,
        },
      });

      const rubBalance = await this.getBalanceTx(tx, account.id, 'RUB');
      await tx.demo_accounts.update({
        where: { id: account.id },
        data: { cash_balance: rubBalance.amount, updated_at: new Date() },
      });
      await this.createSnapshotTx(tx, account.id, rubBalance.amount);

      return { trade };
    });
  }

  private async placeCurrencyTrade(
    accountId: bigint,
    instrument: {
      id: bigint;
      symbol: string;
      demo_price_cache: {
        price: Prisma.Decimal;
        currency: string;
      } | null;
    },
    dto: PlaceDemoTradeDto,
  ) {
    const targetCurrency = this.currencyFromInstrument(instrument.symbol);
    const quote = instrument.demo_price_cache;
    if (!quote) {
      throw new BadRequestException('Обновите котировки перед сделкой по этому инструменту.');
    }

    const quantity = new Prisma.Decimal(dto.quantity);
    const price = this.resolveOrderPrice(
      { asset_type: 'currency' },
      quote.price,
      dto,
    );
    const rubValue = price.mul(quantity);
    const commission = rubValue.mul(BROKER_COMMISSION_RATE);

    return this.prisma.$transaction(async (tx) => {
      if (dto.side === 'buy') {
        await this.decrementCashBalanceTx(
          tx,
          accountId,
          'RUB',
          rubValue.plus(commission),
        );
        await this.incrementCashBalanceTx(tx, accountId, targetCurrency, quantity);
      } else {
        await this.decrementCashBalanceTx(tx, accountId, targetCurrency, quantity);
        await this.incrementCashBalanceTx(
          tx,
          accountId,
          'RUB',
          rubValue.minus(commission),
        );
      }

      const trade = await tx.demo_trades.create({
        data: {
          account_id: accountId,
          instrument_id: instrument.id,
          side: dto.side,
          quantity,
          price,
          currency: 'RUB',
          commission,
        },
      });

      const rubBalance = await this.getBalanceTx(tx, accountId, 'RUB');
      await tx.demo_accounts.update({
        where: { id: accountId },
        data: { cash_balance: rubBalance.amount, updated_at: new Date() },
      });
      await this.createSnapshotTx(tx, accountId, rubBalance.amount);

      return { trade };
    });
  }

  async listInstruments(userId?: bigint) {
    await this.ensureInstrumentCatalog();
    const [instruments, favorites] = await Promise.all([
      this.prisma.demo_instruments.findMany({
        where: { is_active: true },
        include: { demo_price_cache: true },
        orderBy: [{ asset_type: 'asc' }, { exchange: 'asc' }, { symbol: 'asc' }],
      }),
      userId
        ? this.prisma.demo_favorite_instruments.findMany({
            where: { user_id: userId },
            select: { instrument_id: true },
          })
        : Promise.resolve([]),
    ]);
    const favoriteIds = new Set(favorites.map((favorite) => favorite.instrument_id.toString()));
    return instruments.map((instrument) => ({
      ...this.enrichInstrument(instrument),
      isFavorite: favoriteIds.has(instrument.id.toString()),
    }));
  }

  async setFavoriteInstrument(userId: bigint, instrumentId: string, isFavorite: boolean) {
    await this.ensureInstrumentCatalog();
    const id = BigInt(instrumentId);
    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id },
    });

    if (!instrument || !instrument.is_active) {
      throw new BadRequestException('Инструмент недоступен.');
    }

    if (isFavorite) {
      await this.prisma.demo_favorite_instruments.upsert({
        where: {
          user_id_instrument_id: {
            user_id: userId,
            instrument_id: id,
          },
        },
        update: {},
        create: {
          user_id: userId,
          instrument_id: id,
        },
      });
      return { instrumentId, isFavorite: true };
    }

    await this.prisma.demo_favorite_instruments.deleteMany({
      where: {
        user_id: userId,
        instrument_id: id,
      },
    });
    return { instrumentId, isFavorite: false };
  }

  async getInstrumentDetails(
    instrumentId: string,
    period = '6m',
    userId?: bigint,
    accountId?: bigint,
  ) {
    const account = userId ? await this.ensureAccount(userId, accountId) : null;
    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id: BigInt(instrumentId) },
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
        demo_instrument_dividends: {
          orderBy: [{ record_date: 'desc' }, { order_index: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!instrument) {
      throw new BadRequestException('Инструмент недоступен.');
    }

    const quoteRequest = {
      provider: instrument.provider,
      provider_symbol: instrument.provider_symbol,
      currency: instrument.currency,
      asset_type: instrument.asset_type,
    };
    let candles;
    let providerFacts;
    try {
      [candles, providerFacts] = await Promise.all([
        this.marketData.getCandles(quoteRequest, this.periodToDays(period)),
        this.marketData.getProfile(quoteRequest).catch(() => ({})),
      ]);
    } catch {
      throw new BadGatewayException('Не удалось загрузить рыночные данные инструмента. Попробуйте еще раз позже.');
    }

    const first = candles[0]?.close ?? null;
    const last = candles.at(-1)?.close ?? null;
    const periodChangePercent =
      first && last ? ((last - first) / first) * 100 : null;
    const {
      demo_instrument_metrics: keyMetrics,
      demo_instrument_dividends: dividends,
      ...instrumentView
    } = instrument;

    return {
      instrument: this.enrichInstrument(instrumentView),
      candles,
      stats: {
        periodChangePercent,
        high: candles.length ? Math.max(...candles.map((candle) => candle.high)) : null,
        low: candles.length ? Math.min(...candles.map((candle) => candle.low)) : null,
      },
      providerFacts,
      keyMetrics,
      dividends,
      events: account
        ? (
            await this.prisma.demo_trades.findMany({
              where: {
                account_id: account.id,
                instrument_id: instrument.id,
              },
              include: { demo_instruments: true },
              orderBy: { executed_at: 'desc' },
              take: 100,
            })
          ).map((trade) => ({
            ...trade,
            demo_instruments: this.enrichInstrument(trade.demo_instruments),
          }))
        : [],
    };
  }

  async getAdminInstruments() {
    await this.ensureInstrumentCatalog();
    const instruments = await this.prisma.demo_instruments.findMany({
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
        demo_instrument_dividends: {
          orderBy: [{ record_date: 'desc' }, { order_index: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ asset_type: 'asc' }, { exchange: 'asc' }, { symbol: 'asc' }],
    });

    return instruments.map((instrument) => this.toAdminInstrument(instrument));
  }

  async updateAdminInstrumentProfile(
    instrumentId: string,
    dto: UpdateDemoInstrumentProfileDto,
  ) {
    const id = this.parseInstrumentId(instrumentId);
    const existing = await this.prisma.demo_instruments.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new BadRequestException('Инструмент не найден.');
    }

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.demo_instrumentsUpdateInput = {
        updated_at: new Date(),
      };

      if (dto.name !== undefined) {
        const name = dto.name.trim();
        if (!name) throw new BadRequestException('Название инструмента не может быть пустым.');
        data.name = name;
      }
      if (dto.sector !== undefined) data.sector = this.nullableText(dto.sector);
      if (dto.country !== undefined) data.country = this.nullableText(dto.country);
      if (dto.isin !== undefined) data.isin = this.nullableText(dto.isin);
      if (dto.websiteUrl !== undefined) data.website_url = this.nullableText(dto.websiteUrl);
      if (dto.logoUrl !== undefined) data.logo_url = this.nullableText(dto.logoUrl);
      if (dto.description !== undefined) {
        data.description = this.nullableText(dto.description);
      }

      await tx.demo_instruments.update({
        where: { id },
        data,
      });

      if (dto.metrics) {
        await tx.demo_instrument_metrics.deleteMany({
          where: { instrument_id: id },
        });

        const metrics = dto.metrics
          .map((metric, index) => ({
            instrument_id: id,
            section: this.nullableText(metric.section) ?? 'key',
            label: metric.label.trim(),
            value: metric.value.trim(),
            hint: this.nullableText(metric.hint),
            order_index: metric.orderIndex ?? index + 1,
          }))
          .filter((metric) => metric.label.length > 0 && metric.value.length > 0);

        if (metrics.length > 0) {
          await tx.demo_instrument_metrics.createMany({
            data: metrics,
          });
        }
      }

      if (dto.dividends) {
        await tx.demo_instrument_dividends.deleteMany({
          where: { instrument_id: id },
        });

        const dividends = dto.dividends
          .map((dividend, index) => ({
            instrument_id: id,
            record_date: this.parseDateOnly(dividend.recordDate),
            amount: new Prisma.Decimal(dividend.amount),
            currency: this.nullableText(dividend.currency) ?? existing.currency,
            yield_percent:
              dividend.yieldPercent === undefined
                ? null
                : new Prisma.Decimal(dividend.yieldPercent),
            period: this.nullableText(dividend.period),
            declared_at: dividend.declaredAt
              ? this.parseDateOnly(dividend.declaredAt)
              : null,
            order_index: dividend.orderIndex ?? index + 1,
          }))
          .filter((dividend) => dividend.amount.greaterThanOrEqualTo(0));

        if (dividends.length > 0) {
          await tx.demo_instrument_dividends.createMany({
            data: dividends,
          });
        }
      }
    });

    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id },
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
        demo_instrument_dividends: {
          orderBy: [{ record_date: 'desc' }, { order_index: 'asc' }, { id: 'asc' }],
        },
      },
    });

    if (!instrument) {
      throw new BadRequestException('Инструмент не найден.');
    }

    return this.toAdminInstrument(instrument);
  }

  async saveAdminInstrumentLogo(
    instrumentId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    const id = this.parseInstrumentId(instrumentId);
    const instrument = await this.prisma.demo_instruments.findUnique({
      where: { id },
    });

    if (!instrument) {
      throw new BadRequestException('Инструмент не найден.');
    }

    const allowedMimeTypes = new Map<string, string>([
      ['image/png', '.png'],
      ['image/jpeg', '.jpg'],
      ['image/webp', '.webp'],
    ]);
    const fallbackExtension = allowedMimeTypes.get(file.mimetype);

    if (!fallbackExtension) {
      throw new BadRequestException('Поддерживаются только PNG, JPEG и WEBP.');
    }

    const uploadsDir = join(process.cwd(), 'uploads', 'instrument-logos');
    await mkdir(uploadsDir, { recursive: true });

    const originalExtension = extname(file.originalname).toLowerCase();
    const extension =
      originalExtension && [...allowedMimeTypes.values()].includes(originalExtension)
        ? originalExtension
        : fallbackExtension;
    const fileName = `${randomUUID()}${extension}`;
    const logoUrl = `/uploads/instrument-logos/${fileName}`;

    await writeFile(join(uploadsDir, fileName), file.buffer);

    const updated = await this.prisma.demo_instruments.update({
      where: { id },
      data: {
        logo_url: logoUrl,
        updated_at: new Date(),
      },
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
        demo_instrument_dividends: {
          orderBy: [{ record_date: 'desc' }, { order_index: 'asc' }, { id: 'asc' }],
        },
      },
    });

    return {
      logoUrl,
      instrument: this.toAdminInstrument(updated),
    };
  }

  async importInstrumentMarketData() {
    await this.ensureInstrumentCatalog();
    await this.refreshQuotes().catch(() => null);

    const instruments = await this.prisma.demo_instruments.findMany({
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
        demo_instrument_dividends: true,
      },
      orderBy: [{ asset_type: 'asc' }, { exchange: 'asc' }, { symbol: 'asc' }],
    });
    const summary = {
      instruments: 0,
      metrics: 0,
      dividends: 0,
      failed: [] as Array<{ symbol: string; reason: string }>,
    };

    for (const instrument of instruments) {
      try {
        const quoteRequest = {
          provider: instrument.provider,
          provider_symbol: instrument.provider_symbol,
          currency: instrument.currency,
          asset_type: instrument.asset_type,
        };
        const [profileResult, dividendsResult] = await Promise.allSettled([
          this.marketData.getProfile(quoteRequest),
          this.marketData.getDividends(quoteRequest),
        ]);
        const profile =
          profileResult.status === 'fulfilled' ? profileResult.value : {};
        const dividends =
          dividendsResult.status === 'fulfilled' ? dividendsResult.value : [];
        const existingMetricByLabel = new Map(
          instrument.demo_instrument_metrics.map((metric) => [metric.label, metric]),
        );
        const importedValues = this.buildImportedMetricValues(
          instrument,
          profile,
          dividends,
        );
        const metrics = STATIC_INSTRUMENT_METRICS
          .map((definition, index) => {
            const value =
              importedValues.get(definition.label) ??
              existingMetricByLabel.get(definition.label)?.value ??
              '';

            return {
              instrument_id: instrument.id,
              section: definition.section,
              label: definition.label,
              value,
              hint: definition.hint,
              order_index: index + 1,
            };
          })
          .filter((metric) => metric.value.trim().length > 0);
        const metadataUpdate = this.buildImportedMetadata(instrument, profile);

        await this.prisma.$transaction(async (tx) => {
          if (Object.keys(metadataUpdate).length > 0) {
            await tx.demo_instruments.update({
              where: { id: instrument.id },
              data: {
                ...metadataUpdate,
                updated_at: new Date(),
              },
            });
          }

          await tx.demo_instrument_metrics.deleteMany({
            where: { instrument_id: instrument.id },
          });

          if (metrics.length > 0) {
            await tx.demo_instrument_metrics.createMany({ data: metrics });
          }

          if (dividends.length > 0) {
            await tx.demo_instrument_dividends.deleteMany({
              where: { instrument_id: instrument.id },
            });
            await tx.demo_instrument_dividends.createMany({
              data: dividends.slice(0, 120).map((dividend, index) => ({
                instrument_id: instrument.id,
                record_date: dividend.recordDate,
                amount: new Prisma.Decimal(dividend.amount),
                currency: dividend.currency || instrument.currency,
                yield_percent:
                  dividend.yieldPercent === null
                    ? null
                    : new Prisma.Decimal(dividend.yieldPercent),
                period: dividend.period,
                declared_at: dividend.declaredAt,
                order_index: index + 1,
              })),
            });
          }
        });

        summary.instruments += 1;
        summary.metrics += metrics.length;
        summary.dividends += dividends.length;
      } catch (error) {
        summary.failed.push({
          symbol: instrument.symbol,
          reason: error instanceof Error ? error.message : 'Unknown import error',
        });
      }
    }

    return summary;
  }

  async fillInstrumentProfileDefaults() {
    await this.ensureInstrumentCatalog();

    const instruments = await this.prisma.demo_instruments.findMany({
      include: {
        demo_price_cache: true,
        demo_instrument_metrics: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ asset_type: 'asc' }, { exchange: 'asc' }, { symbol: 'asc' }],
    });
    const summary = {
      instruments: 0,
      metrics: 0,
      descriptions: 0,
      websites: 0,
      countries: 0,
      coupons: 0,
    };

    for (const instrument of instruments) {
      const existingMetricByLabel = new Map(
        instrument.demo_instrument_metrics.map((metric) => [metric.label, metric]),
      );
      const metrics = STATIC_INSTRUMENT_METRICS.map((definition, index) => ({
        instrument_id: instrument.id,
        section: definition.section,
        label: definition.label,
        value:
          existingMetricByLabel.get(definition.label)?.value?.trim() ||
          this.defaultProfileMetricValue(instrument, definition.label),
        hint: definition.hint,
        order_index: index + 1,
      }));
      const data: Prisma.demo_instrumentsUpdateInput = {
        updated_at: new Date(),
      };
      const country = instrument.country?.trim() || this.defaultInstrumentCountry(instrument);
      const websiteUrl =
        instrument.website_url?.trim() || this.defaultInstrumentWebsite(instrument);
      const description = this.curatedInstrumentDescription(instrument);

      if (!instrument.country && country) {
        data.country = country;
        summary.countries += 1;
      }

      if (!instrument.website_url && websiteUrl) {
        data.website_url = websiteUrl;
        summary.websites += 1;
      }

      if (description && instrument.description !== description) {
        data.description = description;
        summary.descriptions += 1;
      }
      const couponSchedule =
        instrument.asset_type === 'bond' ? this.buildBondCouponSchedule(instrument) : [];

      await this.prisma.$transaction(async (tx) => {
        await tx.demo_instruments.update({
          where: { id: instrument.id },
          data,
        });
        await tx.demo_instrument_metrics.deleteMany({
          where: { instrument_id: instrument.id },
        });
        await tx.demo_instrument_metrics.createMany({ data: metrics });

        if (instrument.asset_type === 'bond') {
          await tx.demo_instrument_dividends.deleteMany({
            where: { instrument_id: instrument.id },
          });
          if (couponSchedule.length > 0) {
            await tx.demo_instrument_dividends.createMany({ data: couponSchedule });
          }
        }
      });

      summary.instruments += 1;
      summary.metrics += metrics.length;
      summary.coupons += couponSchedule.length;
    }

    return summary;
  }

  private buildBondCouponSchedule(instrument: {
    id: bigint;
    symbol: string;
    code: string;
    currency: string;
    faceValue?: number | null;
    demo_price_cache?: { price: Prisma.Decimal | number | string } | null;
  }) {
    const settings = this.bondCouponSettings(instrument);
    const rows: Array<{
      instrument_id: bigint;
      record_date: Date;
      amount: Prisma.Decimal;
      currency: string;
      yield_percent: Prisma.Decimal;
      period: string;
      declared_at: Date | null;
      order_index: number;
    }> = [];
    const startYear = 2024;
    const endYear = Math.min(settings.maturityYear, 2044);

    for (let year = startYear; year <= endYear; year += 1) {
      for (const month of settings.months) {
        const date = new Date(Date.UTC(year, month - 1, settings.day));
        if (date.getUTCFullYear() > settings.maturityYear) continue;
        rows.push({
          instrument_id: instrument.id,
          record_date: date,
          amount: new Prisma.Decimal(settings.amount),
          currency: instrument.currency,
          yield_percent: new Prisma.Decimal(settings.rate),
          period: 'Купон',
          declared_at: null,
          order_index: rows.length + 1,
        });
      }
    }

    return rows
      .sort((left, right) => right.record_date.getTime() - left.record_date.getTime())
      .map((row, index) => ({ ...row, order_index: index + 1 }))
      .slice(0, 80);
  }

  private bondCouponSettings(instrument: {
    symbol: string;
    code: string;
    currency: string;
    faceValue?: number | null;
    demo_price_cache?: { price: Prisma.Decimal | number | string } | null;
  }) {
    const symbol = instrument.symbol;
    const known: Record<string, { amount: number; rate: number; maturityYear: number; months: number[]; day: number }> = {
      SU26244RMFS2: { amount: 59.84, rate: 12, maturityYear: 2034, months: [3, 9], day: 15 },
      SU26243RMFS4: { amount: 47.37, rate: 9.5, maturityYear: 2038, months: [5, 11], day: 19 },
      SU26238RMFS4: { amount: 35.4, rate: 7.1, maturityYear: 2041, months: [5, 11], day: 15 },
      TLT: { amount: 0.31, rate: 4.6, maturityYear: 2044, months: [1, 4, 7, 10], day: 7 },
      IEF: { amount: 0.24, rate: 4.1, maturityYear: 2033, months: [1, 4, 7, 10], day: 7 },
      LQD: { amount: 0.42, rate: 5.3, maturityYear: 2036, months: [1, 4, 7, 10], day: 7 },
      HYG: { amount: 0.48, rate: 7.2, maturityYear: 2031, months: [1, 4, 7, 10], day: 7 },
    };
    const codeParts = instrument.code.split(':');
    const key = known[symbol] ? symbol : codeParts[codeParts.length - 1] ?? symbol;
    const predefined = known[key];
    if (predefined) return predefined;

    const price = Number(instrument.demo_price_cache?.price ?? NaN);
    const faceValue = instrument.faceValue ?? (instrument.currency === 'RUB' ? 1000 : 100);
    const rate = instrument.currency === 'RUB' ? 11.5 : 5.2;
    return {
      amount: Number.isFinite(price) && instrument.currency !== 'RUB' ? Math.max(0.01, price * 0.013) : (faceValue * rate) / 200,
      rate,
      maturityYear: 2032,
      months: [4, 10],
      day: 7,
    };
  }

  private buildImportedMetricValues(
    instrument: {
      code: string;
      asset_type: string;
      currency: string;
      demo_price_cache: {
        price: Prisma.Decimal;
        currency: string;
        raw_json?: Prisma.JsonValue;
      } | null;
    },
    profile: Record<string, string | number | null>,
    dividends: MarketDividend[],
  ) {
    const values = new Map<string, string>();
    const raw = this.quoteRawFields(instrument.demo_price_cache?.raw_json);
    const price = instrument.demo_price_cache
      ? this.instrumentUnitPrice(instrument, instrument.demo_price_cache.price).toNumber()
      : null;
    const currency = instrument.demo_price_cache?.currency ?? instrument.currency;
    const issueSize = this.firstNumber(raw, ['ISSUESIZE']) ?? this.profileNumber(profile, ['Количество ценных бумаг']);
    const marketCap =
      price !== null && issueSize !== null && instrument.asset_type !== 'currency'
        ? price * issueSize
        : this.profileNumber(profile, ['Market Cap']);
    const openPrice =
      this.firstNumber(raw, ['OPEN', 'OPENPERIODPRICE', 'regularMarketOpen']) ??
      this.profileNumber(profile, ['Цена открытия']);
    const weekLow =
      this.firstNumber(raw, ['fiftyTwoWeekLow']) ??
      this.profileNumber(profile, ['52-недельный минимум', '52w Low']);
    const weekHigh =
      this.firstNumber(raw, ['fiftyTwoWeekHigh']) ??
      this.profileNumber(profile, ['52-недельный максимум', '52w High']);
    const volume =
      this.firstNumber(raw, ['VOLTODAY', 'VOLUME', 'regularMarketVolume']) ??
      this.profileNumber(profile, ['Объем дня']);
    const latestDividendYield =
      this.firstDividendYield(dividends) ??
      this.firstNumber(raw, ['YIELD', 'trailingAnnualDividendYield']) ??
      this.profileNumber(profile, ['Дивидендная доходность']);
    const averageDividendYield = this.averageDividendYield(dividends);

    this.setMetric(values, 'Market Cap', marketCap, (value) =>
      this.formatMetricMoney(value, currency),
    );
    this.setMetric(values, 'P/E', this.profileNumber(profile, ['P/E', 'trailingPE']));
    this.setMetric(values, 'P/S', this.profileNumber(profile, ['P/S', 'priceToSalesTrailing12Months']));
    this.setMetric(values, 'Рост EPS', this.asPercentValue(this.profileNumber(profile, ['Рост EPS', 'earningsGrowth'])), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'Рост выручки', this.asPercentValue(this.profileNumber(profile, ['Рост выручки', 'revenueGrowth'])), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'ROE', this.asPercentValue(this.profileNumber(profile, ['ROE', 'returnOnEquity'])), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'ROA', this.asPercentValue(this.profileNumber(profile, ['ROA', 'returnOnAssets'])), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'Payout Ratio', this.asPercentValue(this.profileNumber(profile, ['Payout Ratio', 'payoutRatio'])), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'Средний дивидендный доход', averageDividendYield, (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'Дивидендная доходность', this.asPercentValue(latestDividendYield), (value) => `${this.formatMetricNumber(value)}%`);
    this.setMetric(values, 'Цена открытия', openPrice, (value) =>
      this.formatMetricMoney(value, currency),
    );
    this.setMetric(values, '52w Low', weekLow, (value) =>
      this.formatMetricMoney(value, currency),
    );
    this.setMetric(values, '52w High', weekHigh, (value) =>
      this.formatMetricMoney(value, currency),
    );
    this.setMetric(values, 'Объем торгов', volume, (value) =>
      this.formatMetricNumber(value, 0),
    );

    return values;
  }

  private buildImportedMetadata(
    instrument: {
      exchange: string | null;
      country: string | null;
      isin: string | null;
      description: string | null;
    },
    profile: Record<string, string | number | null>,
  ): Prisma.demo_instrumentsUpdateInput {
    const data: Prisma.demo_instrumentsUpdateInput = {};
    const isin = this.profileString(profile, ['ISIN', 'ISIN код']);

    if (!instrument.country) {
      data.country = this.countryFromExchange(instrument.exchange);
    }

    if (!instrument.isin && isin) {
      data.isin = isin;
    }

    if (!instrument.description) {
      const description = this.profileString(profile, [
        'Полное наименование',
        'Полное название',
        'Наименование',
      ]);
      if (description) data.description = description;
    }

    return data;
  }

  private periodToDays(period: string) {
    if (period === '1m') return 31;
    if (period === '3m') return 93;
    if (period === '6m') return 186;
    if (period === '1y') return 366;
    if (period === '3y') return 1098;
    return 186;
  }

  async refreshQuotes() {
    await this.ensureInstrumentCatalog();
    const instruments = await this.prisma.demo_instruments.findMany({
      where: { is_active: true },
    });

    try {
      const quotes = await this.marketData.getQuotes(
        instruments.map((instrument) => ({
          provider: instrument.provider,
          provider_symbol: instrument.provider_symbol,
          currency: instrument.currency,
          asset_type: instrument.asset_type,
        })),
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
      throw new BadGatewayException('Поставщик рыночных данных временно недоступен. Попробуйте обновить котировки позже.');
    }

    return this.listInstruments();
  }

  private async ensureAccount(userId: bigint, accountId?: bigint) {
    const account = accountId
      ? await this.prisma.demo_accounts.findFirst({
          where: { id: accountId, user_id: userId },
        })
      : await this.prisma.demo_accounts.findFirst({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        });

    if (accountId && !account) {
      throw new BadRequestException('Демо-счет не найден или недоступен.');
    }

    if (account) {
      await this.ensureCashBalances(account.id);
      return account;
    }

    return this.createOrUpdateAccount(userId, {
      name: 'Демо-счет',
      currency: 'RUB',
      initialCash: 100000,
    });
  }

  private parseInstrumentId(instrumentId: string) {
    try {
      const id = BigInt(instrumentId);
      if (id > 0n) return id;
    } catch {}

    throw new BadRequestException('Некорректный идентификатор инструмента.');
  }

  private nullableText(value?: string | null) {
    const text = value?.trim();
    return text ? text : null;
  }

  private quoteRawFields(rawJson: unknown): Record<string, unknown> {
    if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
      return {};
    }

    const raw = rawJson as Record<string, unknown>;
    const meta =
      raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)
        ? (raw.meta as Record<string, unknown>)
        : {};

    return { ...raw, ...meta };
  }

  private firstNumber(raw: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = this.numberFromUnknown(raw[key]);
      if (value !== null) return value;
    }

    return null;
  }

  private profileNumber(
    profile: Record<string, string | number | null>,
    labels: string[],
  ) {
    for (const label of labels) {
      const exact = this.numberFromUnknown(profile[label]);
      if (exact !== null) return exact;

      const entry = Object.entries(profile).find(([key]) =>
        key.toLocaleLowerCase('ru-RU').includes(label.toLocaleLowerCase('ru-RU')),
      );
      const value = this.numberFromUnknown(entry?.[1]);
      if (value !== null) return value;
    }

    return null;
  }

  private profileString(
    profile: Record<string, string | number | null>,
    labels: string[],
  ) {
    for (const label of labels) {
      const exact = profile[label];
      if (typeof exact === 'string' && exact.trim()) return exact.trim();

      const entry = Object.entries(profile).find(([key]) =>
        key.toLocaleLowerCase('ru-RU').includes(label.toLocaleLowerCase('ru-RU')),
      );
      if (typeof entry?.[1] === 'string' && entry[1].trim()) return entry[1].trim();
    }

    return null;
  }

  private numberFromUnknown(value: unknown) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private setMetric(
    metrics: Map<string, string>,
    label: string,
    value: number | null,
    formatter: (value: number) => string = (item) => this.formatMetricNumber(item),
  ) {
    if (value === null || !Number.isFinite(value)) return;
    metrics.set(label, formatter(value));
  }

  private asPercentValue(value: number | null) {
    if (value === null) return null;
    return Math.abs(value) <= 1 ? value * 100 : value;
  }

  private firstDividendYield(dividends: MarketDividend[]) {
    return dividends.find((dividend) => dividend.yieldPercent !== null)?.yieldPercent ?? null;
  }

  private averageDividendYield(dividends: MarketDividend[]) {
    const yields = dividends
      .filter((dividend) => dividend.yieldPercent !== null)
      .slice(0, 5)
      .map((dividend) => dividend.yieldPercent as number);

    if (yields.length === 0) return null;
    return yields.reduce((sum, value) => sum + value, 0) / yields.length;
  }

  private formatMetricMoney(value: number, currency: string) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
      notation: Math.abs(value) >= 1_000_000_000 ? 'compact' : 'standard',
    }).format(value);
  }

  private formatMetricNumber(value: number, maximumFractionDigits = 2) {
    return new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits,
    }).format(value);
  }

  private countryFromExchange(exchange: string | null) {
    if (!exchange) return null;
    if (exchange.includes('MOEX')) return 'Россия';
    if (exchange === 'SSE' || exchange === 'SZSE') return 'Китай';
    if (exchange === 'XETRA' || exchange.includes('Euronext')) return 'Европа';
    if (exchange === 'Crypto') return 'Крипто';
    return 'США';
  }

  private parseDateOnly(value: string) {
    const date = new Date(
      value.length === 10 ? `${value}T00:00:00.000Z` : value,
    );

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Некорректная дата.');
    }

    return date;
  }

  private async ensureInstrumentCatalog() {
    await this.prisma.$transaction(
      DEMO_INSTRUMENTS.map((instrument) =>
        this.prisma.demo_instruments.upsert({
          where: { code: instrument.code },
          update: {
            symbol: instrument.symbol,
            asset_type: instrument.assetType,
            currency: instrument.currency,
            exchange: instrument.exchange,
            provider: instrument.provider,
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
            provider: instrument.provider,
            provider_symbol: instrument.providerSymbol,
          },
        }),
      ),
    );
  }

  private async ensureCashBalances(accountId: bigint) {
    const account = await this.prisma.demo_accounts.findUniqueOrThrow({
      where: { id: accountId },
    });
    await this.prisma.$transaction(async (tx) => {
      await this.ensureCashBalancesTx(tx, accountId, account.cash_balance);
    });
  }

  private async ensureCashBalancesTx(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    rubAmount = new Prisma.Decimal(0),
  ) {
    for (const currency of SUPPORTED_CURRENCIES) {
      await tx.demo_cash_balances.upsert({
        where: {
          account_id_currency: {
            account_id: accountId,
            currency,
          },
        },
        update: {},
        create: {
          account_id: accountId,
          currency,
          amount: currency === 'RUB' ? rubAmount : new Prisma.Decimal(0),
        },
      });
    }
  }

  private async getBalanceTx(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    currency: DemoCurrency,
  ) {
    await this.ensureCashBalancesTx(tx, accountId);
    return tx.demo_cash_balances.findUniqueOrThrow({
      where: {
        account_id_currency: {
          account_id: accountId,
          currency,
        },
      },
    });
  }

  private async incrementCashBalanceTx(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    currency: DemoCurrency,
    amount: Prisma.Decimal,
  ) {
    await this.ensureCashBalancesTx(tx, accountId);
    return tx.demo_cash_balances.update({
      where: {
        account_id_currency: {
          account_id: accountId,
          currency,
        },
      },
      data: {
        amount: { increment: amount },
        updated_at: new Date(),
      },
    });
  }

  private async decrementCashBalanceTx(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    currency: DemoCurrency,
    amount: Prisma.Decimal,
  ) {
    const balance = await this.getBalanceTx(tx, accountId, currency);
    if (balance.amount.lessThan(amount)) {
      throw new BadRequestException(`Недостаточно средств в валюте ${currency}.`);
    }

    return tx.demo_cash_balances.update({
      where: {
        account_id_currency: {
          account_id: accountId,
          currency,
        },
      },
      data: {
        amount: { decrement: amount },
        updated_at: new Date(),
      },
    });
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
        const balance = await this.incrementCashBalanceTx(
          tx,
          accountId,
          rule.currency as DemoCurrency,
          rule.amount,
        );

        if (rule.currency === 'RUB') {
          await tx.demo_accounts.update({
            where: { id: accountId },
            data: {
              cash_balance: balance.amount,
              updated_at: new Date(),
            },
          });
        }

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

        await this.createSnapshotTx(tx, accountId, balance.amount, effectiveAt);
      }
    });
  }

  private async applyDueBondCoupons(accountId: bigint) {
    const now = new Date();
    const positions = await this.prisma.demo_positions.findMany({
      where: {
        account_id: accountId,
        quantity: { gt: new Prisma.Decimal(0) },
        demo_instruments: { asset_type: 'bond' },
      },
      include: {
        demo_instruments: {
          include: {
            demo_instrument_dividends: {
              where: {
                record_date: { lte: now },
              },
              orderBy: { record_date: 'asc' },
            },
          },
        },
      },
    });

    if (positions.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const position of positions) {
        for (const coupon of position.demo_instruments.demo_instrument_dividends) {
          const marker = `coupon:${coupon.id.toString()}`;
          const alreadyPaid = await tx.demo_cash_transactions.findFirst({
            where: {
              account_id: accountId,
              kind: 'bond_coupon',
              description: { contains: marker },
            },
            select: { id: true },
          });

          if (alreadyPaid) continue;

          const currency = coupon.currency as DemoCurrency;
          if (!SUPPORTED_CURRENCIES.includes(currency)) continue;

          const amount = coupon.amount.mul(position.quantity);
          if (amount.lessThanOrEqualTo(0)) continue;

          const balance = await this.incrementCashBalanceTx(
            tx,
            accountId,
            currency,
            amount,
          );

          if (currency === 'RUB') {
            await tx.demo_accounts.update({
              where: { id: accountId },
              data: {
                cash_balance: balance.amount,
                updated_at: new Date(),
              },
            });
          }

          await tx.demo_cash_transactions.create({
            data: {
              account_id: accountId,
              kind: 'bond_coupon',
              amount,
              currency,
              description: `Купон ${position.demo_instruments.name} (${marker})`,
              effective_at: coupon.record_date,
            },
          });
        }
      }
    });
  }

  private async createSnapshotTx(
    tx: Prisma.TransactionClient,
    accountId: bigint,
    cashValue: Prisma.Decimal,
    snapshotAt = new Date(),
    positionsValue = new Prisma.Decimal(0),
    investedValue = new Prisma.Decimal(0),
  ) {
    await tx.demo_portfolio_snapshots.create({
      data: {
        account_id: accountId,
        cash_value: cashValue,
        positions_value: positionsValue,
        total_value: cashValue.plus(positionsValue),
        invested_value: investedValue,
        snapshot_at: snapshotAt,
      },
    });
  }

  private async recordOverviewSnapshot(
    accountId: bigint,
    cashValue: Prisma.Decimal,
    positionsValue: Prisma.Decimal,
    totalValue: Prisma.Decimal,
    investedValue: Prisma.Decimal,
  ) {
    const lastSnapshot = await this.prisma.demo_portfolio_snapshots.findFirst({
      where: { account_id: accountId },
      orderBy: { snapshot_at: 'desc' },
    });
    const shouldCreate =
      !lastSnapshot ||
      Date.now() - lastSnapshot.snapshot_at.getTime() > 60_000 ||
      lastSnapshot.total_value.minus(totalValue).abs().greaterThan(0.01);

    if (!shouldCreate) return;

    await this.prisma.demo_portfolio_snapshots.create({
      data: {
        account_id: accountId,
        cash_value: cashValue,
        positions_value: positionsValue,
        total_value: totalValue,
        invested_value: investedValue,
      },
    });
  }

  private toAdminInstrument<
    T extends {
      code: string;
      symbol: string;
      name: string;
      asset_type: string;
      sector: string | null;
      demo_instrument_metrics: unknown[];
      demo_instrument_dividends: unknown[];
    },
  >(instrument: T) {
    const {
      demo_instrument_metrics: metrics,
      demo_instrument_dividends: dividends,
      ...baseInstrument
    } = instrument;

    return {
      ...this.enrichInstrument(baseInstrument),
      demo_instrument_metrics: metrics,
      demo_instrument_dividends: dividends,
    };
  }

  private enrichInstrument<
    T extends {
      code: string;
      symbol: string;
      name: string;
      asset_type: string;
      sector: string | null;
      description?: string | null;
    },
  >(instrument: T) {
    const seed = DEMO_INSTRUMENTS.find((item) => item.code === instrument.code);
    const rawJson = 'demo_price_cache' in instrument
      ? (instrument.demo_price_cache as { raw_json?: Record<string, unknown> } | null)?.raw_json
      : null;
    const rawLotSize = Number(rawJson?.LOTSIZE);
    const lotSize = Number.isFinite(rawLotSize) && rawLotSize > 0 ? rawLotSize : seed?.lotSize ?? 1;
    const storedDescription =
      typeof instrument.description === 'string' ? instrument.description.trim() : '';

    return {
      ...instrument,
      lotSize,
      faceValue: seed?.faceValue ?? null,
      description:
        storedDescription || seed?.description || this.instrumentDescription(instrument),
    };
  }

  private defaultInstrumentCountry(instrument: {
    exchange: string | null;
    code: string;
    asset_type: string;
  }) {
    const exchange = instrument.exchange ?? '';
    if (instrument.code.startsWith('MOEX:') || exchange.includes('MOEX')) return 'Россия';
    if (instrument.code.startsWith('US:') || ['NASDAQ', 'NYSE', 'NYSE Arca'].includes(exchange)) return 'США';
    if (instrument.code.startsWith('EU:')) return 'Европа';
    if (instrument.code.startsWith('CN:') || exchange.includes('Shanghai')) return 'Китай';
    if (instrument.asset_type === 'currency') return 'Международный рынок';
    if (instrument.asset_type === 'crypto') return 'Глобальный рынок';
    if (instrument.asset_type === 'future' || instrument.asset_type === 'option') return 'США';
    return 'Международный рынок';
  }

  private defaultInstrumentWebsite(instrument: {
    symbol: string;
    code: string;
    provider_symbol: string;
    asset_type: string;
  }) {
    const websites: Record<string, string> = {
      SBER: 'https://www.sberbank.com',
      GAZP: 'https://www.gazprom.com',
      LKOH: 'https://www.lukoil.com',
      VTBR: 'https://www.vtb.ru',
      ROSN: 'https://www.rosneft.com',
      NVTK: 'https://www.novatek.ru',
      GMKN: 'https://www.nornickel.com',
      TATN: 'https://www.tatneft.ru',
      MGNT: 'https://www.magnit.com',
      CHMF: 'https://www.severstal.com',
      AFLT: 'https://www.aeroflot.ru',
      ALRS: 'https://www.alrosa.ru',
      PLZL: 'https://www.polyus.com',
      IRAO: 'https://www.interrao.ru',
      PIKK: 'https://www.pik.ru',
      OZON: 'https://www.ozon.ru',
      SNGS: 'https://www.surgutneftegas.ru',
      SNGSP: 'https://www.surgutneftegas.ru',
      RUAL: 'https://rusal.ru',
      MTSS: 'https://moskva.mts.ru',
      HYDR: 'https://www.rushydro.ru',
      FEES: 'https://www.rosseti.ru',
      POSI: 'https://www.ptsecurity.com',
      VKCO: 'https://vk.company',
      TRNFP: 'https://www.transneft.ru',
      X5: 'https://www.x5.ru',
      YDEX: 'https://yandex.ru/company',
      TMOS: 'https://www.tbank.ru/invest/etfs/TMOS',
      AAPL: 'https://www.apple.com',
      MSFT: 'https://www.microsoft.com',
      NVDA: 'https://www.nvidia.com',
      GOOGL: 'https://abc.xyz',
      AMZN: 'https://www.amazon.com',
      META: 'https://about.meta.com',
      TSLA: 'https://www.tesla.com',
      JPM: 'https://www.jpmorganchase.com',
      XOM: 'https://corporate.exxonmobil.com',
      KO: 'https://www.coca-colacompany.com',
      BAC: 'https://www.bankofamerica.com',
      DIS: 'https://thewaltdisneycompany.com',
      AMD: 'https://www.amd.com',
      NFLX: 'https://www.netflix.com',
      ORCL: 'https://www.oracle.com',
      CRM: 'https://www.salesforce.com',
      INTC: 'https://www.intel.com',
      CSCO: 'https://www.cisco.com',
      PEP: 'https://www.pepsico.com',
      WMT: 'https://corporate.walmart.com',
      V: 'https://usa.visa.com',
      MA: 'https://www.mastercard.com',
      PG: 'https://www.pg.com',
      MCD: 'https://www.mcdonalds.com',
      SAP: 'https://www.sap.com',
      ASML: 'https://www.asml.com',
      AIR: 'https://www.airbus.com',
      SIE: 'https://www.siemens.com',
      BMW: 'https://www.bmwgroup.com',
      DTE: 'https://www.telekom.com',
      MC: 'https://www.lvmh.com',
      TTE: 'https://totalenergies.com',
      '600519': 'https://www.moutaichina.com',
      '601318': 'https://group.pingan.com',
      '600036': 'https://www.cmbchina.com',
      VOO: 'https://investor.vanguard.com/investment-products/etfs/profile/voo',
      SPY: 'https://www.ssga.com/us/en/intermediary/etfs/funds/spdr-sp-500-etf-trust-spy',
      QQQ: 'https://www.invesco.com/qqq-etf/en/home.html',
      TLT: 'https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf',
      IEF: 'https://www.ishares.com/us/products/239456/ishares-710-year-treasury-bond-etf',
      LQD: 'https://www.ishares.com/us/products/239566/ishares-iboxx-investment-grade-corporate-bond-etf',
      HYG: 'https://www.ishares.com/us/products/239565/ishares-iboxx-high-yield-corporate-bond-etf',
      BTCUSD: 'https://bitcoin.org',
      ETHUSD: 'https://ethereum.org',
      SOLUSD: 'https://solana.com',
      BNBUSD: 'https://www.bnbchain.org',
      XRPUSD: 'https://xrpl.org',
      ADAUSD: 'https://cardano.org',
      DOGEUSD: 'https://dogecoin.com',
    };

    if (websites[instrument.symbol]) return websites[instrument.symbol];
    if (instrument.asset_type === 'currency') return 'https://www.moex.com/ru/marketdata/currency';
    if (instrument.asset_type === 'future') return 'https://www.cmegroup.com/markets.html';
    if (instrument.asset_type === 'option') return 'https://www.cboe.com';
    if (instrument.asset_type === 'index') return 'https://finance.yahoo.com/quote/' + encodeURIComponent(instrument.provider_symbol);
    return 'https://finance.yahoo.com/quote/' + encodeURIComponent(instrument.provider_symbol);
  }

  private curatedInstrumentDescription(instrument: {
    name: string;
    symbol: string;
    asset_type: string;
    sector: string | null;
    exchange: string | null;
    currency: string;
  }) {
    const exchange = instrument.exchange ?? 'бирже';
    if (instrument.asset_type === 'stock') {
      return `${instrument.name} (${instrument.symbol}) — акция компании из сектора ${instrument.sector ?? 'широкого рынка'}. Карточка показывает цену, профиль, финансовые показатели и дивиденды, чтобы ученик мог сравнивать эмитентов как в настоящем брокерском приложении.`;
    }
    if (instrument.asset_type === 'etf') {
      return `${instrument.name} (${instrument.symbol}) — биржевой фонд на ${exchange}. Инструмент дает диверсифицированную экспозицию и помогает сравнивать покупку фонда с выбором отдельных акций.`;
    }
    if (instrument.asset_type === 'bond') {
      return `${instrument.name} (${instrument.symbol}) — долговой инструмент или облигационный фонд. В демо-счете он нужен для изучения купона, процентного риска, срока и роли защитной части портфеля.`;
    }
    if (instrument.asset_type === 'currency') {
      return `${instrument.name} (${instrument.symbol}) — валютная пара к рублю. Покупка валюты в демо-счете помогает увидеть, как курс влияет на портфель и расчеты по иностранным активам.`;
    }
    if (instrument.asset_type === 'crypto') {
      return `${instrument.name} (${instrument.symbol}) — криптоактив с высокой волатильностью. Он добавлен для учебного сравнения риска, ликвидности и резких ценовых движений.`;
    }
    if (instrument.asset_type === 'future') {
      return `${instrument.name} (${instrument.symbol}) — фьючерсный контракт. Такой инструмент показывает, как базовый актив, плечо, экспирация и маржинальная природа сделки меняют риск.`;
    }
    if (instrument.asset_type === 'option') {
      return `${instrument.name} (${instrument.symbol}) — опционный контракт. Его цена зависит от базового актива, страйка, срока до экспирации и волатильности.`;
    }
    if (instrument.asset_type === 'index') {
      return `${instrument.name} (${instrument.symbol}) — рыночный индекс. Он не покупается напрямую в каталоге, но служит ориентиром для сравнения динамики портфеля с рынком.`;
    }

    return `${instrument.name} (${instrument.symbol}) — учебный инструмент в валюте ${instrument.currency}.`;
  }

  private defaultProfileMetricValue(
    instrument: {
      asset_type: string;
      currency: string;
      demo_price_cache?: { price: Prisma.Decimal | number | string } | null;
    },
    label: string,
  ) {
    const price = Number(instrument.demo_price_cache?.price ?? NaN);
    const priceText = Number.isFinite(price)
      ? `${price.toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ${instrument.currency}`
      : 'обновляется по котировкам';
    const lowerLabel = label.toLocaleLowerCase('ru-RU');
    const notApplicable = ['currency', 'future', 'option', 'index'].includes(instrument.asset_type)
      ? 'не применяется'
      : 'нет данных';

    if (label === 'Market Cap') {
      if (instrument.asset_type === 'currency') return 'валютная пара';
      if (instrument.asset_type === 'crypto') return 'рыночная капитализация меняется ежедневно';
      if (instrument.asset_type === 'future') return 'срочный контракт';
      if (instrument.asset_type === 'option') return 'опционный контракт';
      if (instrument.asset_type === 'index') return 'индексная база';
      return 'рассчитывается рынком';
    }

    if (['P/E', 'P/S', 'ROE', 'ROA'].includes(label)) return notApplicable;
    if (lowerLabel.includes('eps') || lowerLabel.includes('выруч')) return notApplicable;
    if (lowerLabel.includes('payout')) return instrument.asset_type === 'stock' ? '0%' : notApplicable;
    if (lowerLabel.includes('дивиденд')) {
      return ['stock', 'etf', 'bond'].includes(instrument.asset_type) ? 'смотрите историю выплат' : notApplicable;
    }
    if (lowerLabel.includes('открыт')) return priceText;
    if (label === '52w Low' && Number.isFinite(price)) {
      return `${(price * 0.82).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ${instrument.currency}`;
    }
    if (label === '52w High' && Number.isFinite(price)) {
      return `${(price * 1.18).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ${instrument.currency}`;
    }
    if (lowerLabel.includes('объем')) return 'обновляется по данным рынка';

    return notApplicable;
  }

  private instrumentDescription(instrument: { name: string; symbol: string; asset_type: string; sector: string | null }) {
    if (instrument.asset_type === 'currency') {
      return `${instrument.name} — валютная пара для учебной покупки валюты в демо-портфеле. Сделки проходят по котировке к рублю.`;
    }
    if (instrument.asset_type === 'bond') {
      return `${instrument.name} — долговой инструмент или облигационный фонд. Для таких активов важны номинал, купон, срок погашения, кредитное качество и чувствительность к ставкам.`;
    }
    if (instrument.asset_type === 'etf') {
      return `${instrument.name} — биржевой фонд. Он дает экспозицию на набор активов, а не на одну компанию.`;
    }
    if (instrument.asset_type === 'crypto') {
      return `${instrument.name} — высоковолатильный криптоактив. В демо-счете он помогает увидеть влияние резких движений цены на портфель.`;
    }
    if (instrument.asset_type === 'future') {
      return `${instrument.name} — срочный контракт на базовый актив. В демо-счете он показывает, как меняются инструменты с высокой чувствительностью к рынку и календарю экспирации.`;
    }
    if (instrument.asset_type === 'option') {
      return `${instrument.name} — опционный контракт. Цена зависит от базового актива, страйка, срока до экспирации и волатильности.`;
    }
    if (instrument.asset_type === 'index') {
      return `${instrument.name} — рыночный индекс. Он не покупается в демо-каталоге напрямую, но помогает сравнивать портфель с широким рынком.`;
    }

    return `${instrument.name} (${instrument.symbol}) — акция из сектора ${instrument.sector ?? 'рынка'}. Карточка использует реальные котировки, а демо-счет показывает результат без риска реальных денег.`;
  }

  private instrumentUnitPrice(
    instrument: { code: string; asset_type: string },
    quotedPrice: Prisma.Decimal,
  ) {
    if (instrument.asset_type !== 'bond') return quotedPrice;

    const seed = DEMO_INSTRUMENTS.find((item) => item.code === instrument.code);
    const faceValue = seed?.faceValue;
    if (!faceValue) return quotedPrice;

    return quotedPrice.mul(faceValue).div(100);
  }

  private resolveOrderPrice(
    instrument: { code?: string; asset_type: string },
    quotedPrice: Prisma.Decimal,
    dto: PlaceDemoTradeDto,
  ) {
    const marketPrice = this.instrumentUnitPrice(
      { code: instrument.code ?? '', asset_type: instrument.asset_type },
      quotedPrice,
    );

    if ((dto.orderType ?? 'market') !== 'limit') {
      return marketPrice;
    }

    if (dto.limitPrice === undefined) {
      throw new BadRequestException('Укажите лимитную цену заявки.');
    }

    const limitPrice = new Prisma.Decimal(dto.limitPrice);
    const canExecute =
      dto.side === 'buy'
        ? marketPrice.lessThanOrEqualTo(limitPrice)
        : marketPrice.greaterThanOrEqualTo(limitPrice);

    if (!canExecute) {
      throw new BadRequestException(
        dto.side === 'buy'
          ? 'Лимитная заявка не исполнена: лучшая цена выше указанного лимита.'
          : 'Лимитная заявка не исполнена: лучшая цена ниже указанного лимита.',
      );
    }

    return marketPrice;
  }

  private extractRates(
    instruments: Array<{
      symbol: string;
      demo_price_cache: { price: Prisma.Decimal | null } | null;
    }>,
  ) {
    const rates = Object.fromEntries(
      SUPPORTED_CURRENCIES.filter((currency) => currency !== 'RUB').map((currency) => {
        const instrument = instruments.find(
          (item) => item.symbol === `${currency}RUB`,
        );
        return [currency, instrument?.demo_price_cache?.price ?? null];
      }),
    ) as Partial<Record<DemoCurrency, Prisma.Decimal | null>>;

    if (!rates.HKD && rates.USD) {
      rates.HKD = rates.USD.div(7.8);
    }

    return rates;
  }

  private convertToRub(
    amount: Prisma.Decimal,
    currency: string,
    rates: Partial<Record<DemoCurrency, Prisma.Decimal | null>>,
    strict = true,
  ) {
    if (currency === 'RUB') return amount;
    const rate = rates[currency as DemoCurrency];
    if (rate) return amount.mul(rate);

    if (!strict) return new Prisma.Decimal(0);

    throw new BadRequestException(`Не удалось получить курс ${currency}/RUB. Обновите котировки и попробуйте еще раз.`);
  }

  private convertRubTo(
    amountRub: Prisma.Decimal,
    currency: string,
    rates: Partial<Record<DemoCurrency, Prisma.Decimal | null>>,
    strict = true,
  ) {
    if (currency === 'RUB') return amountRub;
    const rate = rates[currency as DemoCurrency];
    if (rate) return amountRub.div(rate);

    if (!strict) return new Prisma.Decimal(0);

    throw new BadRequestException(`Не удалось получить курс ${currency}/RUB. Обновите котировки и попробуйте еще раз.`);
  }

  private currencyFromInstrument(symbol: string): DemoCurrency {
    const currency = symbol.replace('RUB', '') as DemoCurrency;
    if (SUPPORTED_CURRENCIES.includes(currency) && currency !== 'RUB') {
      return currency;
    }

    throw new BadRequestException(`Валютный инструмент не поддерживается: ${symbol}.`);
  }

  private async buildAccountListItem(
    account: {
      id: bigint;
      user_id: bigint;
      name: string;
      currency: string;
      cash_balance: Prisma.Decimal;
      created_at: Date;
      updated_at: Date;
    },
    rates: Partial<Record<DemoCurrency, Prisma.Decimal | null>>,
  ) {
    await this.ensureCashBalances(account.id);
    const [cashBalances, positions] = await Promise.all([
      this.prisma.demo_cash_balances.findMany({
        where: { account_id: account.id },
      }),
      this.prisma.demo_positions.findMany({
        where: { account_id: account.id },
        include: {
          demo_instruments: {
            include: { demo_price_cache: true },
          },
        },
      }),
    ]);
    const positionViews = positions.map((position) => this.toPositionView(position, rates));
    const positionsValue = positionViews.reduce(
      (sum, position) => sum.plus(position.marketValueRub),
      new Prisma.Decimal(0),
    );
    const investedValue = positionViews.reduce(
      (sum, position) => sum.plus(position.costBasisRub),
      new Prisma.Decimal(0),
    );
    const cashValueRub = cashBalances.reduce(
      (sum, balance) =>
        sum.plus(this.convertToRub(balance.amount, balance.currency, rates, false)),
      new Prisma.Decimal(0),
    );
    const totalValue = cashValueRub.plus(positionsValue);
    const dayChangeRub = positionViews.reduce((sum, position) => {
      const quote = position.demo_instruments.demo_price_cache;
      if (!quote?.change_abs) return sum;
      return sum.plus(
        this.convertToRub(
          quote.change_abs.mul(position.quantity),
          quote.currency,
          rates,
          false,
        ),
      );
    }, new Prisma.Decimal(0));
    const pnlRub = positionsValue.minus(investedValue);
    const pnlPercent = investedValue.equals(0)
      ? new Prisma.Decimal(0)
      : pnlRub.div(investedValue).mul(100);
    const dayBase = totalValue.minus(dayChangeRub);
    const dayChangePercent = dayBase.equals(0)
      ? new Prisma.Decimal(0)
      : dayChangeRub.div(dayBase).mul(100);

    return {
      ...account,
      summary: {
        cashValueRub,
        positionsValue,
        totalValue,
        investedValue,
        pnlRub,
        pnlPercent,
        dayChangeRub,
        dayChangePercent,
      },
    };
  }

  private balanceAmount(
    balances: Array<{ currency: string; amount: Prisma.Decimal }>,
    currency: string,
  ) {
    return (
      balances.find((balance) => balance.currency === currency)?.amount ??
      new Prisma.Decimal(0)
    );
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
          raw_json?: Prisma.JsonValue;
          updated_at: Date;
        } | null;
      };
    },
    rates: Partial<Record<DemoCurrency, Prisma.Decimal | null>>,
  ) {
    const quote = position.demo_instruments.demo_price_cache;
    const marketPrice = quote
      ? this.instrumentUnitPrice(position.demo_instruments, quote.price)
      : position.avg_price;
    const quoteCurrency = quote?.currency ?? position.demo_instruments.currency;
    const marketValueRub = this.convertToRub(
      marketPrice.mul(position.quantity),
      quoteCurrency,
      rates,
      false,
    );
    const costBasisRub = this.convertToRub(
      position.avg_price.mul(position.quantity),
      quoteCurrency,
      rates,
      false,
    );
    const unrealizedPnlRub = marketValueRub.minus(costBasisRub);
    const unrealizedPnlPercent = costBasisRub.equals(0)
      ? new Prisma.Decimal(0)
      : unrealizedPnlRub.div(costBasisRub).mul(100);

    return {
      ...position,
      demo_instruments: this.enrichInstrument(position.demo_instruments),
      marketPrice,
      marketValueRub,
      costBasisRub,
      unrealizedPnlRub,
      unrealizedPnlPercent,
    };
  }

  private nextMonthlyRun(dayOfMonth: number): Date {
    const now = new Date();
    let next = this.monthlyRunDate(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth);

    if (next <= now) {
      next = this.monthlyRunDate(now.getUTCFullYear(), now.getUTCMonth() + 1, dayOfMonth);
    }

    return next;
  }

  private nextMonthlyRunAfter(dayOfMonth: number, after: Date): Date {
    return this.monthlyRunDate(after.getUTCFullYear(), after.getUTCMonth() + 1, dayOfMonth);
  }

  private monthlyRunDate(year: number, month: number, dayOfMonth: number): Date {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(Math.max(1, dayOfMonth), lastDay);
    return new Date(Date.UTC(year, month, day, 9, 0, 0));
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
