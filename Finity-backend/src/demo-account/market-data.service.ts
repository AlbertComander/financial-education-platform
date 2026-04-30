import { Injectable } from '@nestjs/common';

export type DemoInstrumentSeed = {
  code: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  exchange: string;
  sector?: string;
  provider: 'moex' | 'stooq';
  providerSymbol: string;
  providerMarket?: 'shares' | 'currency';
};

export type QuoteRequest = {
  provider: string;
  provider_symbol: string;
  currency: string;
};

export type MarketQuote = {
  providerSymbol: string;
  price: number;
  currency: string;
  changeAbs: number | null;
  changePercent: number | null;
  asOf: Date;
  provider: 'moex' | 'stooq';
  raw: Record<string, unknown>;
};

export const DEMO_INSTRUMENTS: DemoInstrumentSeed[] = [
  {
    code: 'MOEX:SBER',
    symbol: 'SBER',
    name: 'Сбербанк',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Financials',
    provider: 'moex',
    providerSymbol: 'SBER',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:GAZP',
    symbol: 'GAZP',
    name: 'Газпром',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'GAZP',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:LKOH',
    symbol: 'LKOH',
    name: 'ЛУКОЙЛ',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'LKOH',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:YDEX',
    symbol: 'YDEX',
    name: 'Яндекс',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Technology',
    provider: 'moex',
    providerSymbol: 'YDEX',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:TMOS',
    symbol: 'TMOS',
    name: 'Т-Банк Индекс МосБиржи',
    assetType: 'etf',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Broad market',
    provider: 'moex',
    providerSymbol: 'TMOS',
    providerMarket: 'shares',
  },
  {
    code: 'US:AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'stooq',
    providerSymbol: 'aapl.us',
  },
  {
    code: 'US:MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'stooq',
    providerSymbol: 'msft.us',
  },
  {
    code: 'US:NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'stooq',
    providerSymbol: 'nvda.us',
  },
  {
    code: 'US:VOO',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetType: 'etf',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Broad market',
    provider: 'stooq',
    providerSymbol: 'voo.us',
  },
  {
    code: 'FX:USDRUB',
    symbol: 'USDRUB',
    name: 'US Dollar / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'MOEX FX',
    sector: 'Currency',
    provider: 'moex',
    providerSymbol: 'USD000UTSTOM',
    providerMarket: 'currency',
  },
  {
    code: 'FX:EURRUB',
    symbol: 'EURRUB',
    name: 'Euro / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'MOEX FX',
    sector: 'Currency',
    provider: 'moex',
    providerSymbol: 'EUR_RUB__TOM',
    providerMarket: 'currency',
  },
  {
    code: 'FX:CNYRUB',
    symbol: 'CNYRUB',
    name: 'Chinese Yuan / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'MOEX FX',
    sector: 'Currency',
    provider: 'moex',
    providerSymbol: 'CNYRUB_TOM',
    providerMarket: 'currency',
  },
  {
    code: 'CRYPTO:BTCUSD',
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'stooq',
    providerSymbol: 'btcusd',
  },
];

@Injectable()
export class MarketDataService {
  async getQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    const moex = instruments.filter((instrument) => instrument.provider === 'moex');
    const stooq = instruments.filter((instrument) => instrument.provider === 'stooq');
    const [moexQuotes, stooqQuotes] = await Promise.all([
      this.getMoexQuotes(moex),
      this.getStooqQuotes(stooq),
    ]);

    return [...moexQuotes, ...stooqQuotes];
  }

  private async getMoexQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    const currencySymbols = new Set(['USD000UTSTOM', 'EUR_RUB__TOM', 'CNYRUB_TOM']);
    const shares = instruments.filter((instrument) => !currencySymbols.has(instrument.provider_symbol));
    const currencies = instruments.filter((instrument) => currencySymbols.has(instrument.provider_symbol));
    const [shareQuotes, currencyQuotes] = await Promise.all([
      this.getMoexMarketQuotes(shares, 'stock', 'shares'),
      this.getMoexMarketQuotes(currencies, 'currency', 'selt'),
    ]);

    return [...shareQuotes, ...currencyQuotes];
  }

  private async getMoexMarketQuotes(
    instruments: QuoteRequest[],
    engine: 'stock' | 'currency',
    market: 'shares' | 'selt',
  ): Promise<MarketQuote[]> {
    if (instruments.length === 0) return [];

    const url = new URL(`https://iss.moex.com/iss/engines/${engine}/markets/${market}/securities.json`);
    url.searchParams.set('iss.meta', 'off');
    url.searchParams.set('iss.only', 'marketdata');
    url.searchParams.set('securities', instruments.map((instrument) => instrument.provider_symbol).join(','));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MOEX ISS failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      marketdata?: { columns: string[]; data: unknown[][] };
    };
    const rows = this.tableRows(data.marketdata?.columns ?? [], data.marketdata?.data ?? []);

    return rows
      .map((row) => this.toMoexQuote(row, instruments))
      .filter((quote): quote is MarketQuote => quote !== null);
  }

  private toMoexQuote(row: Record<string, unknown>, instruments: QuoteRequest[]): MarketQuote | null {
    const secid = String(row.SECID ?? '');
    const instrument = instruments.find((item) => item.provider_symbol === secid);
    const price = Number(row.LAST ?? row.MARKETPRICE ?? row.LCURRENTPRICE);
    if (!instrument || !Number.isFinite(price) || price <= 0) return null;

    const changeAbs = Number(row.CHANGE);
    const changePercent = Number(row.LASTCHANGEPRCNT ?? row.CHANGEPRCNT);

    return {
      providerSymbol: secid.toLowerCase(),
      price,
      currency: instrument.currency,
      changeAbs: Number.isFinite(changeAbs) ? changeAbs : null,
      changePercent: Number.isFinite(changePercent) ? changePercent : null,
      asOf: new Date(),
      provider: 'moex',
      raw: row,
    };
  }

  private async getStooqQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    if (instruments.length === 0) return [];

    const url = new URL('https://stooq.com/q/l/');
    url.searchParams.set('s', instruments.map((instrument) => instrument.provider_symbol).join(','));
    url.searchParams.set('f', 'sd2t2ohlcv');
    url.searchParams.set('h', '');
    url.searchParams.set('e', 'csv');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Stooq failed with ${response.status}`);
    }

    const csv = await response.text();
    return this.parseStooqCsv(csv, instruments);
  }

  private parseStooqCsv(csv: string, instruments: QuoteRequest[]): MarketQuote[] {
    const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
    const headers = headerLine.split(',').map((value) => value.trim());

    return rows
      .map((row) => this.parseCsvRow(headers, row))
      .filter((row) => row.Close && row.Close !== 'N/D')
      .map((row) => {
        const symbol = row.Symbol.toLowerCase();
        const instrument = instruments.find((item) => item.provider_symbol.toLowerCase() === symbol);
        const close = Number(row.Close);
        const open = Number(row.Open);
        const asOf = new Date(`${row.Date}T${row.Time || '00:00:00'}Z`);
        const changeAbs = Number.isFinite(open) ? close - open : null;
        const changePercent =
          Number.isFinite(open) && open !== 0 ? ((close - open) / open) * 100 : null;

        return {
          providerSymbol: symbol,
          price: close,
          currency: instrument?.currency ?? 'USD',
          changeAbs,
          changePercent,
          asOf: Number.isNaN(asOf.getTime()) ? new Date() : asOf,
          provider: 'stooq' as const,
          raw: row,
        };
      });
  }

  private tableRows(columns: string[], data: unknown[][]): Record<string, unknown>[] {
    return data.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column, row[index]])),
    );
  }

  private parseCsvRow(headers: string[], row: string): Record<string, string> {
    const values = row.split(',').map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  }
}
