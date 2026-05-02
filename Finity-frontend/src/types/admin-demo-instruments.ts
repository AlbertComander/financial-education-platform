import type {
  DemoInstrument,
  DemoInstrumentDividend,
  DemoInstrumentMetric,
} from '@/types/demo-account'

export type AdminDemoInstrument = DemoInstrument & {
  demo_instrument_metrics: DemoInstrumentMetric[]
  demo_instrument_dividends: DemoInstrumentDividend[]
}

export type AdminDemoInstrumentMetricPayload = {
  section?: string
  label: string
  value: string
  hint?: string
  orderIndex?: number
}

export type AdminDemoInstrumentDividendPayload = {
  recordDate: string
  amount: number
  currency?: string
  yieldPercent?: number
  period?: string
  declaredAt?: string
  orderIndex?: number
}

export type AdminDemoInstrumentPayload = {
  name?: string
  sector?: string
  country?: string
  isin?: string
  websiteUrl?: string
  logoUrl?: string
  description?: string
  metrics?: AdminDemoInstrumentMetricPayload[]
  dividends?: AdminDemoInstrumentDividendPayload[]
}
