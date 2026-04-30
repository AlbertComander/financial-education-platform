import { Injectable } from '@nestjs/common';

export type DemoInstrumentSeed = {
  code: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  exchange: string;
  sector?: string;
  providerSymbol: string;
};

export type MarketQuote = {
  providerSymbol: string;
  price: number;
  currency: string;
  changeAbs: number | null;
  changePercent: number | null;
  asOf: Date;
  provider: 'stooq';
  raw: Record<string, string>;
};

export const DEMO_INSTRUMENTS: DemoInstrumentSeed[] = [
  {
    code: 'US:AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
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
    providerSymbol: 'voo.us',
  },
  {
    code: 'US:GLD',
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    assetType: 'etf',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Commodities',
    providerSymbol: 'gld.us',
  },
  {
    code: 'FX:EURUSD',
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetType: 'currency',
    currency: 'USD',
    exchange: 'FX',
    sector: 'Currency',
    providerSymbol: 'eurusd',
  },
  {
    code: 'CRYPTO:BTCUSD',
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    providerSymbol: 'btcusd',
  },
];

@Injectable()
export class MarketDataService {
  async getQuotes(providerSymbols: string[]): Promise<MarketQuote[]> {
    if (providerSymbols.length === 0) return [];

    const url = new URL('https://stooq.com/q/l/');
    url.searchParams.set('s', providerSymbols.join(','));
    url.searchParams.set('f', 'sd2t2ohlcv');
    url.searchParams.set('h', '');
    url.searchParams.set('e', 'csv');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Market data provider failed with ${response.status}`);
    }

    const csv = await response.text();
    return this.parseStooqCsv(csv);
  }

  private parseStooqCsv(csv: string): MarketQuote[] {
    const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
    const headers = headerLine.split(',').map((value) => value.trim());

    return rows
      .map((row) => this.parseCsvRow(headers, row))
      .filter((row) => row.Close && row.Close !== 'N/D')
      .map((row) => {
        const close = Number(row.Close);
        const open = Number(row.Open);
        const asOf = new Date(`${row.Date}T${row.Time || '00:00:00'}Z`);
        const changeAbs = Number.isFinite(open) ? close - open : null;
        const changePercent =
          Number.isFinite(open) && open !== 0 ? ((close - open) / open) * 100 : null;

        return {
          providerSymbol: row.Symbol.toLowerCase(),
          price: close,
          currency: 'USD',
          changeAbs,
          changePercent,
          asOf: Number.isNaN(asOf.getTime()) ? new Date() : asOf,
          provider: 'stooq' as const,
          raw: row,
        };
      });
  }

  private parseCsvRow(headers: string[], row: string): Record<string, string> {
    const values = row.split(',').map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  }
}
