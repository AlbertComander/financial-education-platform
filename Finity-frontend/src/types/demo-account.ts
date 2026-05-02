export type DemoAccount = {
  id: string
  user_id: string
  name: string
  currency: string
  cash_balance: string
  created_at: string
  updated_at: string
}

export type DemoAccountListItem = DemoAccount & {
  summary: {
    cashValueRub: string
    positionsValue: string
    totalValue: string
    investedValue: string
    pnlRub: string
    pnlPercent: string
    dayChangeRub: string
    dayChangePercent: string
  }
}

export type DemoCashTransaction = {
  id: string
  account_id: string
  kind: string
  amount: string
  currency: string
  description: string | null
  effective_at: string
  created_at: string
}

export type DemoCashBalance = {
  account_id: string
  currency: string
  amount: string
  updated_at: string
}

export type DemoIncomeRule = {
  id: string
  account_id: string
  title: string
  amount: string
  currency: string
  day_of_month: number
  is_active: boolean
  next_run_at: string | null
  created_at: string
  updated_at: string
}

export type DemoPriceCache = {
  instrument_id: string
  price: string
  currency: string
  change_abs: string | null
  change_percent: string | null
  as_of: string
  provider: string
  raw_json?: Record<string, unknown>
  updated_at: string
}

export type DemoInstrument = {
  id: string
  code: string
  symbol: string
  name: string
  asset_type: string
  currency: string
  exchange: string | null
  sector: string | null
  country?: string | null
  isin?: string | null
  website_url?: string | null
  logo_url?: string | null
  provider: string
  provider_symbol: string
  is_active: boolean
  lotSize?: number
  faceValue?: number | null
  description?: string
  isFavorite?: boolean
  demo_price_cache: DemoPriceCache | null
}

export type DemoInstrumentMetric = {
  id: string
  instrument_id: string
  section: string
  label: string
  value: string
  hint: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export type DemoInstrumentDividend = {
  id: string
  instrument_id: string
  record_date: string
  amount: string
  currency: string
  yield_percent: string | null
  period: string | null
  declared_at: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export type DemoPosition = {
  account_id: string
  instrument_id: string
  quantity: string
  avg_price: string
  created_at: string
  updated_at: string
  demo_instruments: DemoInstrument
  marketPrice: string
  marketValueRub: string
  costBasisRub: string
  unrealizedPnlRub: string
  unrealizedPnlPercent: string
}

export type DemoTrade = {
  id: string
  account_id: string
  instrument_id: string
  side: 'buy' | 'sell'
  quantity: string
  price: string
  currency: string
  commission: string
  executed_at: string
  created_at: string
  demo_instruments: DemoInstrument
}

export type DemoPortfolioSnapshot = {
  id: string
  account_id: string
  cash_value: string
  positions_value: string
  total_value: string
  invested_value: string
  snapshot_at: string
}

export type DemoCandle = {
  begin: string
  open: number
  close: number
  high: number
  low: number
  volume: number | null
}

export type DemoInstrumentDetails = {
  instrument: DemoInstrument
  candles: DemoCandle[]
  stats: {
    periodChangePercent: number | null
    high: number | null
    low: number | null
  }
  providerFacts: Record<string, string | number | null>
  keyMetrics: DemoInstrumentMetric[]
  dividends: DemoInstrumentDividend[]
  events: DemoTrade[]
}

export type DemoAccountOverview = {
  accounts: DemoAccountListItem[]
  account: DemoAccount
  cashBalances: DemoCashBalance[]
  transactions: DemoCashTransaction[]
  incomeRules: DemoIncomeRule[]
  instruments: DemoInstrument[]
  positions: DemoPosition[]
  allPositions: DemoPosition[]
  trades: DemoTrade[]
  snapshots: DemoPortfolioSnapshot[]
  summary: {
    cashBalance: string
    cashValueRub: string
    positionsValue: string
    totalValue: string
    investedValue: string
  }
}
