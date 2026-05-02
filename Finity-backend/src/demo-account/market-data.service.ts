import { Injectable } from '@nestjs/common';

export type DemoInstrumentSeed = {
  code: string;
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  exchange: string;
  sector?: string;
  provider: 'moex' | 'stooq' | 'yahoo';
  providerSymbol: string;
  providerMarket?: 'shares' | 'currency';
  lotSize?: number;
  faceValue?: number;
  description?: string;
};

export type QuoteRequest = {
  provider: string;
  provider_symbol: string;
  currency: string;
  asset_type?: string;
};

export type MarketQuote = {
  providerSymbol: string;
  price: number;
  currency: string;
  changeAbs: number | null;
  changePercent: number | null;
  asOf: Date;
  provider: 'moex' | 'stooq' | 'yahoo';
  raw: Record<string, unknown>;
};

export type MarketCandle = {
  begin: Date;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number | null;
};

export type MarketProfile = Record<string, string | number | null>;

export type MarketDividend = {
  recordDate: Date;
  amount: number;
  currency: string;
  yieldPercent: number | null;
  period: string | null;
  declaredAt: Date | null;
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
    code: 'MOEX:VTBR',
    symbol: 'VTBR',
    name: 'Банк ВТБ',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Financials',
    provider: 'moex',
    providerSymbol: 'VTBR',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:ROSN',
    symbol: 'ROSN',
    name: 'Роснефть',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'ROSN',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:NVTK',
    symbol: 'NVTK',
    name: 'НОВАТЭК',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'NVTK',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:GMKN',
    symbol: 'GMKN',
    name: 'ГМК Норникель',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Materials',
    provider: 'moex',
    providerSymbol: 'GMKN',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:TATN',
    symbol: 'TATN',
    name: 'Татнефть',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'TATN',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:MGNT',
    symbol: 'MGNT',
    name: 'Магнит',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Consumer Staples',
    provider: 'moex',
    providerSymbol: 'MGNT',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:CHMF',
    symbol: 'CHMF',
    name: 'Северсталь',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Materials',
    provider: 'moex',
    providerSymbol: 'CHMF',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:AFLT',
    symbol: 'AFLT',
    name: 'Аэрофлот',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Industrials',
    provider: 'moex',
    providerSymbol: 'AFLT',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:ALRS',
    symbol: 'ALRS',
    name: 'АЛРОСА',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Materials',
    provider: 'moex',
    providerSymbol: 'ALRS',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:PLZL',
    symbol: 'PLZL',
    name: 'Полюс',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Materials',
    provider: 'moex',
    providerSymbol: 'PLZL',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:IRAO',
    symbol: 'IRAO',
    name: 'Интер РАО',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Utilities',
    provider: 'moex',
    providerSymbol: 'IRAO',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:PIKK',
    symbol: 'PIKK',
    name: 'ПИК',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Real Estate',
    provider: 'moex',
    providerSymbol: 'PIKK',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:OZON',
    symbol: 'OZON',
    name: 'Ozon',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Consumer Discretionary',
    provider: 'moex',
    providerSymbol: 'OZON',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:SNGS',
    symbol: 'SNGS',
    name: 'Сургутнефтегаз',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'SNGS',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:SNGSP',
    symbol: 'SNGSP',
    name: 'Сургутнефтегаз ап',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'SNGSP',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:RUAL',
    symbol: 'RUAL',
    name: 'РУСАЛ',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Materials',
    provider: 'moex',
    providerSymbol: 'RUAL',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:MTSS',
    symbol: 'MTSS',
    name: 'МТС',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Communication Services',
    provider: 'moex',
    providerSymbol: 'MTSS',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:HYDR',
    symbol: 'HYDR',
    name: 'РусГидро',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Utilities',
    provider: 'moex',
    providerSymbol: 'HYDR',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:FEES',
    symbol: 'FEES',
    name: 'ФСК-Россети',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Utilities',
    provider: 'moex',
    providerSymbol: 'FEES',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:POSI',
    symbol: 'POSI',
    name: 'Positive Technologies',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Technology',
    provider: 'moex',
    providerSymbol: 'POSI',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:VKCO',
    symbol: 'VKCO',
    name: 'VK',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Technology',
    provider: 'moex',
    providerSymbol: 'VKCO',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:TRNFP',
    symbol: 'TRNFP',
    name: 'Транснефть ап',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Energy',
    provider: 'moex',
    providerSymbol: 'TRNFP',
    providerMarket: 'shares',
  },
  {
    code: 'MOEX:FIVE',
    symbol: 'X5',
    name: 'X5 Group',
    assetType: 'stock',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Consumer Staples',
    provider: 'moex',
    providerSymbol: 'X5',
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
    provider: 'yahoo',
    providerSymbol: 'AAPL',
  },
  {
    code: 'US:MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'MSFT',
  },
  {
    code: 'US:NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'NVDA',
  },
  {
    code: 'US:GOOGL',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Communication Services',
    provider: 'yahoo',
    providerSymbol: 'GOOGL',
  },
  {
    code: 'US:AMZN',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Discretionary',
    provider: 'yahoo',
    providerSymbol: 'AMZN',
  },
  {
    code: 'US:META',
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Communication Services',
    provider: 'yahoo',
    providerSymbol: 'META',
  },
  {
    code: 'US:TSLA',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Discretionary',
    provider: 'yahoo',
    providerSymbol: 'TSLA',
  },
  {
    code: 'US:JPM',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: 'JPM',
  },
  {
    code: 'US:XOM',
    symbol: 'XOM',
    name: 'Exxon Mobil Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Energy',
    provider: 'yahoo',
    providerSymbol: 'XOM',
  },
  {
    code: 'US:KO',
    symbol: 'KO',
    name: 'Coca-Cola Co.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Consumer Staples',
    provider: 'yahoo',
    providerSymbol: 'KO',
  },
  {
    code: 'US:BAC',
    symbol: 'BAC',
    name: 'Bank of America Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: 'BAC',
  },
  {
    code: 'US:DIS',
    symbol: 'DIS',
    name: 'Walt Disney Co.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Communication Services',
    provider: 'yahoo',
    providerSymbol: 'DIS',
  },
  {
    code: 'US:AMD',
    symbol: 'AMD',
    name: 'Advanced Micro Devices Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'AMD',
  },
  {
    code: 'US:NFLX',
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Communication Services',
    provider: 'yahoo',
    providerSymbol: 'NFLX',
  },
  {
    code: 'US:ORCL',
    symbol: 'ORCL',
    name: 'Oracle Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'ORCL',
  },
  {
    code: 'US:CRM',
    symbol: 'CRM',
    name: 'Salesforce Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'CRM',
  },
  {
    code: 'US:INTC',
    symbol: 'INTC',
    name: 'Intel Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'INTC',
  },
  {
    code: 'US:CSCO',
    symbol: 'CSCO',
    name: 'Cisco Systems Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'CSCO',
  },
  {
    code: 'US:PEP',
    symbol: 'PEP',
    name: 'PepsiCo Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Consumer Staples',
    provider: 'yahoo',
    providerSymbol: 'PEP',
  },
  {
    code: 'US:WMT',
    symbol: 'WMT',
    name: 'Walmart Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Consumer Staples',
    provider: 'yahoo',
    providerSymbol: 'WMT',
  },
  {
    code: 'US:V',
    symbol: 'V',
    name: 'Visa Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: 'V',
  },
  {
    code: 'US:MA',
    symbol: 'MA',
    name: 'Mastercard Inc.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: 'MA',
  },
  {
    code: 'US:PG',
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Consumer Staples',
    provider: 'yahoo',
    providerSymbol: 'PG',
  },
  {
    code: 'US:MCD',
    symbol: 'MCD',
    name: 'McDonald\'s Corp.',
    assetType: 'stock',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'Consumer Discretionary',
    provider: 'yahoo',
    providerSymbol: 'MCD',
  },
  {
    code: 'EU:SAP',
    symbol: 'SAP',
    name: 'SAP SE',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'XETRA',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'SAP.DE',
  },
  {
    code: 'EU:ASML',
    symbol: 'ASML',
    name: 'ASML Holding N.V.',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'Euronext Amsterdam',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'ASML.AS',
  },
  {
    code: 'EU:AIR',
    symbol: 'AIR',
    name: 'Airbus SE',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'Euronext Paris',
    sector: 'Industrials',
    provider: 'yahoo',
    providerSymbol: 'AIR.PA',
  },
  {
    code: 'EU:SIE',
    symbol: 'SIE',
    name: 'Siemens AG',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'XETRA',
    sector: 'Industrials',
    provider: 'yahoo',
    providerSymbol: 'SIE.DE',
  },
  {
    code: 'EU:BMW',
    symbol: 'BMW',
    name: 'BMW AG',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'XETRA',
    sector: 'Consumer Discretionary',
    provider: 'yahoo',
    providerSymbol: 'BMW.DE',
  },
  {
    code: 'EU:DTE',
    symbol: 'DTE',
    name: 'Deutsche Telekom AG',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'XETRA',
    sector: 'Communication Services',
    provider: 'yahoo',
    providerSymbol: 'DTE.DE',
  },
  {
    code: 'EU:MC',
    symbol: 'MC',
    name: 'LVMH',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'Euronext Paris',
    sector: 'Consumer Discretionary',
    provider: 'yahoo',
    providerSymbol: 'MC.PA',
  },
  {
    code: 'EU:TTE',
    symbol: 'TTE',
    name: 'TotalEnergies SE',
    assetType: 'stock',
    currency: 'EUR',
    exchange: 'Euronext Paris',
    sector: 'Energy',
    provider: 'yahoo',
    providerSymbol: 'TTE.PA',
  },
  {
    code: 'CN:600519',
    symbol: '600519',
    name: 'Kweichow Moutai Co.',
    assetType: 'stock',
    currency: 'CNY',
    exchange: 'SSE',
    sector: 'Consumer Staples',
    provider: 'yahoo',
    providerSymbol: '600519.SS',
  },
  {
    code: 'CN:601318',
    symbol: '601318',
    name: 'Ping An Insurance',
    assetType: 'stock',
    currency: 'CNY',
    exchange: 'SSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: '601318.SS',
  },
  {
    code: 'CN:600036',
    symbol: '600036',
    name: 'China Merchants Bank',
    assetType: 'stock',
    currency: 'CNY',
    exchange: 'SSE',
    sector: 'Financials',
    provider: 'yahoo',
    providerSymbol: '600036.SS',
  },
  {
    code: 'US:VOO',
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetType: 'etf',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Broad market',
    provider: 'yahoo',
    providerSymbol: 'VOO',
  },
  {
    code: 'US:SPY',
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    assetType: 'etf',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Broad market',
    provider: 'yahoo',
    providerSymbol: 'SPY',
  },
  {
    code: 'US:QQQ',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    assetType: 'etf',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    provider: 'yahoo',
    providerSymbol: 'QQQ',
  },
  {
    code: 'MOEX:SU26244RMFS2',
    symbol: 'SU26244RMFS2',
    name: 'ОФЗ 26244',
    assetType: 'bond',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Государственные облигации',
    provider: 'moex',
    providerSymbol: 'SU26244RMFS2',
    providerMarket: 'shares',
    lotSize: 1,
    faceValue: 1000,
    description: 'Облигация федерального займа. Цена облигаций на бирже обычно указывается в процентах от номинала, а доходность зависит от купона, срока и рыночной ставки.',
  },
  {
    code: 'MOEX:SU26243RMFS4',
    symbol: 'SU26243RMFS4',
    name: 'ОФЗ 26243',
    assetType: 'bond',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Государственные облигации',
    provider: 'moex',
    providerSymbol: 'SU26243RMFS4',
    providerMarket: 'shares',
    lotSize: 1,
    faceValue: 1000,
    description: 'ОФЗ с фиксированным купоном. В демо-счете ее можно использовать, чтобы сравнивать более спокойные долговые инструменты с акциями.',
  },
  {
    code: 'MOEX:SU26238RMFS4',
    symbol: 'SU26238RMFS4',
    name: 'ОФЗ 26238',
    assetType: 'bond',
    currency: 'RUB',
    exchange: 'MOEX',
    sector: 'Государственные облигации',
    provider: 'moex',
    providerSymbol: 'SU26238RMFS4',
    providerMarket: 'shares',
    lotSize: 1,
    faceValue: 1000,
    description: 'Длинная ОФЗ. Цена чувствительна к изменению ставок, поэтому подходит для демонстрации процентного риска в учебном портфеле.',
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
    code: 'FX:GBPRUB',
    symbol: 'GBPRUB',
    name: 'British Pound / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'Yahoo FX',
    sector: 'Currency',
    provider: 'yahoo',
    providerSymbol: 'GBPRUB=X',
  },
  {
    code: 'FX:CHFRUB',
    symbol: 'CHFRUB',
    name: 'Swiss Franc / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'Yahoo FX',
    sector: 'Currency',
    provider: 'yahoo',
    providerSymbol: 'CHFRUB=X',
  },
  {
    code: 'FX:JPYRUB',
    symbol: 'JPYRUB',
    name: 'Japanese Yen / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'Yahoo FX',
    sector: 'Currency',
    provider: 'yahoo',
    providerSymbol: 'JPYRUB=X',
  },
  {
    code: 'FX:HKDRUB',
    symbol: 'HKDRUB',
    name: 'Hong Kong Dollar / Russian Ruble',
    assetType: 'currency',
    currency: 'RUB',
    exchange: 'Yahoo FX',
    sector: 'Currency',
    provider: 'yahoo',
    providerSymbol: 'HKDRUB=X',
  },
  {
    code: 'CRYPTO:BTCUSD',
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'BTC-USD',
  },
  {
    code: 'CRYPTO:ETHUSD',
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'ETH-USD',
  },
  {
    code: 'CRYPTO:SOLUSD',
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'SOL-USD',
  },
  {
    code: 'CRYPTO:BNBUSD',
    symbol: 'BNBUSD',
    name: 'BNB / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'BNB-USD',
  },
  {
    code: 'CRYPTO:XRPUSD',
    symbol: 'XRPUSD',
    name: 'XRP / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'XRP-USD',
  },
  {
    code: 'CRYPTO:ADAUSD',
    symbol: 'ADAUSD',
    name: 'Cardano / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'ADA-USD',
  },
  {
    code: 'CRYPTO:DOGEUSD',
    symbol: 'DOGEUSD',
    name: 'Dogecoin / US Dollar',
    assetType: 'crypto',
    currency: 'USD',
    exchange: 'Crypto',
    sector: 'Crypto',
    provider: 'yahoo',
    providerSymbol: 'DOGE-USD',
  },
  {
    code: 'US:TLT',
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    assetType: 'bond',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Government bonds',
    provider: 'yahoo',
    providerSymbol: 'TLT',
    lotSize: 1,
  },
  {
    code: 'US:IEF',
    symbol: 'IEF',
    name: 'iShares 7-10 Year Treasury Bond ETF',
    assetType: 'bond',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Government bonds',
    provider: 'yahoo',
    providerSymbol: 'IEF',
    lotSize: 1,
  },
  {
    code: 'US:LQD',
    symbol: 'LQD',
    name: 'iShares Investment Grade Corporate Bond ETF',
    assetType: 'bond',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Corporate bonds',
    provider: 'yahoo',
    providerSymbol: 'LQD',
    lotSize: 1,
  },
  {
    code: 'US:HYG',
    symbol: 'HYG',
    name: 'iShares High Yield Corporate Bond ETF',
    assetType: 'bond',
    currency: 'USD',
    exchange: 'NYSE Arca',
    sector: 'Corporate bonds',
    provider: 'yahoo',
    providerSymbol: 'HYG',
    lotSize: 1,
  },
  {
    code: 'FUT:GC',
    symbol: 'GC',
    name: 'Gold Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'COMEX',
    sector: 'Precious metals',
    provider: 'yahoo',
    providerSymbol: 'GC=F',
  },
  {
    code: 'FUT:SI',
    symbol: 'SI',
    name: 'Silver Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'COMEX',
    sector: 'Precious metals',
    provider: 'yahoo',
    providerSymbol: 'SI=F',
  },
  {
    code: 'FUT:CL',
    symbol: 'CL',
    name: 'WTI Crude Oil Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'NYMEX',
    sector: 'Energy',
    provider: 'yahoo',
    providerSymbol: 'CL=F',
  },
  {
    code: 'FUT:BZ',
    symbol: 'BZ',
    name: 'Brent Crude Oil Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'NYMEX',
    sector: 'Energy',
    provider: 'yahoo',
    providerSymbol: 'BZ=F',
  },
  {
    code: 'FUT:NG',
    symbol: 'NG',
    name: 'Natural Gas Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'NYMEX',
    sector: 'Energy',
    provider: 'yahoo',
    providerSymbol: 'NG=F',
  },
  {
    code: 'FUT:ES',
    symbol: 'ES',
    name: 'E-mini S&P 500 Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'CME',
    sector: 'Index futures',
    provider: 'yahoo',
    providerSymbol: 'ES=F',
  },
  {
    code: 'FUT:NQ',
    symbol: 'NQ',
    name: 'E-mini Nasdaq 100 Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'CME',
    sector: 'Index futures',
    provider: 'yahoo',
    providerSymbol: 'NQ=F',
  },
  {
    code: 'FUT:ZB',
    symbol: 'ZB',
    name: 'U.S. Treasury Bond Futures',
    assetType: 'future',
    currency: 'USD',
    exchange: 'CBOT',
    sector: 'Rates',
    provider: 'yahoo',
    providerSymbol: 'ZB=F',
  },
  {
    code: 'OPT:AAPL260619C00200000',
    symbol: 'AAPL C200 19.06.2026',
    name: 'Apple Call Option 200 Jun 2026',
    assetType: 'option',
    currency: 'USD',
    exchange: 'OPRA',
    sector: 'Options',
    provider: 'yahoo',
    providerSymbol: 'AAPL260619C00200000',
  },
  {
    code: 'OPT:AAPL260619P00180000',
    symbol: 'AAPL P180 19.06.2026',
    name: 'Apple Put Option 180 Jun 2026',
    assetType: 'option',
    currency: 'USD',
    exchange: 'OPRA',
    sector: 'Options',
    provider: 'yahoo',
    providerSymbol: 'AAPL260619P00180000',
  },
  {
    code: 'OPT:SPY260619C00600000',
    symbol: 'SPY C600 19.06.2026',
    name: 'SPY Call Option 600 Jun 2026',
    assetType: 'option',
    currency: 'USD',
    exchange: 'OPRA',
    sector: 'Options',
    provider: 'yahoo',
    providerSymbol: 'SPY260619C00600000',
  },
  {
    code: 'OPT:QQQ260619P00500000',
    symbol: 'QQQ P500 19.06.2026',
    name: 'QQQ Put Option 500 Jun 2026',
    assetType: 'option',
    currency: 'USD',
    exchange: 'OPRA',
    sector: 'Options',
    provider: 'yahoo',
    providerSymbol: 'QQQ260619P00500000',
  },
  {
    code: 'INDEX:SP500',
    symbol: 'S&P 500',
    name: 'S&P 500 Index',
    assetType: 'index',
    currency: 'USD',
    exchange: 'CBOE',
    sector: 'US market',
    provider: 'yahoo',
    providerSymbol: '^GSPC',
  },
  {
    code: 'INDEX:NASDAQ100',
    symbol: 'NASDAQ 100',
    name: 'Nasdaq 100 Index',
    assetType: 'index',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'US technology',
    provider: 'yahoo',
    providerSymbol: '^NDX',
  },
  {
    code: 'INDEX:DOW',
    symbol: 'DOW',
    name: 'Dow Jones Industrial Average',
    assetType: 'index',
    currency: 'USD',
    exchange: 'NYSE',
    sector: 'US blue chips',
    provider: 'yahoo',
    providerSymbol: '^DJI',
  },
  {
    code: 'INDEX:STOXX50',
    symbol: 'STOXX 50',
    name: 'EURO STOXX 50',
    assetType: 'index',
    currency: 'EUR',
    exchange: 'STOXX',
    sector: 'Europe market',
    provider: 'yahoo',
    providerSymbol: '^STOXX50E',
  },
  {
    code: 'INDEX:NIKKEI225',
    symbol: 'NIKKEI 225',
    name: 'Nikkei 225',
    assetType: 'index',
    currency: 'JPY',
    exchange: 'TSE',
    sector: 'Japan market',
    provider: 'yahoo',
    providerSymbol: '^N225',
  },
  {
    code: 'INDEX:HSI',
    symbol: 'HSI',
    name: 'Hang Seng Index',
    assetType: 'index',
    currency: 'HKD',
    exchange: 'HKEX',
    sector: 'Hong Kong market',
    provider: 'yahoo',
    providerSymbol: '^HSI',
  },
];

@Injectable()
export class MarketDataService {
  async getQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    const moex = instruments.filter((instrument) => instrument.provider === 'moex');
    const stooq = instruments.filter((instrument) => instrument.provider === 'stooq');
    const yahoo = instruments.filter((instrument) => instrument.provider === 'yahoo');
    const [moexQuotes, stooqQuotes, yahooQuotes] = await Promise.all([
      this.getMoexQuotes(moex),
      this.getStooqQuotes(stooq),
      this.getYahooQuotes(yahoo),
    ]);

    return [...moexQuotes, ...stooqQuotes, ...yahooQuotes];
  }

  async getCandles(instrument: QuoteRequest, days = 90): Promise<MarketCandle[]> {
    if (instrument.provider === 'moex') {
      return this.getMoexCandles(instrument, days);
    }

    return this.getYahooCandles(this.toYahooSymbol(instrument), days);
  }

  async getProfile(instrument: QuoteRequest): Promise<MarketProfile> {
    if (instrument.provider === 'moex') {
      return this.getMoexProfile(instrument.provider_symbol);
    }

    return this.getYahooProfile(this.toYahooSymbol(instrument));
  }

  async getDividends(instrument: QuoteRequest): Promise<MarketDividend[]> {
    if (instrument.provider === 'moex' && instrument.asset_type === 'stock') {
      return this.getMoexDividends(instrument.provider_symbol);
    }

    if (
      instrument.provider === 'yahoo' &&
      ['stock', 'etf', 'bond'].includes(instrument.asset_type ?? '')
    ) {
      return this.getYahooDividends(this.toYahooSymbol(instrument), instrument.currency);
    }

    return [];
  }

  private async getMoexQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    const currencySymbols = new Set(['USD000UTSTOM', 'EUR_RUB__TOM', 'CNYRUB_TOM']);
    const bonds = instruments.filter((instrument) => instrument.asset_type === 'bond');
    const shares = instruments.filter(
      (instrument) =>
        !currencySymbols.has(instrument.provider_symbol) &&
        instrument.asset_type !== 'bond',
    );
    const currencies = instruments.filter((instrument) => currencySymbols.has(instrument.provider_symbol));
    const [shareQuotes, bondQuotes, currencyQuotes] = await Promise.all([
      this.getMoexMarketQuotes(shares, 'stock', 'shares'),
      this.getMoexMarketQuotesLegacy(bonds, 'stock', 'bonds'),
      this.getMoexMarketQuotes(currencies, 'currency', 'selt'),
    ]);

    return [...shareQuotes, ...bondQuotes, ...currencyQuotes];
  }

  private async getMoexMarketQuotes(
    instruments: QuoteRequest[],
    engine: 'stock' | 'currency',
    market: 'shares' | 'selt' | 'bonds',
  ): Promise<MarketQuote[]> {
    if (instruments.length === 0) return [];

    const board = market === 'shares' ? 'TQBR' : 'CETS';
    const quoteLists = await Promise.all(
      instruments.map(async (instrument) => {
        const url = new URL(
          `https://iss.moex.com/iss/engines/${engine}/markets/${market}/boards/${board}/securities/${instrument.provider_symbol}.json`,
        );
        url.searchParams.set('iss.meta', 'off');
        url.searchParams.set('iss.only', 'securities,marketdata');

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`MOEX ISS failed with ${response.status}`);
        }

        const data = (await response.json()) as {
          securities?: { columns: string[]; data: unknown[][] };
          marketdata?: { columns: string[]; data: unknown[][] };
        };
        const security = this.tableRows(data.securities?.columns ?? [], data.securities?.data ?? [])[0] ?? {};
        const marketdataRow = this.tableRows(data.marketdata?.columns ?? [], data.marketdata?.data ?? [])[0] ?? {};
        const quote = this.toMoexQuote({ ...security, ...marketdataRow }, [instrument]);
        if (quote) return [quote];

        if (market === 'shares') {
          return this.getMoexMarketQuotesLegacy([instrument], engine, market).catch(() => []);
        }

        if (market === 'selt') {
          const fallback = await this.getYahooQuote(instrument).catch(() => null);
          return fallback ? [fallback] : [];
        }

        return [];
      }),
    );

    return quoteLists.flat();
  }

  private async getMoexMarketQuotesLegacy(
    instruments: QuoteRequest[],
    engine: 'stock' | 'currency',
    market: 'shares' | 'selt' | 'bonds',
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
    const price = Number(
      row.LAST ??
        row.MARKETPRICE ??
        row.MARKETPRICETODAY ??
        row.LCURRENTPRICE ??
        row.PREVPRICE,
    );
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

  private async getMoexCandles(instrument: QuoteRequest, days: number): Promise<MarketCandle[]> {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    const currencySymbols = new Set(['USD000UTSTOM', 'EUR_RUB__TOM', 'CNYRUB_TOM']);
    const isCurrency = currencySymbols.has(instrument.provider_symbol);
    const isBond = instrument.asset_type === 'bond';
    const engine = isCurrency ? 'currency' : 'stock';
    const market = isCurrency ? 'selt' : isBond ? 'bonds' : 'shares';
    const board = isCurrency ? 'CETS' : 'TQBR';
    const ranges: Array<{ from: Date; to: Date }> = [];
    let cursor = new Date(from);

    while (cursor < to) {
      const rangeTo = new Date(cursor);
      rangeTo.setDate(rangeTo.getDate() + 365);
      ranges.push({ from: new Date(cursor), to: rangeTo > to ? new Date(to) : rangeTo });
      cursor = new Date(rangeTo);
      cursor.setDate(cursor.getDate() + 1);
    }

    const candleChunks = await Promise.all(
      ranges.map(async (range) => {
        const candlePath = isBond
          ? `https://iss.moex.com/iss/engines/${engine}/markets/${market}/securities/${instrument.provider_symbol}/candles.json`
          : `https://iss.moex.com/iss/engines/${engine}/markets/${market}/boards/${board}/securities/${instrument.provider_symbol}/candles.json`;
        const url = new URL(candlePath);
        url.searchParams.set('iss.meta', 'off');
        url.searchParams.set('interval', days <= 31 ? '60' : '24');
        url.searchParams.set('from', this.formatDateParam(range.from));
        url.searchParams.set('till', this.formatDateParam(range.to));

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`MOEX candles failed with ${response.status}`);
        }

        const data = (await response.json()) as {
          candles?: { columns: string[]; data: unknown[][] };
        };

        return this.tableRows(data.candles?.columns ?? [], data.candles?.data ?? [])
          .map((row) => this.toCandle(row))
          .filter((candle): candle is MarketCandle => candle !== null);
      }),
    );
    const unique = new Map<string, MarketCandle>();
    for (const candle of candleChunks.flat()) {
      unique.set(candle.begin.toISOString(), candle);
    }
    const candles = [...unique.values()].sort(
      (a, b) => a.begin.getTime() - b.begin.getTime(),
    );

    if (candles.length === 0 && isCurrency) {
      return this.getYahooCandles(this.toYahooSymbol(instrument), days);
    }

    return candles;
  }

  private async getStooqCandles(instrument: QuoteRequest, days: number): Promise<MarketCandle[]> {
    const url = new URL('https://stooq.com/q/d/l/');
    url.searchParams.set('s', instrument.provider_symbol);
    url.searchParams.set('i', 'd');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Stooq history failed with ${response.status}`);
    }

    const csv = await response.text();
    const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
    const headers = headerLine.split(',').map((value) => value.trim());

    return rows
      .slice(-days)
      .map((row) => this.parseCsvRow(headers, row))
      .map((row) =>
        this.toCandle({
          begin: row.Date,
          open: row.Open,
          close: row.Close,
          high: row.High,
          low: row.Low,
          volume: row.Volume,
        }),
      )
      .filter((candle): candle is MarketCandle => candle !== null);
  }

  private async getYahooCandles(symbol: string, days: number): Promise<MarketCandle[]> {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('range', this.daysToYahooRange(days));
    url.searchParams.set('interval', days <= 31 ? '1h' : '1d');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) {
      throw new Error(`Yahoo chart failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              close?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              volume?: Array<number | null>;
            }>;
          };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];
    if (!quote) return [];

    return timestamps
      .map((timestamp, index) =>
        this.toCandle({
          begin: new Date(timestamp * 1000).toISOString(),
          open: quote.open?.[index],
          close: quote.close?.[index],
          high: quote.high?.[index],
          low: quote.low?.[index],
          volume: quote.volume?.[index],
        }),
      )
      .filter((candle): candle is MarketCandle => candle !== null);
  }

  private async getYahooQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    if (instruments.length === 0) return [];

    const quotes = await Promise.all(
      instruments.map((instrument) => this.getYahooQuote(instrument).catch(() => null)),
    );

    return quotes.filter((quote): quote is MarketQuote => quote !== null);
  }

  private async getYahooQuote(instrument: QuoteRequest): Promise<MarketQuote | null> {
    const symbol = this.toYahooSymbol(instrument);
    const quote = await this.fetchYahooChartQuote(symbol);

    if (quote) {
      return this.toYahooMarketQuote(instrument, quote);
    }

    if (symbol === 'HKDRUB=X') {
      return this.getYahooHkdRubCrossQuote(instrument, symbol);
    }

    return null;
  }

  private async fetchYahooChartQuote(symbol: string): Promise<{
    symbol: string;
    price: number;
    previousClose: number | null;
    currency: string;
    asOf: Date;
    meta: Record<string, unknown>;
  } | null> {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('range', '5d');
    url.searchParams.set('interval', '1d');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: Record<string, unknown>;
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const meta = result?.meta ?? {};
    const closes =
      result?.indicators?.quote?.[0]?.close?.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value),
      ) ?? [];
    const price = Number(meta.regularMarketPrice ?? closes.at(-1));
    if (!Number.isFinite(price) || price <= 0) return null;

    const previousClose = Number(meta.previousClose ?? closes.at(-2));
    const marketTime = Number(meta.regularMarketTime);

    return {
      symbol,
      price,
      previousClose: Number.isFinite(previousClose) && previousClose > 0 ? previousClose : null,
      currency: String(meta.currency ?? ''),
      asOf: Number.isFinite(marketTime) ? new Date(marketTime * 1000) : new Date(),
      meta,
    };
  }

  private toYahooMarketQuote(
    instrument: QuoteRequest,
    quote: {
      symbol: string;
      price: number;
      previousClose: number | null;
      currency: string;
      asOf: Date;
      meta: Record<string, unknown>;
    },
  ): MarketQuote {
    const changeAbs = quote.previousClose === null ? null : quote.price - quote.previousClose;
    const changePercent =
      changeAbs !== null && quote.previousClose !== null && quote.previousClose !== 0
        ? (changeAbs / quote.previousClose) * 100
        : null;

    return {
      providerSymbol: instrument.provider_symbol.toLowerCase(),
      price: quote.price,
      currency: quote.currency || instrument.currency,
      changeAbs,
      changePercent,
      asOf: quote.asOf,
      provider: 'yahoo',
      raw: { symbol: quote.symbol, meta: quote.meta },
    };
  }

  private async getYahooHkdRubCrossQuote(
    instrument: QuoteRequest,
    symbol: string,
  ): Promise<MarketQuote | null> {
    const [usdRub, usdHkd] = await Promise.all([
      this.fetchYahooChartQuote('USDRUB=X'),
      this.fetchFirstYahooChartQuote(['HKD=X', 'USDHKD=X']),
    ]);

    if (!usdRub || !usdHkd || usdHkd.price <= 0) return null;

    const price = usdRub.price / usdHkd.price;
    const previousClose =
      usdRub.previousClose !== null && usdHkd.previousClose !== null && usdHkd.previousClose > 0
        ? usdRub.previousClose / usdHkd.previousClose
        : null;
    const changeAbs = previousClose === null ? null : price - previousClose;
    const changePercent =
      changeAbs !== null && previousClose !== null && previousClose !== 0
        ? (changeAbs / previousClose) * 100
        : null;

    return {
      providerSymbol: instrument.provider_symbol.toLowerCase(),
      price,
      currency: 'RUB',
      changeAbs,
      changePercent,
      asOf: new Date(Math.max(usdRub.asOf.getTime(), usdHkd.asOf.getTime())),
      provider: 'yahoo',
      raw: {
        symbol,
        derivedFrom: ['USDRUB=X', usdHkd.symbol],
        usdRub: usdRub.meta,
        usdHkd: usdHkd.meta,
      },
    };
  }

  private async fetchFirstYahooChartQuote(symbols: string[]) {
    for (const symbol of symbols) {
      const quote = await this.fetchYahooChartQuote(symbol);
      if (quote) return quote;
    }

    return null;
  }

  private async getMoexProfile(providerSymbol: string): Promise<MarketProfile> {
    const url = new URL(`https://iss.moex.com/iss/securities/${providerSymbol}.json`);
    url.searchParams.set('iss.meta', 'off');
    url.searchParams.set('iss.only', 'description');

    const response = await fetch(url);
    if (!response.ok) return {};

    const data = (await response.json()) as {
      description?: { columns: string[]; data: unknown[][] };
    };
    const rows = this.tableRows(data.description?.columns ?? [], data.description?.data ?? []);
    return Object.fromEntries(
      rows
        .filter((row) => row.title && row.value !== null && row.value !== undefined && row.value !== '')
        .map((row) => [String(row.title), this.profileValue(row.value)]),
    );
  }

  private async getYahooProfile(symbol: string): Promise<MarketProfile> {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('range', '1d');
    url.searchParams.set('interval', '1d');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return {};

    const data = (await response.json()) as {
      chart?: { result?: Array<{ meta?: Record<string, unknown> }> };
    };
    const meta = data.chart?.result?.[0]?.meta ?? {};
    const quoteFacts = await this.getYahooQuoteFacts(symbol).catch(() => ({}));
    const facts = { ...meta, ...quoteFacts };
    const titles: Record<string, string> = {
      symbol: 'Тикер',
      currency: 'Валюта',
      fullExchangeName: 'Биржа',
      instrumentType: 'Тип инструмента',
      regularMarketPrice: 'Последняя цена',
      regularMarketOpen: 'Цена открытия',
      fiftyTwoWeekHigh: '52-недельный максимум',
      fiftyTwoWeekLow: '52-недельный минимум',
      regularMarketDayHigh: 'Максимум дня',
      regularMarketDayLow: 'Минимум дня',
      regularMarketVolume: 'Объем дня',
      marketCap: 'Market Cap',
      trailingPE: 'P/E',
      priceToSalesTrailing12Months: 'P/S',
      earningsGrowth: 'Рост EPS',
      revenueGrowth: 'Рост выручки',
      returnOnEquity: 'ROE',
      returnOnAssets: 'ROA',
      payoutRatio: 'Payout Ratio',
      trailingAnnualDividendYield: 'Дивидендная доходность',
      timezone: 'Часовой пояс',
    };

    return Object.fromEntries(
      Object.entries(titles)
        .filter(([key]) => facts[key] !== null && facts[key] !== undefined && facts[key] !== '')
        .map(([key, title]) => [title, this.profileValue(facts[key])]),
    );
  }

  private async getYahooQuoteFacts(symbol: string): Promise<Record<string, unknown>> {
    const url = new URL('https://query1.finance.yahoo.com/v7/finance/quote');
    url.searchParams.set('symbols', symbol);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return {};

    const data = (await response.json()) as {
      quoteResponse?: { result?: Array<Record<string, unknown>> };
    };

    return data.quoteResponse?.result?.[0] ?? {};
  }

  private async getMoexDividends(providerSymbol: string): Promise<MarketDividend[]> {
    const url = new URL(`https://iss.moex.com/iss/securities/${providerSymbol}/dividends.json`);
    url.searchParams.set('iss.meta', 'off');

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = (await response.json()) as {
      dividends?: { columns: string[]; data: unknown[][] };
    };
    const rows = this.tableRows(data.dividends?.columns ?? [], data.dividends?.data ?? []);

    return rows
      .map((row) => {
        const recordDate = this.parseMarketDate(
          row.registryclosedate ?? row.recorddate ?? row.date,
        );
        const amount = this.numberFrom(
          row.value ?? row.dividend ?? row.dividendvalue ?? row.amount,
        );

        if (!recordDate || amount === null) return null;

        return {
          recordDate,
          amount,
          currency: String(row.currencyid ?? row.currency ?? 'RUB'),
          yieldPercent: this.numberFrom(row.yieldvalue ?? row.yield ?? row.yield_percent),
          period:
            row.period === null || row.period === undefined || row.period === ''
              ? null
              : String(row.period),
          declaredAt: this.parseMarketDate(row.declaredate ?? row.declared_at),
        };
      })
      .filter((dividend): dividend is MarketDividend => dividend !== null)
      .sort((left, right) => right.recordDate.getTime() - left.recordDate.getTime());
  }

  private async getYahooDividends(symbol: string, currency: string): Promise<MarketDividend[]> {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('range', '10y');
    url.searchParams.set('interval', '1mo');
    url.searchParams.set('events', 'div');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          events?: {
            dividends?: Record<string, { amount?: number; date?: number }>;
          };
        }>;
      };
    };
    const dividends = data.chart?.result?.[0]?.events?.dividends ?? {};

    return Object.values(dividends)
      .map((event): MarketDividend | null => {
        const amount = this.numberFrom(event.amount);
        const date = this.numberFrom(event.date);
        if (amount === null || date === null) return null;

        return {
          recordDate: new Date(date * 1000),
          amount,
          currency,
          yieldPercent: null,
          period: null,
          declaredAt: null,
        };
      })
      .filter((dividend): dividend is MarketDividend => dividend !== null)
      .sort((left, right) => right.recordDate.getTime() - left.recordDate.getTime());
  }

  private toYahooSymbol(instrument: QuoteRequest): string {
    const providerSymbol = instrument.provider_symbol.trim();
    const lowerSymbol = providerSymbol.toLowerCase();

    if (lowerSymbol === 'btcusd') return 'BTC-USD';
    if (lowerSymbol === 'ethusd') return 'ETH-USD';
    if (providerSymbol === 'USD000UTSTOM') return 'USDRUB=X';
    if (providerSymbol === 'EUR_RUB__TOM') return 'EURRUB=X';
    if (providerSymbol === 'CNYRUB_TOM') return 'CNYRUB=X';
    if (lowerSymbol.endsWith('.us')) return providerSymbol.slice(0, -3).toUpperCase();

    return providerSymbol.toUpperCase();
  }

  private daysToYahooRange(days: number): string {
    if (days <= 31) return '1mo';
    if (days <= 93) return '3mo';
    if (days <= 186) return '6mo';
    if (days <= 366) return '1y';
    return '3y';
  }

  private profileValue(value: unknown): string | number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined) return null;
    return String(value);
  }

  private numberFrom(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.').trim());
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private parseMarketDate(value: unknown): Date | null {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toCandle(row: Record<string, unknown>): MarketCandle | null {
    const open = Number(row.open ?? row.OPEN);
    const close = Number(row.close ?? row.CLOSE);
    const high = Number(row.high ?? row.HIGH);
    const low = Number(row.low ?? row.LOW);
    const volume = Number(row.volume ?? row.VOLUME);
    const begin = new Date(String(row.begin ?? row.BEGIN));

    if (![open, close, high, low].every(Number.isFinite) || Number.isNaN(begin.getTime())) {
      return null;
    }

    return {
      begin,
      open,
      close,
      high,
      low,
      volume: Number.isFinite(volume) ? volume : null,
    };
  }

  private async getStooqQuotes(instruments: QuoteRequest[]): Promise<MarketQuote[]> {
    if (instruments.length === 0) return [];

    const quotes = await Promise.all(
      instruments.map(async (instrument) => {
        const url = new URL('https://stooq.com/q/l/');
        url.searchParams.set('s', instrument.provider_symbol);
        url.searchParams.set('f', 'sd2t2ohlcv');
        url.searchParams.set('h', '');
        url.searchParams.set('e', 'csv');

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Stooq failed with ${response.status}`);
        }

        const csv = await response.text();
        return this.parseStooqCsv(csv, [instrument]);
      }),
    );

    return quotes.flat();
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

  private formatDateParam(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
