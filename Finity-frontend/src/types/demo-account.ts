export type DemoAccount = {
  id: string
  user_id: string
  name: string
  currency: string
  cash_balance: string
  created_at: string
  updated_at: string
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
  provider: string
  provider_symbol: string
  is_active: boolean
  demo_price_cache: DemoPriceCache | null
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

export type DemoAccountOverview = {
  account: DemoAccount
  transactions: DemoCashTransaction[]
  incomeRules: DemoIncomeRule[]
  instruments: DemoInstrument[]
  positions: DemoPosition[]
  trades: DemoTrade[]
  summary: {
    cashBalance: string
    positionsValue: string
    totalValue: string
    investedValue: string
  }
}
