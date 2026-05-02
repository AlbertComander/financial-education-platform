<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DollarSign, Euro, Pencil, RussianRuble, Search, Star } from 'lucide-vue-next'
import { API_BASE_URL } from '@/api/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { demoInstrumentMetricDefinitions } from '@/lib/demo-instrument-metrics'
import { useDemoAccountStore } from '@/stores/demo-account'
import type {
  DemoInstrument,
  DemoInstrumentDetails,
  DemoInstrumentDividend,
  DemoInstrumentMetric,
  DemoPosition,
  DemoTrade,
} from '@/types/demo-account'

type DisplayCurrency = 'RUB' | 'USD' | 'EUR'
type AccountTab = 'overview' | 'catalog' | 'analytics' | 'events'
type CatalogKind = 'all' | 'stock' | 'currency' | 'etf' | 'crypto' | 'bond' | 'future' | 'option' | 'strategy' | 'favorite'
type ChartMode = 'line' | 'candles'
type ChartPeriod = '1m' | '3m' | '6m' | '1y' | '3y'
type InstrumentSection = 'chart' | 'order' | 'metrics' | 'dividends' | 'events' | 'about' | 'data'
type PerformancePeriod = 'today' | 'all'
type PortfolioChartRange = 'year' | 'month' | 'week' | 'day'
type OrderType = 'market' | 'limit'
type DemoEvent = {
  id: string
  title: string
  subtitle: string
  date: string
  amount: number
  currency: string
  kind: 'trade' | 'cash'
  instrument: DemoInstrument | null
}

const store = useDemoAccountStore()
const route = useRoute()
const router = useRouter()
const activeTab = ref<AccountTab>(tabFromRoute(route.query.tab))
const displayCurrency = ref<DisplayCurrency>('RUB')
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const isSearchFocused = ref(false)
const catalogKind = ref<CatalogKind>('stock')
const filterCurrency = ref('all')
const filterExchange = ref('all')
const filterCountry = ref('all')
const depositAmount = ref(100000)
const salaryAmount = ref(150000)
const salaryDay = ref(5)
const salaryDate = ref(new Date().toISOString().slice(0, 10))
const openedAction = ref<'deposit' | 'income' | null>(null)
const isAccountEditorOpen = ref(false)
const performancePeriod = ref<PerformancePeriod>('today')
const portfolioChartRange = ref<PortfolioChartRange>('year')
const selectedAccountId = ref<string | null>(null)
const accountDraft = reactive({ name: '', cashRub: 0 })
const newAccountDraft = reactive({ name: 'Демо-счет', initialCash: 0 })
const accountCashDrafts = reactive<Record<string, number>>({})
const positionDrafts = reactive<Record<string, { quantity: number; avgPrice: number }>>({})
const positionRemovalDrafts = reactive<Record<string, number>>({})
const buyQuantities = reactive<Record<string, number>>({})
const sellQuantities = reactive<Record<string, number>>({})
const limitPrices = reactive<Record<string, number>>({})
const orderType = ref<OrderType>('market')
const isNewAccountEditorOpen = ref(false)
const catalogPage = ref(1)
const catalogPageSize = ref(12)
const eventsPage = ref(1)
const eventsPageSize = 10
const instrumentEventsPage = ref(1)
const instrumentEventsPageSize = 8
const selectedCatalogInstrumentId = ref<string | null>(null)
const selectedInstrumentFallback = ref<DemoInstrumentDetails | null>(null)
const chartMode = ref<ChartMode>('candles')
const chartPeriod = ref<ChartPeriod>('6m')
const hoveredCandleIndex = ref<number | null>(null)
const hoveredPortfolioBarIndex = ref<number | null>(null)
const hoveredAllocationIndex = ref<number | null>(null)
const orderSide = ref<'buy' | 'sell'>('buy')
const activeInstrumentSection = ref<InstrumentSection>('chart')
const orderNotice = ref<{ tone: 'success' | 'error'; text: string } | null>(null)
let quoteRefreshTimer: ReturnType<typeof window.setInterval> | null = null
let searchDebounceTimer: ReturnType<typeof window.setTimeout> | null = null

const currencies = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'CHF', 'JPY', 'HKD']
const currencyIconUrls: Record<string, string> = {
  RUB: new URL('../../../assets/currency-icons/RUBx160.png', import.meta.url).href,
  USD: new URL('../../../assets/currency-icons/USD1x160.png', import.meta.url).href,
  EUR: new URL('../../../assets/currency-icons/EURx160.png', import.meta.url).href,
  CNY: new URL('../../../assets/currency-icons/Yuanx160.png', import.meta.url).href,
  GBP: new URL('../../../assets/currency-icons/GBP1x160.png', import.meta.url).href,
  CHF: new URL('../../../assets/currency-icons/CHF1x160.png', import.meta.url).href,
  JPY: new URL('../../../assets/currency-icons/Yenax160.png', import.meta.url).href,
  HKD: new URL('../../../assets/currency-icons/HKD1x160.png', import.meta.url).href,
}
const portfolioChartRanges: Array<{ id: PortfolioChartRange; label: string }> = [
  { id: 'year', label: 'Месяцы' },
  { id: 'month', label: 'Недели' },
  { id: 'week', label: 'Дни' },
  { id: 'day', label: 'Часы' },
]
const tabs: Array<{ id: AccountTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'events', label: 'События' },
]
const accountScopedTabs = new Set<AccountTab>(['catalog', 'events'])
const chartPeriods: Array<{ id: ChartPeriod; label: string }> = [
  { id: '1m', label: '1М' },
  { id: '3m', label: '3М' },
  { id: '6m', label: '6М' },
  { id: '1y', label: '1Г' },
  { id: '3y', label: '3Г' },
]
const instrumentSections: Array<{ id: InstrumentSection; label: string }> = [
  { id: 'chart', label: 'График' },
  { id: 'order', label: 'Заявка' },
  { id: 'metrics', label: 'Показатели' },
  { id: 'dividends', label: 'Дивиденды' },
  { id: 'events', label: 'События' },
  { id: 'about', label: 'О инструменте' },
  { id: 'data', label: 'Данные' },
]
const brokerCommissionRate = 0.003
const allocationColors = [
  'hsl(211 88% 52%)',
  'hsl(151 70% 38%)',
  'hsl(42 94% 52%)',
  'hsl(263 72% 58%)',
  'hsl(188 72% 42%)',
  'hsl(0 76% 58%)',
  'hsl(224 16% 44%)',
]
const catalogKinds: Array<{ id: CatalogKind; label: string }> = [
  { id: 'all', label: 'Что купить' },
  { id: 'stock', label: 'Акции' },
  { id: 'currency', label: 'Валюта' },
  { id: 'etf', label: 'Фонды' },
  { id: 'crypto', label: 'Крипто' },
  { id: 'bond', label: 'Облигации' },
  { id: 'future', label: 'Фьючерсы' },
  { id: 'option', label: 'Опционы' },
  { id: 'strategy', label: 'Стратегии' },
  { id: 'favorite', label: 'Избранное' },
]

const portfolioTotalRub = computed(() => toFiniteNumber(store.summary?.totalValue, 0))
const cashValueRub = computed(() => toFiniteNumber(store.summary?.cashValueRub ?? store.summary?.cashBalance, 0))
const positionsValueRub = computed(() => toFiniteNumber(store.summary?.positionsValue, 0))
const investedValueRub = computed(() => toFiniteNumber(store.summary?.investedValue, 0))
const demoAccounts = computed(() =>
  store.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    totalRub: toFiniteNumber(account.summary.totalValue),
    cashRub: toFiniteNumber(account.summary.cashValueRub),
    positionsRub: toFiniteNumber(account.summary.positionsValue),
    investedRub: toFiniteNumber(account.summary.investedValue),
    pnlRub: toFiniteNumber(account.summary.pnlRub),
    pnlPercent: toFiniteNumber(account.summary.pnlPercent),
    dayRub: toFiniteNumber(account.summary.dayChangeRub),
    dayPercent: toFiniteNumber(account.summary.dayChangePercent),
  })),
)
const selectedDemoAccount = computed(() => demoAccounts.value.find((account) => account.id === selectedAccountId.value) ?? null)
const isAccountSelected = computed(() => Boolean(selectedDemoAccount.value))
const workspaceAccount = computed(() => selectedDemoAccount.value ?? demoAccounts.value.find((account) => account.id === store.account?.id) ?? null)
const accountsTotalRub = computed(() => demoAccounts.value.reduce((sum, account) => sum + account.totalRub, 0))
const accountsDayRub = computed(() => demoAccounts.value.reduce((sum, account) => sum + account.dayRub, 0))
const accountsPnlRub = computed(() => demoAccounts.value.reduce((sum, account) => sum + account.pnlRub, 0))
const accountsInvestedRub = computed(() => demoAccounts.value.reduce((sum, account) => sum + account.investedRub, 0))
const currentPortfolioChartValue = computed(() => (isAccountSelected.value ? portfolioTotalRub.value : accountsTotalRub.value))
const portfolioPnlRub = computed(() => positionsValueRub.value - investedValueRub.value)
const portfolioPnlPercent = computed(() =>
  investedValueRub.value > 0 ? (portfolioPnlRub.value / investedValueRub.value) * 100 : 0,
)
const performanceChangeRub = computed(() => portfolioPnlRub.value)
const performanceChangePercent = computed(() => portfolioPnlPercent.value)
const pricedInstruments = computed(() => store.instruments.filter((instrument) => instrument.demo_price_cache))
const displayRate = computed(() => {
  if (displayCurrency.value === 'USD') return findRate('USDRUB')
  if (displayCurrency.value === 'EUR') return findRate('EURRUB')
  return 1
})
const nextDisplayCurrency = computed<DisplayCurrency>(() => {
  if (displayCurrency.value === 'RUB') return 'USD'
  if (displayCurrency.value === 'USD') return 'EUR'
  return 'RUB'
})
const nextCurrencyIcon = computed(() => {
  if (nextDisplayCurrency.value === 'USD') return DollarSign
  if (nextDisplayCurrency.value === 'EUR') return Euro
  return RussianRuble
})
const shownPortfolioTotal = computed(() => {
  if (displayCurrency.value === 'RUB') return portfolioTotalRub.value
  return displayRate.value ? portfolioTotalRub.value / displayRate.value : 0
})
const shownAccountsTotal = computed(() => {
  if (displayCurrency.value === 'RUB') return accountsTotalRub.value
  return displayRate.value ? accountsTotalRub.value / displayRate.value : 0
})
const exchanges = computed(() => [...new Set(store.instruments.map((item) => item.exchange).filter(Boolean))] as string[])
const catalogInstruments = computed(() => {
  return store.instruments.filter((instrument) => {
    if (instrument.asset_type === 'index') return false

    const matchesKind =
      catalogKind.value === 'all' ||
      (catalogKind.value === 'favorite' && instrument.isFavorite) ||
      instrument.asset_type === catalogKind.value
    const matchesCurrency = filterCurrency.value === 'all' || instrument.currency === filterCurrency.value
    const matchesExchange = filterExchange.value === 'all' || instrument.exchange === filterExchange.value
    const country = instrumentCountryCode(instrument)
    const matchesCountry = filterCountry.value === 'all' || country === filterCountry.value

    return matchesKind && matchesCurrency && matchesExchange && matchesCountry
  })
})
const searchResults = computed(() => {
  const query = debouncedSearchQuery.value.trim().toLocaleLowerCase('ru-RU')
  if (query.length < 2) return []

  return store.instruments
    .filter((instrument) => instrument.asset_type !== 'index')
    .filter((instrument) =>
      [instrument.name, instrument.symbol, instrument.code, instrument.isin]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('ru-RU').includes(query)),
    )
    .slice(0, 12)
})
const searchResultGroups = computed(() => {
  const labels: Record<string, string> = {
    stock: 'Акции',
    etf: 'Фонды',
    currency: 'Валюты',
    crypto: 'Крипто',
    bond: 'Облигации',
    future: 'Фьючерсы',
    option: 'Опционы',
    strategy: 'Стратегии',
  }
  const groups = new Map<string, DemoInstrument[]>()

  for (const instrument of searchResults.value) {
    const label = labels[instrument.asset_type] ?? 'Инструменты'
    groups.set(label, [...(groups.get(label) ?? []), instrument])
  }

  return [...groups.entries()].map(([label, instruments]) => ({ label, instruments }))
})
const shouldShowSearchResults = computed(() =>
  isSearchFocused.value && debouncedSearchQuery.value.trim().length >= 2,
)
const catalogTotalPages = computed(() => Math.max(1, Math.ceil(catalogInstruments.value.length / catalogPageSize.value)))
const paginatedCatalogInstruments = computed(() => {
  const start = (catalogPage.value - 1) * catalogPageSize.value
  return catalogInstruments.value.slice(start, start + catalogPageSize.value)
})
const accountCurrencies = computed(() =>
  store.cashBalances
    .filter((balance) => toFiniteNumber(balance.amount) > 0)
    .map((balance) => balance.currency),
)
const marketIndexInstruments = computed(() =>
  pricedInstruments.value
    .filter((instrument) => instrument.asset_type === 'index')
    .slice(0, 8),
)
const worldAssetInstruments = computed(() =>
  pricedInstruments.value
    .filter((instrument) =>
      ['crypto', 'future'].includes(instrument.asset_type) ||
      ['COMEX', 'NYMEX', 'CME', 'CBOT', 'Crypto'].includes(instrument.exchange ?? ''),
    )
    .slice(0, 8),
)
const overviewMarketInstruments = computed(() =>
  [...marketIndexInstruments.value, ...worldAssetInstruments.value]
    .filter((instrument, index, items) => items.findIndex((item) => item.id === instrument.id) === index)
    .slice(0, 8),
)
const currencyBalanceRows = computed(() =>
  accountCurrencies.value.map((currency) => {
    const instrument = store.instruments.find(
      (item) => item.asset_type === 'currency' && currencyFromPair(item.symbol) === currency,
    )
    const rate = currency === 'RUB' ? 1 : findRate(`${currency}RUB`)
    const amount = cashAmount(currency)

    return {
      currency,
      amount,
      rate,
      instrument,
      rubValue: currency === 'RUB' ? amount : rate ? amount * rate : 0,
      title: currency === 'RUB' ? 'Российский рубль' : instrument?.name ?? currency,
      symbol: currency === 'RUB' ? 'RUB' : instrument?.symbol ?? `${currency}RUB`,
    }
  }),
)
const portfolioSeries = computed(() => {
  const snapshots = (isAccountSelected.value ? store.overview?.snapshots ?? [] : [])
    .map((snapshot) => ({
      date: snapshot.snapshot_at,
      value: toFiniteNumber(snapshot.total_value, Number.NaN),
    }))
    .filter((point) => Number.isFinite(point.value))

  return buildPortfolioSeries(snapshots, portfolioChartRange.value)
})
const portfolioBars = computed(() => {
  const values = portfolioSeries.value.map((point) => point.value)
  const min = Math.min(...values, currentPortfolioChartValue.value)
  const max = Math.max(...values, currentPortfolioChartValue.value)
  const range = max - min || Math.max(max, 1)

  return portfolioSeries.value.map((point) => ({
    ...point,
    height: point.value <= 0 ? 3 : Math.max(10, Math.round(((point.value - min) / range) * 68 + 18)),
  }))
})
const hoveredPortfolioBar = computed(() => {
  const index = hoveredPortfolioBarIndex.value
  return index === null ? null : portfolioBars.value[index] ?? null
})
const allocation = computed(() => {
  const items = [
    { label: 'Деньги', value: analyticsCashRub.value, color: allocationColors[0] },
    { label: 'Акции', value: sumPositionsBy('stock', analyticsPositions.value), color: allocationColors[1] },
    { label: 'Облигации', value: sumPositionsBy('bond', analyticsPositions.value), color: allocationColors[2] },
    { label: 'Фонды', value: sumPositionsBy('etf', analyticsPositions.value), color: allocationColors[3] },
    { label: 'Крипто', value: sumPositionsBy('crypto', analyticsPositions.value), color: allocationColors[4] },
    { label: 'Срочные инструменты', value: sumPositionsBy('future', analyticsPositions.value) + sumPositionsBy('option', analyticsPositions.value), color: allocationColors[5] },
    { label: 'Прочее', value: sumOtherPositions(analyticsPositions.value), color: allocationColors[6] },
  ]
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1)
  return items
    .filter((item) => item.value > 0 || item.label === 'Деньги')
    .map((item) => ({ ...item, percent: (item.value / total) * 100 }))
})
const allocationChartStyle = computed(() => {
  const segments = allocationSegments.value
    .filter((item) => item.value > 0)
    .map((item) => `${item.color} ${item.startDeg.toFixed(2)}deg ${item.endDeg.toFixed(2)}deg`)
  return {
    background: segments.length
      ? `conic-gradient(${segments.join(', ')})`
      : 'conic-gradient(hsl(var(--muted)) 0deg 360deg)',
  }
})
const allocationSegments = computed(() => {
  let cursor = 0
  return allocation.value.map((item, index) => {
    const startDeg = cursor
    cursor += item.percent * 3.6
    const endDeg = cursor

    return {
      ...item,
      index,
      startDeg,
      endDeg,
      path: donutSegmentPath(startDeg, endDeg),
    }
  })
})
const activeAllocation = computed(() => {
  const index = hoveredAllocationIndex.value
  return index === null ? null : allocationSegments.value[index] ?? null
})
const topAllocationPositions = computed(() =>
  analyticsPositions.value.slice(0, 5).map((position) => ({
    position,
    percent: analyticsTotalRub.value > 0 ? (toFiniteNumber(position.marketValueRub) / analyticsTotalRub.value) * 100 : 0,
  })),
)
const totalCommissionRub = computed(() =>
  store.trades.reduce((sum, trade) => sum + convertToRubAmount(toFiniteNumber(trade.commission), trade.currency), 0),
)
const overviewStats = computed(() => [
  { label: 'Деньги', value: formatMoney(cashValueRub.value, 'RUB'), sub: `${store.cashBalances.length} валюты` },
  { label: 'Активы', value: formatMoney(positionsValueRub.value, 'RUB'), sub: `${store.positions.length} позиций` },
  { label: 'Результат', value: formatMoney(portfolioPnlRub.value, 'RUB'), sub: `${portfolioPnlPercent.value.toFixed(2)}%` },
  { label: 'Инвестировано', value: formatMoney(investedValueRub.value, 'RUB'), sub: 'средняя цена покупок' },
])
const analyticsStats = computed(() => [
  { label: 'Стоимость', value: formatMoney(analyticsTotalRub.value, 'RUB'), sub: analyticsIsAllAccounts.value ? 'по всем демо-счетам' : 'выбранный демо-счет' },
  { label: 'Деньги', value: formatMoney(analyticsCashRub.value, 'RUB'), sub: analyticsIsAllAccounts.value ? `${demoAccounts.value.length} счетов` : `${store.cashBalances.length} валют` },
  { label: 'Позиции', value: String(analyticsPositions.value.length), sub: 'активов в портфеле' },
  { label: 'Результат', value: formatMoney(analyticsPnlRub.value, 'RUB'), sub: formatPercent(analyticsPnlPercent.value), amount: analyticsPnlRub.value },
  { label: 'Комиссии', value: formatMoney(totalCommissionRub.value, 'RUB'), sub: 'по последним сделкам' },
])
const accountsOverviewStats = computed(() => [
  { label: 'Счетов', value: String(demoAccounts.value.length), sub: 'в демо-портфеле' },
  { label: 'Стоимость', value: formatMoney(accountsTotalRub.value, 'RUB'), sub: 'по всем счетам' },
  { label: 'Сегодня', value: formatMoney(accountsDayRub.value, 'RUB'), sub: 'динамика за день', amount: accountsDayRub.value },
  { label: 'Результат', value: formatMoney(accountsPnlRub.value, 'RUB'), sub: 'за все время', amount: accountsPnlRub.value },
])
const portfolioPositions = computed(() =>
  [...store.positions].sort(
    (a, b) => toFiniteNumber(b.marketValueRub) - toFiniteNumber(a.marketValueRub),
  ),
)
const allPortfolioPositions = computed(() =>
  [...(store.overview?.allPositions ?? store.positions)].sort(
    (a, b) => toFiniteNumber(b.marketValueRub) - toFiniteNumber(a.marketValueRub),
  ),
)
const analyticsIsAllAccounts = computed(() => activeTab.value === 'analytics' && !selectedAccountId.value)
const analyticsPositions = computed(() => (analyticsIsAllAccounts.value ? allPortfolioPositions.value : portfolioPositions.value))
const analyticsPositionsValueRub = computed(() =>
  analyticsPositions.value.reduce((sum, position) => sum + toFiniteNumber(position.marketValueRub), 0),
)
const analyticsInvestedValueRub = computed(() =>
  analyticsPositions.value.reduce((sum, position) => sum + toFiniteNumber(position.costBasisRub), 0),
)
const analyticsTotalRub = computed(() => (analyticsIsAllAccounts.value ? accountsTotalRub.value : portfolioTotalRub.value))
const analyticsCashRub = computed(() =>
  Math.max(0, analyticsIsAllAccounts.value ? accountsTotalRub.value - analyticsPositionsValueRub.value : cashValueRub.value),
)
const analyticsPnlRub = computed(() =>
  analyticsIsAllAccounts.value ? accountsPnlRub.value : portfolioPnlRub.value,
)
const analyticsPnlPercent = computed(() => {
  const invested = analyticsIsAllAccounts.value ? accountsInvestedRub.value : investedValueRub.value
  return invested > 0 ? (analyticsPnlRub.value / invested) * 100 : 0
})
const topMovers = computed(() =>
  pricedInstruments.value
    .filter((instrument) => instrument.asset_type !== 'currency')
    .sort(
      (a, b) =>
        Math.abs(toFiniteNumber(b.demo_price_cache?.change_percent)) -
        Math.abs(toFiniteNumber(a.demo_price_cache?.change_percent)),
    )
    .slice(0, 5),
)
const events = computed<DemoEvent[]>(() => [
  ...store.trades.map(tradeEvent),
  ...store.transactions.map((transaction) => ({
    id: `cash-${transaction.id}`,
    title: transaction.description ?? 'Операция по счету',
    subtitle: `${cashEventLabel(transaction.kind)} · ${transaction.currency}`,
    date: transaction.effective_at,
    amount: toFiniteNumber(transaction.amount),
    currency: transaction.currency,
    kind: 'cash' as const,
    instrument: null,
  })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
const selectedInstrumentDetails = computed(() => store.instrumentDetails ?? selectedInstrumentFallback.value)
const selectedInstrumentEvents = computed(() =>
  (selectedInstrumentDetails.value?.events ?? [])
    .map(tradeEvent)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
)
const eventsTotalPages = computed(() => Math.max(1, Math.ceil(events.value.length / eventsPageSize)))
const paginatedEvents = computed(() => {
  const start = (eventsPage.value - 1) * eventsPageSize
  return events.value.slice(start, start + eventsPageSize)
})
const instrumentEventsTotalPages = computed(() =>
  Math.max(1, Math.ceil(selectedInstrumentEvents.value.length / instrumentEventsPageSize)),
)
const paginatedInstrumentEvents = computed(() => {
  const start = (instrumentEventsPage.value - 1) * instrumentEventsPageSize
  return selectedInstrumentEvents.value.slice(start, start + instrumentEventsPageSize)
})
const chartCandles = computed(() =>
  (selectedInstrumentDetails.value?.candles ?? [])
    .map((candle) => ({
      ...candle,
      open: toFiniteNumber(candle.open, Number.NaN),
      close: toFiniteNumber(candle.close, Number.NaN),
      high: toFiniteNumber(candle.high, Number.NaN),
      low: toFiniteNumber(candle.low, Number.NaN),
      volume: candle.volume === null ? null : toFiniteNumber(candle.volume, Number.NaN),
    }))
    .filter((candle) => [candle.open, candle.close, candle.high, candle.low].every(Number.isFinite)),
)
const chartBounds = computed(() => {
  const candles = chartCandles.value
  const lows = candles.map((candle) => candle.low)
  const highs = candles.map((candle) => candle.high)
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  const padding = (max - min || Math.max(max, 1)) * 0.08
  return {
    min: Number.isFinite(min) ? min - padding : 0,
    max: Number.isFinite(max) ? max + padding : 1,
  }
})
const chartPolyline = computed(() => {
  const candles = chartCandles.value
  if (candles.length === 0) return ''
  return candles
    .map((candle, index) => `${chartX(index)},${chartY(candle.close)}`)
    .join(' ')
})
const candleViews = computed(() =>
  chartCandles.value.map((candle, index) => {
    const x = chartX(index)
    const openY = chartY(candle.open)
    const closeY = chartY(candle.close)
    const highY = chartY(candle.high)
    const lowY = chartY(candle.low)
    const width = Math.max(0.65, Math.min(2.6, 70 / Math.max(chartCandles.value.length, 1)))
    return {
      candle,
      index,
      x,
      openY,
      closeY,
      highY,
      lowY,
      width,
      bodyY: Math.min(openY, closeY),
      bodyHeight: Math.max(0.8, Math.abs(closeY - openY)),
      positive: candle.close >= candle.open,
    }
  }),
)
const hoveredCandle = computed(() => {
  const index = hoveredCandleIndex.value
  return index === null ? null : candleViews.value[index] ?? null
})
const chartLastPriceY = computed(() => (lastCandle.value ? chartY(lastCandle.value.close) : null))
const chartLastPriceStyle = computed(() => ({
  top: `${chartLastPriceY.value ?? 0}%`,
}))
const chartTooltipStyle = computed(() => {
  const hovered = hoveredCandle.value
  if (!hovered) return {}

  const left = Math.min(76, Math.max(18, hovered.x))
  return { left: `${left}%` }
})
const selectedPosition = computed(() => {
  const instrumentId = selectedInstrumentDetails.value?.instrument.id
  if (!instrumentId) return null
  return store.positions.find((position) => position.instrument_id === instrumentId) ?? null
})
const selectedAvailableQuantity = computed(() => {
  const instrument = selectedInstrumentDetails.value?.instrument
  if (!instrument) return 0
  if (instrument.asset_type === 'currency') return cashAmount(currencyFromPair(instrument.symbol))
  return toFiniteNumber(selectedPosition.value?.quantity, 0)
})
const selectedOrderGross = computed(() => {
  const instrument = selectedInstrumentDetails.value?.instrument
  if (!instrument?.demo_price_cache) return 0
  return selectedOrderPrice.value * orderUnitsFor(instrument)
})
const selectedOrderCommission = computed(() => selectedOrderGross.value * brokerCommissionRate)
const selectedOrderTotal = computed(() =>
  orderSide.value === 'buy'
    ? selectedOrderGross.value + selectedOrderCommission.value
    : Math.max(0, selectedOrderGross.value - selectedOrderCommission.value),
)
const selectedOrderPrice = computed(() => {
  const instrument = selectedInstrumentDetails.value?.instrument
  if (!instrument?.demo_price_cache) return 0
  const marketPrice = instrumentUnitPrice(instrument)
  if (orderType.value !== 'limit') return marketPrice
  return Math.max(0, toFiniteNumber(limitPrices[instrument.id], marketPrice))
})
const selectedSettlementCurrency = computed(() => {
  const instrument = selectedInstrumentDetails.value?.instrument
  return instrument ? settlementCurrency(instrument) : 'RUB'
})
const selectedCashAvailable = computed(() => cashAmount(selectedSettlementCurrency.value))
const selectedCurrencyInstrument = computed(() => {
  const currency = selectedSettlementCurrency.value
  if (currency === 'RUB') return null
  return store.instruments.find(
    (instrument) => instrument.asset_type === 'currency' && currencyFromPair(instrument.symbol) === currency,
  ) ?? null
})
const hasEnoughSettlementCurrency = computed(() => {
  const instrument = selectedInstrumentDetails.value?.instrument
  if (!instrument || orderSide.value !== 'buy') return true
  return selectedCashAvailable.value >= selectedOrderTotal.value
})
const lastCandle = computed(() => chartCandles.value[chartCandles.value.length - 1] ?? null)
const periodVolume = computed(() =>
  chartCandles.value.reduce((sum, candle) => {
    const volume = candle.volume ?? 0
    return Number.isFinite(volume) ? sum + volume : sum
  }, 0),
)
const providerFactEntries = computed(() =>
  Object.entries(selectedInstrumentDetails.value?.providerFacts ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 14),
)
const keyMetricGroups = computed(() => {
  const groups = new Map<string, DemoInstrumentMetric[]>()
  const metrics = selectedInstrumentDetails.value?.keyMetrics ?? []
  const metricByLabel = new Map(metrics.map((metric) => [metric.label, metric]))

  for (const definition of demoInstrumentMetricDefinitions) {
    const metric = metricByLabel.get(definition.label)
    if (!metric?.value) continue

    const normalizedMetric = {
      ...metric,
      section: definition.section,
      hint: metric.hint ?? definition.hint,
    }
    groups.set(definition.section, [...(groups.get(definition.section) ?? []), normalizedMetric])
  }

  for (const metric of metrics) {
    if (demoInstrumentMetricDefinitions.some((definition) => definition.label === metric.label)) continue

    const section = metric.section || 'Показатели'
    groups.set(section, [...(groups.get(section) ?? []), metric])
  }

  return [...groups.entries()].map(([section, items]) => ({
    section,
    items: [...items].sort((left, right) => left.order_index - right.order_index),
  }))
})
const dividendRows = computed<DemoInstrumentDividend[]>(() =>
  [...(selectedInstrumentDetails.value?.dividends ?? [])].sort((left, right) => {
    const byDate = new Date(right.record_date).getTime() - new Date(left.record_date).getTime()
    return byDate || left.order_index - right.order_index
  }),
)
const isSelectedBond = computed(() => selectedInstrumentDetails.value?.instrument.asset_type === 'bond')
const couponRows = computed(() =>
  [...(selectedInstrumentDetails.value?.dividends ?? [])].sort((left, right) => {
    const byDate = new Date(right.record_date).getTime() - new Date(left.record_date).getTime()
    return byDate || left.order_index - right.order_index
  }),
)
const upcomingCouponRows = computed(() =>
  [...couponRows.value]
    .filter((row) => new Date(row.record_date).getTime() >= startOfToday().getTime())
    .sort((left, right) => new Date(left.record_date).getTime() - new Date(right.record_date).getTime()),
)
const nextCoupon = computed(() => upcomingCouponRows.value[0] ?? null)
const paidCouponCount = computed(() =>
  couponRows.value.filter((row) => new Date(row.record_date).getTime() < startOfToday().getTime()).length,
)
const bondYieldText = computed(() => {
  const yieldValue = nextCoupon.value?.yield_percent ?? selectedInstrumentDetails.value?.instrument.demo_price_cache?.change_percent ?? null
  if (yieldValue === null || yieldValue === undefined) return '—'
  return `${Math.abs(toFiniteNumber(yieldValue)).toFixed(2)}%`
})

function tradeEvent(trade: DemoTrade): DemoEvent {
  const gross = toFiniteNumber(trade.price) * toFiniteNumber(trade.quantity)
  const commission = toFiniteNumber(trade.commission)
  const amount = trade.side === 'buy' ? -(gross + commission) : gross - commission

  return {
    id: `trade-${trade.id}`,
    title: `${trade.side === 'buy' ? 'Покупка' : 'Продажа'} ${trade.demo_instruments.symbol}`,
    subtitle: `${formatQuantity(trade.quantity)} ${tradeUnit(trade.demo_instruments)} · ${formatMoney(trade.price, trade.currency)} · комиссия ${formatMoney(commission, trade.currency)}`,
    date: trade.executed_at,
    amount,
    currency: trade.currency,
    kind: 'trade' as const,
    instrument: trade.demo_instruments,
  }
}

function instrumentInitials(instrument: DemoInstrument) {
  return instrument.symbol.slice(0, 2).toUpperCase()
}

function assetUrl(value: string | null | undefined) {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return value.startsWith('/') ? `${API_BASE_URL}${value}` : value
}

function instrumentLogoUrl(instrument: DemoInstrument) {
  return assetUrl(instrument.logo_url)
}

function currencyIconUrl(currency: string) {
  return currencyIconUrls[currency.toUpperCase()] ?? currencyIconUrls.RUB
}

function eventLogoUrl(event: DemoEvent) {
  return event.instrument ? instrumentLogoUrl(event.instrument) : currencyIconUrl(event.currency)
}

function eventLogoAlt(event: DemoEvent) {
  return event.instrument?.name ?? event.currency
}

function eventLogoText(event: DemoEvent) {
  return event.instrument ? instrumentInitials(event.instrument) : event.currency.slice(0, 2).toUpperCase()
}

function eventLogoClasses(event: DemoEvent) {
  if (event.instrument) {
    return [instrumentTone(event.instrument), { 'demo-account__instrument-logo--image': Boolean(instrumentLogoUrl(event.instrument)) }]
  }
  return ['demo-account__logo--fx', 'demo-account__instrument-logo--image']
}

function isInstrumentFavorite(instrument: DemoInstrument) {
  const fresh = store.instruments.find((item) => item.id === instrument.id)
  return Boolean(fresh?.isFavorite ?? instrument.isFavorite)
}

async function toggleFavorite(instrument: DemoInstrument) {
  await store.setFavoriteInstrument(instrument.id, !isInstrumentFavorite(instrument))
}

function tabFromRoute(value: unknown): AccountTab {
  return typeof value === 'string' && ['overview', 'catalog', 'analytics', 'events'].includes(value)
    ? value as AccountTab
    : 'overview'
}

function accountIdFromRoute(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function currentWorkspaceAccountId() {
  return selectedAccountId.value ?? store.account?.id ?? demoAccounts.value[0]?.id ?? null
}

function workspaceQuery(tab: AccountTab, accountId = currentWorkspaceAccountId()) {
  const query: Record<string, string> = { tab }
  if ((accountScopedTabs.has(tab) || tab === 'overview' || tab === 'analytics') && accountId) {
    query.accountId = accountId
  }
  return query
}

function buildPortfolioSeries(
  snapshots: Array<{ date: string; value: number }>,
  range: PortfolioChartRange,
) {
  const now = new Date()
  const buckets = portfolioBuckets(now, range)

  return buckets.map((bucket, index) => {
    const nextBucket = buckets[index + 1]
    const bucketSnapshots = snapshots.filter((snapshot) => {
      const date = new Date(snapshot.date)
      return date >= bucket.date && (!nextBucket || date < nextBucket.date)
    })
    const isCurrentBucket = bucket.date <= now && (!nextBucket || now < nextBucket.date)
    const value = bucketSnapshots.length
      ? bucketSnapshots[bucketSnapshots.length - 1]?.value ?? 0
      : isCurrentBucket
        ? currentPortfolioChartValue.value
        : 0

    return {
      date: bucket.date.toISOString(),
      label: bucket.label,
      value,
    }
  })
}

function portfolioBuckets(now: Date, range: PortfolioChartRange) {
  if (range === 'day') {
    const currentHour = now.getHours()
    const hours = new Set<number>()
    for (let hour = 0; hour <= currentHour; hour += 3) {
      hours.add(hour)
    }
    hours.add(currentHour)

    return [...hours].sort((a, b) => a - b).map((hour) => ({
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour),
      label: `${String(hour).padStart(2, '0')}:00`,
    }))
  }

  if (range === 'week') {
    const start = new Date(now)
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    const todayIndex = (now.getDay() + 6) % 7
    return Array.from({ length: todayIndex + 1 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return {
        date,
        label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date),
      }
    })
  }

  if (range === 'month') {
    const currentWeekStart = new Date(now)
    const day = (currentWeekStart.getDay() + 6) % 7
    currentWeekStart.setDate(currentWeekStart.getDate() - day)
    currentWeekStart.setHours(0, 0, 0, 0)

    return Array.from({ length: 4 }, (_, index) => {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() - (3 - index) * 7)
      return {
        date,
        label: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date),
      }
    })
  }

  return Array.from({ length: now.getMonth() + 1 }, (_, month) => {
    const date = new Date(now.getFullYear(), month, 1)
    return {
      date,
      label: new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date),
    }
  })
}

function instrumentCountry(instrument: DemoInstrument) {
  if (instrument.country) return instrument.country
  const code = instrumentCountryCode(instrument)
  if (code === 'RU') return 'Россия'
  if (code === 'EU') return 'Европа'
  if (code === 'CN') return 'Китай'
  if (code === 'CRYPTO') return 'Крипто'
  return 'США'
}

function instrumentCountryCode(instrument: DemoInstrument) {
  if (instrument.exchange?.includes('MOEX')) return 'RU'
  if (instrument.asset_type === 'crypto') return 'CRYPTO'
  if (instrument.exchange === 'SSE' || instrument.exchange === 'SZSE' || instrument.currency === 'CNY') return 'CN'
  if (instrument.currency === 'EUR' || instrument.exchange?.includes('Euronext') || instrument.exchange === 'XETRA') return 'EU'
  return 'US'
}

function bondMaturityDate(instrument: DemoInstrument) {
  const known: Record<string, string> = {
    SU26244RMFS2: '2034-03-15',
    SU26243RMFS4: '2038-05-19',
    SU26238RMFS4: '2041-05-15',
    TLT: '2044-12-31',
    IEF: '2033-12-31',
    LQD: '2036-12-31',
    HYG: '2031-12-31',
  }
  const codeParts = instrument.code.split(':')
  const value = known[instrument.symbol] ?? known[codeParts[codeParts.length - 1] ?? '']
  return value ? new Date(`${value}T00:00:00`) : null
}

function bondMaturityText(instrument: DemoInstrument) {
  const date = bondMaturityDate(instrument)
  return date ? formatDate(date.toISOString()) : '—'
}

function bondMaturitySubtext(instrument: DemoInstrument) {
  const date = bondMaturityDate(instrument)
  if (!date) return instrument.exchange ?? 'облигация'
  const years = Math.max(0, Math.round((date.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000)))
  return years > 0 ? `на ${years} лет` : 'погашение скоро'
}

function bondYieldForInstrument(instrument: DemoInstrument) {
  const baseBySymbol: Record<string, number> = {
    SU26244RMFS2: 14.01,
    SU26243RMFS4: 14.43,
    SU26238RMFS4: 14.14,
    TLT: 4.58,
    IEF: 4.12,
    LQD: 5.33,
    HYG: 7.21,
  }
  const codeParts = instrument.code.split(':')
  const value = baseBySymbol[instrument.symbol] ?? baseBySymbol[codeParts[codeParts.length - 1] ?? ''] ?? 8.5
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`
}

function instrumentTone(instrument: DemoInstrument) {
  if (instrument.exchange?.includes('MOEX')) return 'demo-account__logo--ru'
  if (instrument.asset_type === 'currency') return 'demo-account__logo--fx'
  if (instrument.asset_type === 'etf') return 'demo-account__logo--fund'
  return 'demo-account__logo--us'
}

function tradeUnit(instrument: DemoInstrument) {
  if (instrument.asset_type === 'currency') return currencyFromPair(instrument.symbol)
  if (instrument.asset_type === 'crypto') return instrument.symbol.replace('USD', '')
  return 'шт.'
}

function cashEventLabel(kind: string) {
  if (kind === 'manual_deposit') return 'Пополнение'
  if (kind === 'manual_adjustment') return 'Коррекция'
  if (kind === 'scheduled_income') return 'Автопополнение'
  if (kind === 'bond_coupon') return 'Купон'
  if (kind.includes('exchange')) return 'Обмен валюты'
  return kind
}

function currencyFromPair(symbol: string) {
  if (symbol === 'USDRUB') return 'USD'
  if (symbol === 'EURRUB') return 'EUR'
  if (symbol === 'CNYRUB') return 'CNY'
  if (symbol === 'GBPRUB') return 'GBP'
  if (symbol === 'CHFRUB') return 'CHF'
  if (symbol === 'JPYRUB') return 'JPY'
  if (symbol === 'HKDRUB') return 'HKD'
  return 'RUB'
}

function settlementCurrency(instrument: DemoInstrument) {
  return instrument.asset_type === 'currency' ? 'RUB' : instrument.currency
}

function instrumentLotSize(instrument: DemoInstrument) {
  const value = toFiniteNumber(instrument.lotSize, 1)
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1))
}

function orderQuantityFor(instrument: DemoInstrument) {
  const values = orderSide.value === 'buy' ? buyQuantities : sellQuantities
  return Math.max(1, Math.floor(toFiniteNumber(values[instrument.id], 1)))
}

function orderUnitsFor(instrument: DemoInstrument) {
  return orderQuantityFor(instrument) * instrumentLotSize(instrument)
}

function isOrderDisabled(instrument: DemoInstrument) {
  if (instrument.asset_type === 'index') return true
  if (store.isMutating || !instrument.demo_price_cache) return true
  if (orderType.value === 'limit' && selectedOrderPrice.value <= 0) return true
  if (!hasEnoughSettlementCurrency.value) return true
  if (orderSide.value === 'buy') return orderQuantityFor(instrument) <= 0
  return orderQuantityFor(instrument) <= 0 || selectedAvailableQuantity.value < orderUnitsFor(instrument)
}

function chartX(index: number) {
  return Number(((index / Math.max(chartCandles.value.length - 1, 1)) * 100).toFixed(2))
}

function chartY(value: number) {
  const { min, max } = chartBounds.value
  const range = max - min || 1
  return Number((92 - ((value - min) / range) * 84).toFixed(2))
}

function handleChartPointerMove(event: MouseEvent) {
  const candles = chartCandles.value
  if (!candles.length) return

  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  hoveredCandleIndex.value = Math.round(ratio * (candles.length - 1))
}

function handleAllocationPointerMove(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const dx = event.clientX - centerX
  const dy = event.clientY - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const radius = rect.width / 2

  if (distance < radius * 0.58 || distance > radius) {
    hoveredAllocationIndex.value = null
    return
  }

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const normalized = (angle + 450) % 360
  const segment = allocationSegments.value.find(
    (item) => normalized >= item.startDeg && normalized <= item.endDeg,
  )
  hoveredAllocationIndex.value = segment?.index ?? null
}

function donutSegmentPath(startDeg: number, endDeg: number) {
  if (endDeg - startDeg >= 359.99) {
    return [
      'M 50 4',
      'A 46 46 0 1 1 49.99 4',
      'L 49.99 24',
      'A 26 26 0 1 0 50 24',
      'Z',
    ].join(' ')
  }

  const outerStart = polarPoint(50, 50, 46, startDeg)
  const outerEnd = polarPoint(50, 50, 46, endDeg)
  const innerEnd = polarPoint(50, 50, 26, endDeg)
  const innerStart = polarPoint(50, 50, 26, startDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A 46 46 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A 26 26 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: Number((cx + radius * Math.cos(angle)).toFixed(3)),
    y: Number((cy + radius * Math.sin(angle)).toFixed(3)),
  }
}

function formatFactValue(value: string | number | null) {
  if (value === null) return '—'
  if (typeof value === 'number') {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 }).format(value)
  }
  return value
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function candleChange(candle: { open: number; close: number }) {
  if (!Number.isFinite(candle.open) || candle.open === 0) return 0
  return ((candle.close - candle.open) / candle.open) * 100
}

function candleChangeText(candle: { open: number; close: number }) {
  const value = candleChange(candle)
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function quoteAge(instrument: DemoInstrument) {
  const value = instrument.demo_price_cache?.as_of
  return value ? formatDate(value) : 'котировка не загружена'
}

function priceText(instrument: DemoInstrument) {
  const quote = instrument.demo_price_cache
  if (!quote) return 'Обновите котировки'
  if (instrument.asset_type === 'bond' && toFiniteNumber(instrument.faceValue, 0) > 0) {
    return `${toFiniteNumber(quote.price).toFixed(2)}% · ${formatMoney(instrumentUnitPrice(instrument), quote.currency)}`
  }

  return formatMoney(quote.price, quote.currency)
}

function instrumentUnitPrice(instrument: DemoInstrument) {
  const quote = instrument.demo_price_cache
  const price = toFiniteNumber(quote?.price, 0)
  if (instrument.asset_type !== 'bond') return price
  const faceValue = toFiniteNumber(instrument.faceValue, 0)
  return faceValue > 0 ? (price * faceValue) / 100 : price
}

function changeAbsText(instrument: DemoInstrument) {
  const value = instrument.demo_price_cache?.change_abs
  if (value === null || value === undefined) return '—'
  const amount = toFiniteNumber(value, Number.NaN)
  if (!Number.isFinite(amount)) return '—'
  return `${amount >= 0 ? '+' : ''}${formatMoney(amount, instrument.demo_price_cache?.currency ?? instrument.currency)}`
}

function positionPerformanceRub(position: DemoPosition) {
  return toFiniteNumber(position.unrealizedPnlRub)
}

function positionPerformancePercent(position: DemoPosition) {
  return toFiniteNumber(position.unrealizedPnlPercent)
}

function findRate(symbol: string) {
  const instrument = store.instruments.find((item) => item.symbol === symbol)
  const price = toFiniteNumber(instrument?.demo_price_cache?.price, Number.NaN)
  return Number.isFinite(price) && price > 0 ? price : null
}

function convertToRubAmount(amount: number, currency: string) {
  if (currency === 'RUB') return amount
  const rate = findRate(`${currency}RUB`)
  return rate ? amount * rate : 0
}

function sumPositionsBy(assetType: string, positions = store.positions) {
  return positions
    .filter((position) => position.demo_instruments.asset_type === assetType)
    .reduce((sum, position) => sum + toFiniteNumber(position.marketValueRub), 0)
}

function sumOtherPositions(positions = store.positions) {
  const known = new Set(['stock', 'bond', 'etf', 'crypto', 'future', 'option'])
  return positions
    .filter((position) => !known.has(position.demo_instruments.asset_type))
    .reduce((sum, position) => sum + toFiniteNumber(position.marketValueRub), 0)
}

function cashAmount(currency: string) {
  return toFiniteNumber(store.cashBalances.find((balance) => balance.currency === currency)?.amount, 0)
}

function toFiniteNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  if (value && typeof value === 'object') {
    const text = String(value)
    if (text !== '[object Object]') {
      const parsed = Number(text.replace(',', '.'))
      return Number.isFinite(parsed) ? parsed : fallback
    }
  }
  return fallback
}

function formatMoney(value: unknown, currency = 'RUB') {
  const amount = toFiniteNumber(value, Number.NaN)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatQuantity(value: unknown) {
  const amount = toFiniteNumber(value, 0)
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatPercent(value: string | number | null) {
  if (value === null) return '—'
  const amount = toFiniteNumber(value, Number.NaN)
  if (!Number.isFinite(amount)) return '—'
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}%`
}

function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return 'пока не задано'
  const rawValue = value instanceof Date ? value.toISOString() : String(value)
  const normalized = rawValue.includes(' ') && !rawValue.includes('T') ? rawValue.replace(' ', 'T') : rawValue
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return 'дата уточняется'

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function quantityFor(instrument: DemoInstrument) {
  return Math.max(1, Math.floor(toFiniteNumber(buyQuantities[instrument.id], 1)))
}

function sellQuantityFor(position: DemoPosition) {
  return Math.max(1, Math.floor(toFiniteNumber(sellQuantities[position.instrument_id], toFiniteNumber(position.quantity))))
}

function isPositive(value: unknown) {
  return toFiniteNumber(value) >= 0
}

function toneClass(value: unknown) {
  const amount = toFiniteNumber(value)
  return {
    'demo-account__positive': amount >= 0,
    'demo-account__negative': amount < 0,
  }
}

function switchDisplayCurrency() {
  displayCurrency.value = nextDisplayCurrency.value
}

function clearSearch() {
  searchQuery.value = ''
  debouncedSearchQuery.value = ''
  isSearchFocused.value = false
}

async function selectSearchResult(instrument: DemoInstrument) {
  clearSearch()
  await openInstrument(instrument)
}

function onSearchBlur() {
  window.setTimeout(() => {
    isSearchFocused.value = false
  }, 120)
}

function onWorkspaceAccountChange(event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value
  if (value) void selectAccount(value)
}

function onAnalyticsAccountChange(event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value ?? 'all'
  void setAnalyticsAccount(value === 'all' ? null : value)
}

function instrumentSectionLabel(section: { id: InstrumentSection; label: string }) {
  if (section.id === 'dividends' && isSelectedBond.value) return 'Купоны'
  if (section.id === 'metrics' && isSelectedBond.value) return 'Параметры'
  return section.label
}

async function setAnalyticsAccount(accountId: string | null) {
  selectedAccountId.value = accountId
  await store.fetchOverview({ accountId })
  await router.replace({ name: 'demo-account', query: workspaceQuery('analytics', accountId) })
}

async function selectAllAccounts() {
  selectedAccountId.value = null
  isAccountEditorOpen.value = false
  if (route.name !== 'demo-account' || activeTab.value !== 'overview') {
    await router.push({ name: 'demo-account', query: { tab: 'overview' } })
  }
}

async function selectAccount(accountId: string) {
  selectedAccountId.value = accountId
  await store.fetchOverview({ accountId })
  if (!store.account || store.account.id !== accountId) return
  openAccountEditor(false)
  if (route.name === 'demo-account-instrument') {
    await router.replace({
      name: 'demo-account-instrument',
      params: route.params,
      query: { ...workspaceQuery('catalog', accountId), section: activeInstrumentSection.value },
    })
  } else if (accountScopedTabs.has(activeTab.value)) {
    await router.replace({ name: 'demo-account', query: workspaceQuery(activeTab.value, accountId) })
  }
}

async function switchTab(tab: AccountTab) {
  activeTab.value = tab
  let accountId = currentWorkspaceAccountId()
  if (tab === 'overview') {
    isAccountEditorOpen.value = false
    accountId = selectedAccountId.value ?? accountId
    if (accountId) selectedAccountId.value = accountId
  } else if (tab === 'analytics') {
    accountId = selectedAccountId.value
  } else if (accountId) {
    selectedAccountId.value = accountId
  }
  if (route.name === 'demo-account-instrument') {
    selectedCatalogInstrumentId.value = null
    selectedInstrumentFallback.value = null
    store.clearInstrumentDetails()
    await router.push({ name: 'demo-account', query: workspaceQuery(tab, accountId) })
    return
  }

  await router.push({ name: 'demo-account', query: workspaceQuery(tab, accountId) })
}

async function refreshQuotes() {
  await store.refreshQuotes()
}

async function deposit() {
  await store.depositCash(depositAmount.value, 'Учебное пополнение')
  if (!store.error) openedAction.value = null
}

async function createDemoAccount() {
  const created = await store.createAccount(newAccountDraft.name, newAccountDraft.initialCash)
  if (!created) return
  selectedAccountId.value = created.id
  isNewAccountEditorOpen.value = false
  newAccountDraft.name = `Демо-счет ${demoAccounts.value.length + 1}`
  newAccountDraft.initialCash = 0
}

async function createSalaryRule() {
  const date = new Date(`${salaryDate.value}T00:00:00`)
  salaryDay.value = Number.isNaN(date.getTime()) ? salaryDay.value : date.getDate()
  await store.createIncomeRule('Ежемесячное демо-пополнение', salaryAmount.value, salaryDay.value)
  if (!store.error) openedAction.value = null
}

function openAccountEditor(shouldOpen = true) {
  accountDraft.name = store.account?.name ?? 'Демо-счет'
  accountDraft.cashRub = cashAmount('RUB')
  for (const currency of accountCurrencies.value) {
    accountCashDrafts[currency] = cashAmount(currency)
  }
  for (const key of Object.keys(positionDrafts)) {
    delete positionDrafts[key]
  }
  for (const key of Object.keys(positionRemovalDrafts)) {
    delete positionRemovalDrafts[key]
  }
  for (const position of store.positions) {
    positionDrafts[position.instrument_id] = {
      quantity: toFiniteNumber(position.quantity),
      avgPrice: toFiniteNumber(position.avg_price),
    }
    positionRemovalDrafts[position.instrument_id] = 0
  }
  isAccountEditorOpen.value = shouldOpen
}

function toggleAccountEditor() {
  if (isAccountEditorOpen.value) {
    isAccountEditorOpen.value = false
    return
  }

  openAccountEditor(true)
}

async function saveAccountSettings() {
  accountCashDrafts.RUB = accountDraft.cashRub
  await store.updateAccount(
    accountDraft.name,
    Object.entries(accountCashDrafts).map(([currency, amount]) => ({ currency, amount })),
    Object.entries(positionDrafts).map(([instrumentId, draft]) => ({
      instrumentId: toFiniteNumber(instrumentId),
      quantity: draft.quantity,
      avgPrice: draft.avgPrice,
    })),
  )
  isAccountEditorOpen.value = false
}

function removePositionQuantity(position: DemoPosition) {
  const draft = positionDrafts[position.instrument_id]
  if (!draft) return
  const amount = Math.max(0, toFiniteNumber(positionRemovalDrafts[position.instrument_id], 0))
  draft.quantity = Math.max(0, draft.quantity - amount)
  positionRemovalDrafts[position.instrument_id] = 0
}

function removeFullPosition(position: DemoPosition) {
  const draft = positionDrafts[position.instrument_id]
  if (!draft) return
  draft.quantity = 0
  positionRemovalDrafts[position.instrument_id] = 0
}

async function buyInstrument(instrument: DemoInstrument) {
  await store.placeTrade('buy', toFiniteNumber(instrument.id), quantityFor(instrument) * instrumentLotSize(instrument))
}

async function sellPosition(position: DemoPosition) {
  await store.placeTrade('sell', toFiniteNumber(position.instrument_id), sellQuantityFor(position))
}

async function submitInstrumentOrder(instrument: DemoInstrument) {
  orderNotice.value = null
  const side = orderSide.value
  const lots = orderQuantityFor(instrument)
  const quantity = orderUnitsFor(instrument)
  try {
    await store.placeTrade(side, toFiniteNumber(instrument.id), quantity, {
      orderType: orderType.value,
      limitPrice: orderType.value === 'limit' ? selectedOrderPrice.value : undefined,
    })
    if (store.error) {
      orderNotice.value = {
        tone: 'error',
        text: store.error,
      }
      return
    }
    await store.fetchInstrumentDetails(instrument.id, chartPeriod.value)
    orderNotice.value = {
      tone: 'success',
      text: `${side === 'buy' ? 'Покупка' : 'Продажа'} исполнена: ${formatQuantity(lots)} лот. (${formatQuantity(quantity)} ${tradeUnit(instrument)}) ${instrument.symbol} на сумму ${formatMoney(selectedOrderTotal.value, settlementCurrency(instrument))}, комиссия ${formatMoney(selectedOrderCommission.value, settlementCurrency(instrument))}`,
    }
  } catch {
    orderNotice.value = {
      tone: 'error',
      text: store.error ?? 'Заявку не удалось исполнить',
    }
  }
}

async function openInstrument(instrument: DemoInstrument) {
  await router.push({
    name: 'demo-account-instrument',
    params: { instrumentId: instrument.id },
    query: workspaceQuery('catalog'),
  })
}

async function openInstrumentPage(instrument: DemoInstrument) {
  activeTab.value = 'catalog'
  activeInstrumentSection.value = 'chart'
  orderNotice.value = null
  selectedCatalogInstrumentId.value = instrument.id
  selectedInstrumentFallback.value = {
    instrument,
    candles: [],
    stats: {
      periodChangePercent: null,
      high: null,
      low: null,
    },
    providerFacts: {},
    keyMetrics: [],
    dividends: [],
    events: [],
  }
  void store.fetchInstrumentDetails(instrument.id, chartPeriod.value)
}

async function closeInstrument() {
  selectedCatalogInstrumentId.value = null
  selectedInstrumentFallback.value = null
  store.clearInstrumentDetails()
  if (route.name === 'demo-account-instrument') {
    await router.push({ name: 'demo-account', query: workspaceQuery('catalog') })
  }
}

async function initDemoAccount() {
  const routeAccountId = accountIdFromRoute(route.query.accountId)
  selectedAccountId.value = routeAccountId
  await store.fetchOverview({ accountId: routeAccountId })
  if (activeTab.value !== 'overview') {
    selectedAccountId.value = routeAccountId ?? store.account?.id ?? selectedAccountId.value
  }
  if (store.instruments.length > 0 && pricedInstruments.value.length < store.instruments.length) {
    await store.refreshQuotes()
  }
  await syncInstrumentRoute()
}

async function syncInstrumentRoute() {
  const instrumentId = typeof route.params.instrumentId === 'string' ? route.params.instrumentId : null
  if (!instrumentId) {
    selectedCatalogInstrumentId.value = null
    selectedInstrumentFallback.value = null
    store.clearInstrumentDetails()
    return
  }
  const instrument = store.instruments.find((item) => item.id === instrumentId)
  if (instrument) {
    await openInstrumentPage(instrument)
    return
  }

  activeTab.value = 'catalog'
  selectedCatalogInstrumentId.value = instrumentId
  selectedInstrumentFallback.value = null
  void store.fetchInstrumentDetails(instrumentId, chartPeriod.value)
}

async function changeChartPeriod(period: ChartPeriod) {
  chartPeriod.value = period
  hoveredCandleIndex.value = null
  const instrumentId = selectedCatalogInstrumentId.value
  if (instrumentId) {
    await store.fetchInstrumentDetails(instrumentId, period)
  }
}

onMounted(() => {
  void initDemoAccount()
  quoteRefreshTimer = window.setInterval(() => {
    if (!store.isLoading && !store.isMutating && !store.isDetailsLoading) {
      void store.refreshQuotes({ silent: true }).then((wasUpdated) => {
        if (wasUpdated && selectedCatalogInstrumentId.value) {
          void store.fetchInstrumentDetails(selectedCatalogInstrumentId.value, chartPeriod.value, { silent: true })
        }
      })
    }
  }, 5000)
})

onUnmounted(() => {
  if (quoteRefreshTimer) {
    window.clearInterval(quoteRefreshTimer)
    quoteRefreshTimer = null
  }
  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

watch(
  () => route.params.instrumentId,
  () => {
    void syncInstrumentRoute()
  },
)

watch(
  () => route.query.tab,
  (value) => {
    const nextTab = tabFromRoute(value)
    const routeAccountId = accountIdFromRoute(route.query.accountId)
    activeTab.value = route.name === 'demo-account-instrument' ? 'catalog' : nextTab
    if (nextTab === 'overview' && route.name !== 'demo-account-instrument') {
      if (routeAccountId) {
        selectedAccountId.value = routeAccountId
      }
      isAccountEditorOpen.value = false
    } else if (nextTab === 'analytics') {
      selectedAccountId.value = routeAccountId
    } else if (nextTab !== 'overview') {
      selectedAccountId.value = routeAccountId ?? store.account?.id ?? selectedAccountId.value
    }
  },
  { immediate: true },
)

watch(
  () => route.query.accountId,
  (value) => {
    const accountId = accountIdFromRoute(value)
    if (accountId === selectedAccountId.value) return
    selectedAccountId.value = accountId
    if (accountId || accountScopedTabs.has(activeTab.value) || activeTab.value === 'analytics') {
      void store.fetchOverview({ accountId })
    }
  },
)

watch(searchQuery, () => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    debouncedSearchQuery.value = searchQuery.value
  }, 350)
})

watch([catalogKind, filterCurrency, filterExchange, filterCountry], () => {
  catalogPage.value = 1
})

watch(catalogTotalPages, (pages) => {
  if (catalogPage.value > pages) catalogPage.value = pages
})

watch(eventsTotalPages, (pages) => {
  if (eventsPage.value > pages) eventsPage.value = pages
})

watch(instrumentEventsTotalPages, (pages) => {
  if (instrumentEventsPage.value > pages) instrumentEventsPage.value = pages
})
</script>

<template>
  <section class="demo-account">
    <header class="demo-account__topbar">
      <div>
        <h1>Брокерский счет</h1>
        <span>Демо-счет</span>
      </div>
      <nav class="demo-account__tabs" aria-label="Разделы демо-счета">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="{ 'demo-account__tab--active': activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <section v-if="store.isLoading && !store.overview" class="demo-account__loading-shell">
      <aside class="demo-account__sidebar">
        <Skeleton class="demo-account__skeleton-title" />
        <Skeleton v-for="item in 4" :key="item" class="demo-account__skeleton-account" />
      </aside>
      <div class="demo-account__main">
        <Skeleton class="demo-account__skeleton-hero" />
        <section class="demo-account__overview-stats">
          <Skeleton v-for="item in 4" :key="item" class="demo-account__skeleton-stat" />
        </section>
        <section class="demo-account__overview-grid">
          <Skeleton v-for="item in 3" :key="item" class="demo-account__skeleton-panel" />
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'overview'" class="demo-account__overview">
      <aside class="demo-account__sidebar">
        <h2>Брокерские счета</h2>
        <button
          type="button"
          class="demo-account__sidebar-total demo-account__sidebar-total--button"
          :class="{ 'demo-account__account-row--active': !isAccountSelected }"
          @click="selectAllAccounts"
        >
          <span>В рублях</span>
          <strong>{{ formatMoney(accountsTotalRub, 'RUB') }}</strong>
          <b :class="toneClass(accountsPnlRub)">
            {{ formatMoney(accountsPnlRub, 'RUB') }}
          </b>
          <small>Все демо-счета</small>
        </button>
        <button
          v-for="account in demoAccounts"
          :key="account.id"
          type="button"
          class="demo-account__account-row"
          :class="{ 'demo-account__account-row--active': selectedAccountId === account.id }"
          @click="selectAccount(account.id)"
        >
          <span class="demo-account__briefcase" />
          <div>
            <strong>{{ account.name }}</strong>
            <span>{{ formatMoney(account.totalRub, 'RUB') }}</span>
            <small :class="toneClass(account.pnlRub)">{{ formatMoney(account.pnlRub, 'RUB') }} результат</small>
          </div>
        </button>
        <button type="button" class="demo-account__new-account" @click="isNewAccountEditorOpen = !isNewAccountEditorOpen">
          + Открыть новый счет
        </button>
        <div v-if="isNewAccountEditorOpen" class="demo-account__account-inline-edit">
          <Label for="demo-new-account-name">Название</Label>
          <Input id="demo-new-account-name" v-model="newAccountDraft.name" />
          <Label for="demo-new-account-cash">Стартовый баланс</Label>
          <Input id="demo-new-account-cash" v-model.number="newAccountDraft.initialCash" type="number" min="0" step="100" />
          <div class="demo-account__editor-actions">
            <Button type="button" :disabled="store.isMutating" @click="createDemoAccount">Создать</Button>
            <Button type="button" variant="secondary" @click="isNewAccountEditorOpen = false">Скрыть</Button>
          </div>
        </div>
        <div v-if="isAccountEditorOpen && isAccountSelected" class="demo-account__account-inline-edit">
          <Label for="demo-account-name">Название</Label>
          <Input id="demo-account-name" v-model="accountDraft.name" />
          <Label for="demo-account-cash">Рублевый баланс</Label>
          <Input id="demo-account-cash" v-model.number="accountDraft.cashRub" type="number" min="0" step="100" />
          <div class="demo-account__editor-actions">
            <Button type="button" :disabled="store.isMutating" @click="saveAccountSettings">Сохранить</Button>
            <Button type="button" variant="secondary" @click="isAccountEditorOpen = false">Скрыть</Button>
          </div>
        </div>
      </aside>

      <div class="demo-account__main">
        <template v-if="!isAccountSelected">
          <section class="demo-account__accounts-summary">
            <article
              v-for="account in demoAccounts"
              :key="account.id"
              class="demo-account__account-card"
              role="button"
              tabindex="0"
              @click="selectAccount(account.id)"
              @keydown.enter="selectAccount(account.id)"
            >
              <span>Демо-счет</span>
              <strong>{{ account.name }}</strong>
              <b>{{ formatMoney(account.totalRub, 'RUB') }}</b>
              <small :class="toneClass(account.pnlRub)">
                {{ formatMoney(account.pnlRub, 'RUB') }} · {{ formatPercent(account.pnlPercent) }} результат
              </small>
            </article>
          </section>

          <section class="demo-account__chart-card demo-account__chart-card--summary">
            <div class="demo-account__value-head">
              <div>
                <span>Стоимость всех демо-счетов</span>
                <strong>{{ formatMoney(shownAccountsTotal, displayCurrency) }}</strong>
                <small>{{ displayCurrency === 'RUB' ? 'Суммарная оценка' : `1 ${displayCurrency} = ${formatMoney(displayRate ?? 0, 'RUB')}` }}</small>
              </div>
              <button type="button" class="demo-account__currency-toggle" @click="switchDisplayCurrency">
                <component :is="nextCurrencyIcon" class="demo-account__currency-icon" />
              </button>
            </div>
            <div class="demo-account__chart-range">
              <button
                v-for="range in portfolioChartRanges"
                :key="range.id"
                type="button"
                :class="{ 'demo-account__chart-range--active': portfolioChartRange === range.id }"
                @click="portfolioChartRange = range.id"
              >
                {{ range.label }}
              </button>
            </div>
            <div class="demo-account__bars">
              <div
                v-for="(bar, index) in portfolioBars"
                :key="`${bar.date}-${index}`"
                class="demo-account__bar-column"
                @mouseenter="hoveredPortfolioBarIndex = index"
                @mouseleave="hoveredPortfolioBarIndex = null"
              >
                <span
                  class="demo-account__bar"
                  :class="{ 'demo-account__bar--empty': bar.value <= 0 }"
                  :style="{ height: `${bar.height}%` }"
                />
                <small>{{ bar.label }}</small>
              </div>
              <div v-if="hoveredPortfolioBar" class="demo-account__portfolio-tooltip">
                <strong>{{ formatMoney(hoveredPortfolioBar.value, 'RUB') }}</strong>
                <span>{{ formatDate(hoveredPortfolioBar.date) }}</span>
              </div>
            </div>
          </section>

          <section class="demo-account__overview-stats">
            <article v-for="stat in accountsOverviewStats" :key="stat.label">
              <span>{{ stat.label }}</span>
              <strong :class="toneClass(stat.amount ?? 0)">
                {{ stat.value }}
              </strong>
              <small>{{ stat.sub }}</small>
            </article>
          </section>

          <section class="demo-account__overview-grid">
            <article class="demo-account__panel demo-account__panel--recent-events">
              <h2>Последние события</h2>
              <div class="demo-account__event-list demo-account__event-list--compact">
                <article v-for="event in events.slice(0, 5)" :key="event.id">
                  <span
                    class="demo-account__event-logo demo-account__instrument-logo"
                    :class="eventLogoClasses(event)"
                  >
                    <img
                      v-if="eventLogoUrl(event)"
                      :src="eventLogoUrl(event) ?? ''"
                      :alt="eventLogoAlt(event)"
                    />
                    <template v-else>{{ eventLogoText(event) }}</template>
                  </span>
                  <div>
                    <strong>{{ event.title }}</strong>
                    <span>{{ event.subtitle }}</span>
                  </div>
                  <div>
                    <b :class="toneClass(event.amount)">{{ formatMoney(event.amount, event.currency) }}</b>
                    <span>{{ formatDate(event.date) }}</span>
                  </div>
                </article>
              </div>
            </article>
            <article class="demo-account__panel">
              <h2>Движение рынка</h2>
              <div class="demo-account__movers">
                <button v-for="instrument in topMovers" :key="instrument.id" type="button" @click="openInstrument(instrument)">
                  <span>{{ instrument.symbol }}</span>
                  <strong>{{ priceText(instrument) }}</strong>
                  <b :class="toneClass(instrument.demo_price_cache?.change_percent)">
                    {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
                  </b>
                </button>
              </div>
            </article>
            <article class="demo-account__panel">
              <h2>Индексы и мировые активы</h2>
              <div class="demo-account__market-strip">
                <button
                  v-for="instrument in overviewMarketInstruments"
                  :key="instrument.id"
                  type="button"
                  @click="openInstrument(instrument)"
                >
                  <span>{{ instrument.name }}</span>
                  <strong>{{ instrument.symbol }}</strong>
                  <b :class="toneClass(instrument.demo_price_cache?.change_percent)">
                    {{ priceText(instrument) }} · {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
                  </b>
                </button>
              </div>
            </article>
          </section>
        </template>

        <template v-else>
        <div class="demo-account__search demo-account__search--dropdown">
          <Search class="demo-account__search-icon" />
          <Input
            v-model="searchQuery"
            placeholder="Название или тикер"
            @focus="isSearchFocused = true"
            @blur="onSearchBlur"
          />
          <button v-if="searchQuery" type="button" class="demo-account__search-clear" @mousedown.prevent @click="clearSearch">×</button>
          <div v-if="shouldShowSearchResults" class="demo-account__search-popover">
            <template v-if="searchResultGroups.length">
              <section v-for="group in searchResultGroups" :key="group.label">
                <h3>{{ group.label }}</h3>
                <button
                  v-for="instrument in group.instruments"
                  :key="instrument.id"
                  type="button"
                  @mousedown.prevent
                  @click="selectSearchResult(instrument)"
                >
                  <span
                    class="demo-account__instrument-logo"
                    :class="[instrumentTone(instrument), { 'demo-account__instrument-logo--image': instrumentLogoUrl(instrument) }]"
                  >
                    <img v-if="instrumentLogoUrl(instrument)" :src="instrumentLogoUrl(instrument) ?? ''" :alt="instrument.name" />
                    <template v-else>{{ instrumentInitials(instrument) }}</template>
                  </span>
                  <span>
                    <strong>{{ instrument.name }}</strong>
                    <small>{{ instrument.symbol }}</small>
                  </span>
                </button>
              </section>
            </template>
            <p v-else>Ничего не найдено</p>
          </div>
        </div>

        <section class="demo-account__hero">
          <div>
            <span>Стоимость портфеля</span>
            <div class="demo-account__hero-balance">
              <strong>{{ formatMoney(shownPortfolioTotal, displayCurrency) }}</strong>
              <button type="button" class="demo-account__currency-toggle" @click="switchDisplayCurrency">
                <component :is="nextCurrencyIcon" class="demo-account__currency-icon" />
              </button>
              <button type="button" class="demo-account__edit-button" aria-label="Редактировать счет" @click="toggleAccountEditor">
                <Pencil class="demo-account__button-icon" />
              </button>
            </div>
            <small>{{ displayCurrency === 'RUB' ? 'Базовая оценка в рублях' : `1 ${displayCurrency} = ${formatMoney(displayRate ?? 0, 'RUB')}` }}</small>
          </div>
          <div>
            <div class="demo-account__period-switch">
              <button type="button" :class="{ 'demo-account__period-switch--active': performancePeriod === 'today' }" @click="performancePeriod = 'today'">
                Сегодня
              </button>
              <button type="button" :class="{ 'demo-account__period-switch--active': performancePeriod === 'all' }" @click="performancePeriod = 'all'">
                За все время
              </button>
            </div>
            <strong :class="toneClass(performanceChangeRub)">{{ formatMoney(performanceChangeRub, 'RUB') }}</strong>
            <small :class="toneClass(performanceChangePercent)">{{ formatPercent(performanceChangePercent) }} · результат от цены покупки</small>
          </div>
        </section>

        <div v-if="isAccountEditorOpen" class="demo-account__inline-editor-bar">
          <div>
            <strong>Режим редактирования</strong>
            <span>Меняй баланс в списке слева, валюту и позиции прямо в строках ниже.</span>
            <label class="demo-account__name-edit">
              <span>Название счета</span>
              <Input v-model="accountDraft.name" />
            </label>
          </div>
          <div class="demo-account__editor-actions">
            <Button type="button" :disabled="store.isMutating" @click="saveAccountSettings">Сохранить</Button>
            <Button type="button" variant="secondary" @click="isAccountEditorOpen = false">Скрыть</Button>
          </div>
        </div>

        <section class="demo-account__overview-stats">
          <article v-for="stat in overviewStats" :key="stat.label">
            <span>{{ stat.label }}</span>
            <strong :class="stat.label === 'Результат' ? toneClass(portfolioPnlRub) : undefined">
              {{ stat.value }}
            </strong>
            <small>{{ stat.sub }}</small>
          </article>
        </section>

        <section class="demo-account__actions demo-account__actions--buttons">
          <button
            type="button"
            class="demo-account__action-button"
            :class="{ 'demo-account__action-button--active': openedAction === 'deposit' }"
            @click="openedAction = openedAction === 'deposit' ? null : 'deposit'"
          >
            <span>Пополнить счет</span>
            <strong>Разовое учебное пополнение</strong>
          </button>
          <button
            type="button"
            class="demo-account__action-button"
            :class="{ 'demo-account__action-button--active': openedAction === 'income' }"
            @click="openedAction = openedAction === 'income' ? null : 'income'"
          >
            <span>Автопополнение</span>
            <strong>Дата и сумма регулярного дохода</strong>
          </button>
        </section>

        <section v-if="openedAction" class="demo-account__action-drawer">
          <template v-if="openedAction === 'deposit'">
            <div>
              <span>Сумма пополнения</span>
              <strong>{{ formatMoney(depositAmount, 'RUB') }}</strong>
            </div>
            <div class="demo-account__inline-form">
              <Input v-model.number="depositAmount" type="number" min="1" step="100" />
              <Button :disabled="store.isMutating" @click="deposit">Пополнить</Button>
            </div>
          </template>
          <template v-else>
            <div>
              <span>Ежемесячное автопополнение</span>
              <strong>{{ formatMoney(salaryAmount, 'RUB') }}</strong>
            </div>
            <div class="demo-account__income-form">
              <Input v-model.number="salaryAmount" type="number" min="1" step="100" />
              <Input v-model="salaryDate" type="date" />
              <Button variant="secondary" :disabled="store.isMutating" @click="createSalaryRule">Включить</Button>
            </div>
          </template>
        </section>

        <section class="demo-account__panel">
          <div class="demo-account__panel-head">
            <h2>Активы в портфеле</h2>
            <span v-if="isAccountEditorOpen">Можно убрать часть позиции или всю позицию целиком.</span>
          </div>
          <div v-if="portfolioPositions.length" class="demo-account__position-list">
            <article
              v-for="position in portfolioPositions"
              :key="position.instrument_id"
              class="demo-account__position-row"
              :class="{ 'demo-account__position-row--editing': isAccountEditorOpen }"
            >
              <button type="button" class="demo-account__position-main" @click="openInstrument(position.demo_instruments)">
                <span
                  class="demo-account__instrument-logo"
                  :class="[instrumentTone(position.demo_instruments), { 'demo-account__instrument-logo--image': instrumentLogoUrl(position.demo_instruments) }]"
                >
                  <img
                    v-if="instrumentLogoUrl(position.demo_instruments)"
                    :src="instrumentLogoUrl(position.demo_instruments) ?? ''"
                    :alt="position.demo_instruments.name"
                  />
                  <template v-else>{{ instrumentInitials(position.demo_instruments) }}</template>
                </span>
                <div>
                  <strong>{{ position.demo_instruments.name }}</strong>
                  <span>{{ position.demo_instruments.symbol }}</span>
                  <small>{{ formatQuantity(position.quantity) }} {{ tradeUnit(position.demo_instruments) }}</small>
                </div>
                <div>
                  <strong>{{ formatMoney(position.marketValueRub, 'RUB') }}</strong>
                  <span :class="toneClass(positionPerformanceRub(position))">
                    {{ formatMoney(positionPerformanceRub(position), 'RUB') }} · {{ formatPercent(positionPerformancePercent(position)) }}
                  </span>
                  <small>с момента покупки</small>
                </div>
              </button>
              <div v-if="isAccountEditorOpen" class="demo-account__position-edit">
                <Input
                  v-model.number="positionRemovalDrafts[position.instrument_id]"
                  type="number"
                  min="0"
                  :max="positionDrafts[position.instrument_id]?.quantity ?? position.quantity"
                  step="1"
                  placeholder="Кол-во"
                />
                <Button type="button" variant="secondary" @click="removePositionQuantity(position)">Убрать</Button>
                <Button type="button" variant="secondary" @click="removeFullPosition(position)">Все</Button>
              </div>
            </article>
          </div>
          <div v-else class="demo-account__empty-state">
            <strong>Портфель пока пуст</strong>
            <span>Открой каталог и купи первый актив за демо-деньги.</span>
          </div>
        </section>

        <section class="demo-account__panel">
          <div class="demo-account__panel-head">
            <h2>Валюта на счете</h2>
            <span v-if="isAccountEditorOpen">Балансы редактируются без обмена, только как учебная корректировка.</span>
          </div>
          <div class="demo-account__currency-list">
            <article
              v-for="row in currencyBalanceRows"
              :key="row.currency"
              class="demo-account__currency-row"
              :class="{ 'demo-account__currency-row--editing': isAccountEditorOpen && row.currency !== 'RUB' }"
            >
              <button type="button" @click="row.instrument ? openInstrument(row.instrument) : undefined">
                <span class="demo-account__instrument-logo demo-account__logo--fx demo-account__instrument-logo--image">
                  <img :src="currencyIconUrl(row.currency)" :alt="row.currency" />
                </span>
                <div>
                  <strong>{{ row.title }}</strong>
                  <span>{{ row.symbol }}</span>
                </div>
                <div>
                  <strong>{{ formatMoney(row.amount, row.currency) }}</strong>
                  <span>{{ row.currency === 'RUB' ? 'базовая валюта' : `≈ ${formatMoney(row.rubValue, 'RUB')}` }}</span>
                </div>
                <div>
                  <strong>{{ row.rate ? formatMoney(row.rate, 'RUB') : '—' }}</strong>
                  <span>курс</span>
                </div>
              </button>
              <Input
                v-if="isAccountEditorOpen && row.currency !== 'RUB'"
                v-model.number="accountCashDrafts[row.currency]"
                type="number"
                min="0"
                step="100"
                class="demo-account__currency-edit"
              />
            </article>
          </div>
        </section>

        <section class="demo-account__chart-card">
          <div class="demo-account__value-head">
            <div>
              <span>Стоимость портфеля</span>
              <strong>{{ formatMoney(shownPortfolioTotal, displayCurrency) }}</strong>
              <small>{{ portfolioChartRanges.find((range) => range.id === portfolioChartRange)?.label }}</small>
            </div>
            <div class="demo-account__chart-range">
              <button
                v-for="range in portfolioChartRanges"
                :key="range.id"
                type="button"
                :class="{ 'demo-account__chart-range--active': portfolioChartRange === range.id }"
                @click="portfolioChartRange = range.id"
              >
                {{ range.label }}
              </button>
            </div>
          </div>
          <div class="demo-account__bars">
            <div
              v-for="(bar, index) in portfolioBars"
              :key="`${bar.date}-${index}`"
              class="demo-account__bar-column"
              @mouseenter="hoveredPortfolioBarIndex = index"
              @mouseleave="hoveredPortfolioBarIndex = null"
            >
              <span
                class="demo-account__bar"
                :class="{ 'demo-account__bar--empty': bar.value <= 0 }"
                :style="{ height: `${bar.height}%` }"
              />
              <small>{{ bar.label }}</small>
            </div>
            <div v-if="hoveredPortfolioBar" class="demo-account__portfolio-tooltip">
              <strong>{{ formatMoney(hoveredPortfolioBar.value, 'RUB') }}</strong>
              <span>{{ formatDate(hoveredPortfolioBar.date) }}</span>
            </div>
          </div>
        </section>

        <section class="demo-account__overview-grid">
          <article class="demo-account__panel demo-account__panel--recent-events">
            <h2>Последние события</h2>
            <div class="demo-account__event-list demo-account__event-list--compact">
              <article v-for="event in events.slice(0, 4)" :key="event.id">
                  <span
                    class="demo-account__event-logo demo-account__instrument-logo"
                    :class="eventLogoClasses(event)"
                  >
                    <img
                      v-if="eventLogoUrl(event)"
                      :src="eventLogoUrl(event) ?? ''"
                      :alt="eventLogoAlt(event)"
                    />
                    <template v-else>{{ eventLogoText(event) }}</template>
                  </span>
                <div>
                  <strong>{{ event.title }}</strong>
                  <span>{{ event.subtitle }}</span>
                </div>
                <div>
                  <b :class="toneClass(event.amount)">{{ formatMoney(event.amount, event.currency) }}</b>
                  <span>{{ formatDate(event.date) }}</span>
                </div>
              </article>
            </div>
          </article>
          <article class="demo-account__panel">
            <h2>Движение рынка</h2>
            <div class="demo-account__movers">
              <button v-for="instrument in topMovers" :key="instrument.id" type="button" @click="openInstrument(instrument)">
                <span>{{ instrument.symbol }}</span>
                <strong>{{ priceText(instrument) }}</strong>
                <b :class="toneClass(instrument.demo_price_cache?.change_percent)">
                  {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
                </b>
              </button>
            </div>
          </article>
          <article class="demo-account__panel">
            <h2>Индексы и мировые активы</h2>
            <div class="demo-account__market-strip">
              <button
                v-for="instrument in overviewMarketInstruments"
                :key="instrument.id"
                type="button"
                @click="openInstrument(instrument)"
              >
                <span>{{ instrument.name }}</span>
                <strong>{{ instrument.symbol }}</strong>
                <b :class="toneClass(instrument.demo_price_cache?.change_percent)">
                  {{ priceText(instrument) }} · {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
                </b>
              </button>
            </div>
          </article>
        </section>
        </template>
      </div>
    </section>

    <section v-if="accountScopedTabs.has(activeTab) && workspaceAccount" class="demo-account__workspace-bar">
      <div>
        <span>Текущий демо-счет</span>
        <strong>{{ workspaceAccount.name }}</strong>
        <small>{{ formatMoney(workspaceAccount.totalRub, 'RUB') }} · {{ formatMoney(workspaceAccount.pnlRub, 'RUB') }} результат</small>
      </div>
      <select
        class="demo-account__select demo-account__account-select"
        :value="workspaceAccount.id"
        @change="onWorkspaceAccountChange"
      >
        <option v-for="account in demoAccounts" :key="account.id" :value="account.id">
          {{ account.name }}
        </option>
      </select>
    </section>

    <section v-if="activeTab === 'catalog'" class="demo-account__catalog">
      <div v-if="!selectedInstrumentDetails" class="demo-account__search demo-account__search--wide demo-account__search--dropdown">
        <Search class="demo-account__search-icon" />
        <Input
          v-model="searchQuery"
          placeholder="Название или тикер"
          @focus="isSearchFocused = true"
          @blur="onSearchBlur"
        />
        <button v-if="searchQuery" type="button" class="demo-account__search-clear" @mousedown.prevent @click="clearSearch">×</button>
        <div v-if="shouldShowSearchResults" class="demo-account__search-popover">
          <template v-if="searchResultGroups.length">
            <section v-for="group in searchResultGroups" :key="group.label">
              <h3>{{ group.label }}</h3>
              <button
                v-for="instrument in group.instruments"
                :key="instrument.id"
                type="button"
                @mousedown.prevent
                @click="selectSearchResult(instrument)"
              >
                <span
                  class="demo-account__instrument-logo"
                  :class="[instrumentTone(instrument), { 'demo-account__instrument-logo--image': instrumentLogoUrl(instrument) }]"
                >
                  <img v-if="instrumentLogoUrl(instrument)" :src="instrumentLogoUrl(instrument) ?? ''" :alt="instrument.name" />
                  <template v-else>{{ instrumentInitials(instrument) }}</template>
                </span>
                <span>
                  <strong>{{ instrument.name }}</strong>
                  <small>{{ instrument.symbol }}</small>
                </span>
              </button>
            </section>
          </template>
          <p v-else>Ничего не найдено</p>
        </div>
      </div>

      <nav v-if="!selectedInstrumentDetails" class="demo-account__catalog-tabs" aria-label="Категории каталога">
        <button
          v-for="kind in catalogKinds"
          :key="kind.id"
          type="button"
          :class="{ 'demo-account__catalog-tab--active': catalogKind === kind.id }"
          @click="catalogKind = kind.id"
        >
          {{ kind.label }}
        </button>
      </nav>

      <h2 v-if="!selectedInstrumentDetails">Каталог {{ catalogKind === 'stock' ? 'акций' : 'инструментов' }}</h2>

      <div v-if="!selectedInstrumentDetails" class="demo-account__filters">
        <select v-model="filterCurrency" class="demo-account__select">
          <option value="all">Валюта</option>
          <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
        </select>
        <select v-model="filterCountry" class="demo-account__select">
          <option value="all">Страна</option>
          <option value="RU">Россия</option>
          <option value="US">США</option>
          <option value="EU">Европа</option>
          <option value="CN">Китай</option>
          <option value="CRYPTO">Крипто</option>
        </select>
        <select v-model="filterExchange" class="demo-account__select">
          <option value="all">Биржа</option>
          <option v-for="exchange in exchanges" :key="exchange" :value="exchange">{{ exchange }}</option>
        </select>
        <Button variant="outline" :disabled="store.isMutating" @click="refreshQuotes">Обновить котировки</Button>
      </div>

      <div v-if="selectedInstrumentDetails" class="demo-account__instrument-page">
        <button type="button" class="demo-account__back-button" @click="closeInstrument">Назад к каталогу</button>
        <div class="demo-account__instrument-hero">
          <div class="demo-account__instrument-title">
            <button
              type="button"
              class="demo-account__favorite-button demo-account__favorite-button--hero"
              :class="{ 'demo-account__favorite-button--active': isInstrumentFavorite(selectedInstrumentDetails.instrument) }"
              :aria-label="isInstrumentFavorite(selectedInstrumentDetails.instrument) ? 'Убрать из избранного' : 'Добавить в избранное'"
              @click="toggleFavorite(selectedInstrumentDetails.instrument)"
            >
              <Star class="demo-account__favorite-icon" />
            </button>
            <span
              class="demo-account__instrument-logo demo-account__instrument-logo--large"
              :class="[instrumentTone(selectedInstrumentDetails.instrument), { 'demo-account__instrument-logo--image': instrumentLogoUrl(selectedInstrumentDetails.instrument) }]"
            >
              <img
                v-if="instrumentLogoUrl(selectedInstrumentDetails.instrument)"
                :src="instrumentLogoUrl(selectedInstrumentDetails.instrument) ?? ''"
                :alt="selectedInstrumentDetails.instrument.name"
              />
              <template v-else>{{ instrumentInitials(selectedInstrumentDetails.instrument) }}</template>
            </span>
            <div>
              <span>{{ selectedInstrumentDetails.instrument.exchange }} · {{ selectedInstrumentDetails.instrument.asset_type }}</span>
              <h2>{{ selectedInstrumentDetails.instrument.name }}</h2>
              <p>{{ selectedInstrumentDetails.instrument.symbol }} · валюта инструмента {{ selectedInstrumentDetails.instrument.currency }}</p>
            </div>
          </div>
          <div>
            <strong>
              {{
                selectedInstrumentDetails.instrument.demo_price_cache
                  ? priceText(selectedInstrumentDetails.instrument)
                  : 'Нет цены'
              }}
            </strong>
            <span :class="toneClass(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent)">
              {{ formatPercent(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent ?? null) }}
            </span>
          </div>
        </div>

        <nav class="demo-account__instrument-nav" aria-label="Разделы инструмента">
          <button
            v-for="section in instrumentSections"
            :key="section.id"
            type="button"
            :class="{ 'demo-account__instrument-tab--active': activeInstrumentSection === section.id }"
            @click="activeInstrumentSection = section.id"
          >
            {{ instrumentSectionLabel(section) }}
          </button>
        </nav>

        <div v-if="store.isDetailsLoading" class="demo-account__details-grid">
          <Skeleton class="demo-account__skeleton-chart" />
          <Skeleton class="demo-account__skeleton-order" />
        </div>

        <div v-else-if="activeInstrumentSection === 'chart'" class="demo-account__details-grid">
          <div class="demo-account__chart-column">
          <article id="demo-chart" class="demo-account__chart-panel">
            <div class="demo-account__section-title">
              <div>
                <h2>График цены</h2>
                <span>{{ chartMode === 'candles' ? 'Свечной график' : 'Линия закрытия' }}</span>
              </div>
              <div class="demo-account__chart-controls">
                <button
                  v-for="period in chartPeriods"
                  :key="period.id"
                  type="button"
                  :class="{ 'demo-account__chart-control--active': chartPeriod === period.id }"
                  @click="changeChartPeriod(period.id)"
                >
                  {{ period.label }}
                </button>
                <button
                  type="button"
                  :class="{ 'demo-account__chart-control--active': chartMode === 'line' }"
                  @click="chartMode = 'line'"
                >
                  Линия
                </button>
                <button
                  type="button"
                  :class="{ 'demo-account__chart-control--active': chartMode === 'candles' }"
                  @click="chartMode = 'candles'"
                >
                  Свечи
                </button>
              </div>
            </div>
            <div v-if="chartCandles.length" class="demo-account__chart-wrap">
              <svg
                class="demo-account__price-chart"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                tabindex="-1"
                @click.prevent
                @mousemove="handleChartPointerMove"
                @mouseleave="hoveredCandleIndex = null"
              >
                <rect class="demo-account__chart-hit-area" x="0" y="0" width="100" height="100" />
                <line
                  v-if="lastCandle && chartLastPriceY !== null"
                  class="demo-account__chart-last-line"
                  x1="0"
                  x2="100"
                  :y1="chartLastPriceY"
                  :y2="chartLastPriceY"
                />
                <line
                  v-if="hoveredCandle"
                  class="demo-account__chart-crosshair"
                  :x1="hoveredCandle.x"
                  :x2="hoveredCandle.x"
                  y1="0"
                  y2="100"
                />
                <polyline
                  v-if="chartMode === 'line'"
                  :points="chartPolyline"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.8"
                  vector-effect="non-scaling-stroke"
                />
                <g v-else>
                  <g
                    v-for="view in candleViews"
                    :key="`${view.candle.begin}-${view.index}`"
                    class="demo-account__candle"
                    :class="{ 'demo-account__candle--positive': view.positive }"
                  >
                    <line :x1="view.x" :x2="view.x" :y1="view.highY" :y2="view.lowY" />
                    <rect
                      :x="view.x - view.width / 2"
                      :y="view.bodyY"
                      :width="view.width"
                      :height="view.bodyHeight"
                      rx="0.35"
                    />
                  </g>
                </g>
              </svg>
              <span
                v-if="lastCandle"
                class="demo-account__last-price-badge"
                :style="chartLastPriceStyle"
              >
                {{ formatMoney(lastCandle.close, selectedInstrumentDetails.instrument.currency) }}
              </span>
              <div v-if="hoveredCandle" class="demo-account__chart-tooltip" :style="chartTooltipStyle">
                <strong>{{ formatDate(hoveredCandle.candle.begin) }}</strong>
                <span>Открытие: {{ formatMoney(hoveredCandle.candle.open, selectedInstrumentDetails.instrument.currency) }}</span>
                <span>Максимум: {{ formatMoney(hoveredCandle.candle.high, selectedInstrumentDetails.instrument.currency) }}</span>
                <span>Минимум: {{ formatMoney(hoveredCandle.candle.low, selectedInstrumentDetails.instrument.currency) }}</span>
                <span>Закрытие: {{ formatMoney(hoveredCandle.candle.close, selectedInstrumentDetails.instrument.currency) }}</span>
                <span>
                  Изм.: <b :class="toneClass(candleChange(hoveredCandle.candle))">{{ candleChangeText(hoveredCandle.candle) }}</b>
                </span>
                <span v-if="hoveredCandle.candle.volume !== null">Объем: {{ formatQuantity(hoveredCandle.candle.volume) }}</span>
              </div>
            </div>
            <p v-else class="demo-account__muted">История появится после обновления котировок.</p>
          </article>

          <article class="demo-account__instrument-about-card">
            <div>
              <h2>{{ selectedInstrumentDetails.instrument.asset_type === 'stock' ? `О компании ${selectedInstrumentDetails.instrument.name}` : `Об активе ${selectedInstrumentDetails.instrument.name}` }}</h2>
              <p>{{ selectedInstrumentDetails.instrument.description }}</p>
            </div>
            <dl>
              <div>
                <span>Страна</span>
                <strong>{{ instrumentCountry(selectedInstrumentDetails.instrument) }}</strong>
              </div>
              <div>
                <span>Биржа</span>
                <strong>{{ selectedInstrumentDetails.instrument.exchange ?? '—' }}</strong>
              </div>
              <div>
                <span>Сектор</span>
                <strong>{{ selectedInstrumentDetails.instrument.sector ?? '—' }}</strong>
              </div>
            </dl>
          </article>
          </div>

          <article id="demo-order" class="demo-account__order-panel">
            <div class="demo-account__order-head">
              <span>{{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? 'Курс' : 'Цена' }}</span>
              <strong>
                {{
                  selectedInstrumentDetails.instrument.demo_price_cache
                    ? priceText(selectedInstrumentDetails.instrument)
                    : '—'
                }}
              </strong>
              <b :class="toneClass(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent)">
                {{ formatPercent(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent ?? null) }}
              </b>
            </div>

            <div class="demo-account__order-switch">
              <button type="button" :class="{ 'demo-account__order-switch--active': orderSide === 'buy' }" @click="orderSide = 'buy'">
                Купить
              </button>
              <button type="button" :class="{ 'demo-account__order-switch--active': orderSide === 'sell' }" @click="orderSide = 'sell'">
                Продать
              </button>
            </div>

            <div class="demo-account__order-switch demo-account__order-switch--type">
              <button type="button" :class="{ 'demo-account__order-switch--active': orderType === 'market' }" @click="orderType = 'market'">
                Лучшая цена
              </button>
              <button type="button" :class="{ 'demo-account__order-switch--active': orderType === 'limit' }" @click="orderType = 'limit'">
                Лимитная
              </button>
            </div>

            <div class="demo-account__order-meta">
              <span>Доступно</span>
              <strong>
                {{ formatQuantity(selectedAvailableQuantity) }}
                {{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? currencyFromPair(selectedInstrumentDetails.instrument.symbol) : 'шт.' }}
              </strong>
            </div>

            <Label :for="`buy-detail-${selectedInstrumentDetails.instrument.id}`">
              Количество лотов
            </Label>
            <Input
              v-if="orderSide === 'buy'"
              :id="`buy-detail-${selectedInstrumentDetails.instrument.id}`"
              v-model.number="buyQuantities[selectedInstrumentDetails.instrument.id]"
              type="number"
              min="1"
              step="1"
              @blur="buyQuantities[selectedInstrumentDetails.instrument.id] = orderQuantityFor(selectedInstrumentDetails.instrument)"
            />
            <Input
              v-else
              :id="`buy-detail-${selectedInstrumentDetails.instrument.id}`"
              v-model.number="sellQuantities[selectedInstrumentDetails.instrument.id]"
              type="number"
              min="1"
              step="1"
              @blur="sellQuantities[selectedInstrumentDetails.instrument.id] = orderQuantityFor(selectedInstrumentDetails.instrument)"
            />
            <p class="demo-account__muted">1 лот = {{ instrumentLotSize(selectedInstrumentDetails.instrument) }} {{ tradeUnit(selectedInstrumentDetails.instrument) }}</p>

            <template v-if="orderType === 'limit'">
              <Label :for="`limit-detail-${selectedInstrumentDetails.instrument.id}`">Лимитная цена</Label>
              <Input
                :id="`limit-detail-${selectedInstrumentDetails.instrument.id}`"
                v-model.number="limitPrices[selectedInstrumentDetails.instrument.id]"
                type="number"
                min="0.000001"
                step="0.01"
              />
            </template>

            <div class="demo-account__order-total">
              <span>Сделка</span>
              <strong>{{ formatMoney(selectedOrderGross, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
              <span>Комиссия 0,3%</span>
              <strong>{{ formatMoney(selectedOrderCommission, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
              <span>{{ orderSide === 'buy' ? 'К списанию' : 'К получению' }}</span>
              <strong>{{ formatMoney(selectedOrderTotal, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
            </div>

            <div v-if="!hasEnoughSettlementCurrency" class="demo-account__order-notice demo-account__order-notice--info">
              Для покупки нужна валюта {{ selectedSettlementCurrency }}.
              <button v-if="selectedCurrencyInstrument" type="button" @click="openInstrument(selectedCurrencyInstrument)">
                Купить {{ selectedSettlementCurrency }}
              </button>
            </div>

            <div
              v-if="orderNotice"
              class="demo-account__order-notice"
              :class="`demo-account__order-notice--${orderNotice.tone}`"
            >
              {{ orderNotice.text }}
            </div>

            <Button
              :disabled="isOrderDisabled(selectedInstrumentDetails.instrument)"
              @click="submitInstrumentOrder(selectedInstrumentDetails.instrument)"
            >
              {{ store.isMutating ? 'Исполняем...' : orderSide === 'buy' ? 'Купить' : 'Продать' }}
            </Button>
          </article>

        </div>

        <div v-else-if="activeInstrumentSection === 'order'" class="demo-account__details-grid demo-account__details-grid--order">
          <article class="demo-account__order-panel">
            <div class="demo-account__order-head">
              <span>{{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? 'Курс' : 'Цена' }}</span>
              <strong>
                {{
                  selectedInstrumentDetails.instrument.demo_price_cache
                    ? priceText(selectedInstrumentDetails.instrument)
                    : '—'
                }}
              </strong>
              <b :class="toneClass(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent)">
                {{ formatPercent(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent ?? null) }}
              </b>
            </div>

            <div class="demo-account__order-switch">
              <button type="button" :class="{ 'demo-account__order-switch--active': orderSide === 'buy' }" @click="orderSide = 'buy'">
                Купить
              </button>
              <button type="button" :class="{ 'demo-account__order-switch--active': orderSide === 'sell' }" @click="orderSide = 'sell'">
                Продать
              </button>
            </div>

            <div class="demo-account__order-switch demo-account__order-switch--type">
              <button type="button" :class="{ 'demo-account__order-switch--active': orderType === 'market' }" @click="orderType = 'market'">
                Лучшая цена
              </button>
              <button type="button" :class="{ 'demo-account__order-switch--active': orderType === 'limit' }" @click="orderType = 'limit'">
                Лимитная
              </button>
            </div>

            <div class="demo-account__order-meta">
              <span>В позиции</span>
              <strong>
                {{ formatQuantity(selectedAvailableQuantity) }}
                {{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? currencyFromPair(selectedInstrumentDetails.instrument.symbol) : 'шт.' }}
              </strong>
            </div>

            <Label :for="`order-detail-${selectedInstrumentDetails.instrument.id}`">
              Количество лотов
            </Label>
            <Input
              v-if="orderSide === 'buy'"
              :id="`order-detail-${selectedInstrumentDetails.instrument.id}`"
              v-model.number="buyQuantities[selectedInstrumentDetails.instrument.id]"
              type="number"
              min="1"
              step="1"
              @blur="buyQuantities[selectedInstrumentDetails.instrument.id] = orderQuantityFor(selectedInstrumentDetails.instrument)"
            />
            <Input
              v-else
              :id="`order-detail-${selectedInstrumentDetails.instrument.id}`"
              v-model.number="sellQuantities[selectedInstrumentDetails.instrument.id]"
              type="number"
              min="1"
              step="1"
              @blur="sellQuantities[selectedInstrumentDetails.instrument.id] = orderQuantityFor(selectedInstrumentDetails.instrument)"
            />
            <p class="demo-account__muted">1 лот = {{ instrumentLotSize(selectedInstrumentDetails.instrument) }} {{ tradeUnit(selectedInstrumentDetails.instrument) }}</p>

            <template v-if="orderType === 'limit'">
              <Label :for="`order-limit-${selectedInstrumentDetails.instrument.id}`">Лимитная цена</Label>
              <Input
                :id="`order-limit-${selectedInstrumentDetails.instrument.id}`"
                v-model.number="limitPrices[selectedInstrumentDetails.instrument.id]"
                type="number"
                min="0.000001"
                step="0.01"
              />
            </template>

            <div class="demo-account__order-total">
              <span>Сделка</span>
              <strong>{{ formatMoney(selectedOrderGross, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
              <span>Комиссия 0,3%</span>
              <strong>{{ formatMoney(selectedOrderCommission, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
              <span>{{ orderSide === 'buy' ? 'К списанию' : 'К получению' }}</span>
              <strong>{{ formatMoney(selectedOrderTotal, settlementCurrency(selectedInstrumentDetails.instrument)) }}</strong>
            </div>

            <div v-if="!hasEnoughSettlementCurrency" class="demo-account__order-notice demo-account__order-notice--info">
              Для покупки нужна валюта {{ selectedSettlementCurrency }}.
              <button v-if="selectedCurrencyInstrument" type="button" @click="openInstrument(selectedCurrencyInstrument)">
                Купить {{ selectedSettlementCurrency }}
              </button>
            </div>

            <div
              v-if="orderNotice"
              class="demo-account__order-notice"
              :class="`demo-account__order-notice--${orderNotice.tone}`"
            >
              {{ orderNotice.text }}
            </div>

            <Button
              :disabled="isOrderDisabled(selectedInstrumentDetails.instrument)"
              @click="submitInstrumentOrder(selectedInstrumentDetails.instrument)"
            >
              {{ store.isMutating ? 'Исполняем...' : orderSide === 'buy' ? 'Купить' : 'Продать' }}
            </Button>
          </article>

          <article class="demo-account__about-panel">
            <h2>Позиция и деньги</h2>
            <div class="demo-account__facts">
              <span>Доступно для покупки</span>
              <strong>{{ formatMoney(selectedCashAvailable, selectedSettlementCurrency) }}</strong>
              <span>В позиции</span>
              <strong>
                {{ formatQuantity(selectedAvailableQuantity) }}
                {{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? currencyFromPair(selectedInstrumentDetails.instrument.symbol) : 'шт.' }}
              </strong>
              <span>Средняя цена</span>
              <strong>{{ selectedPosition ? formatMoney(selectedPosition.avg_price, selectedInstrumentDetails.instrument.currency) : '—' }}</strong>
              <span>Результат позиции</span>
              <strong :class="toneClass(selectedPosition?.unrealizedPnlRub)">
                {{ selectedPosition ? formatMoney(selectedPosition.unrealizedPnlRub, 'RUB') : '—' }}
              </strong>
            </div>
          </article>
        </div>

        <div v-if="activeInstrumentSection === 'metrics'" id="demo-metrics" class="demo-account__metrics-section">
          <div class="demo-account__stats-grid">
          <article>
            <span>Максимум периода</span>
            <strong>{{ selectedInstrumentDetails.stats.high ? formatMoney(selectedInstrumentDetails.stats.high, selectedInstrumentDetails.instrument.currency) : '—' }}</strong>
          </article>
          <article>
            <span>Минимум периода</span>
            <strong>{{ selectedInstrumentDetails.stats.low ? formatMoney(selectedInstrumentDetails.stats.low, selectedInstrumentDetails.instrument.currency) : '—' }}</strong>
          </article>
          <article>
            <span>За период</span>
            <strong :class="toneClass(selectedInstrumentDetails.stats.periodChangePercent)">
              {{ selectedInstrumentDetails.stats.periodChangePercent === null ? '—' : `${selectedInstrumentDetails.stats.periodChangePercent.toFixed(2)}%` }}
            </strong>
          </article>
          <article>
            <span>Последнее закрытие</span>
            <strong>{{ lastCandle ? formatMoney(lastCandle.close, selectedInstrumentDetails.instrument.currency) : '—' }}</strong>
          </article>
          <article>
            <span>Объем за период</span>
            <strong>{{ periodVolume ? formatQuantity(periodVolume) : '—' }}</strong>
          </article>
          <article>
            <span>Доступно для сделки</span>
            <strong>{{ formatMoney(selectedCashAvailable, selectedSettlementCurrency) }}</strong>
          </article>
        </div>

          <article
            v-for="group in keyMetricGroups"
            :key="group.section"
            class="demo-account__about-panel demo-account__about-panel--wide"
          >
            <h2>{{ group.section }}</h2>
            <div class="demo-account__facts">
              <template v-for="metric in group.items" :key="metric.id">
                <span>{{ metric.label }}</span>
                <strong>
                  {{ metric.value }}
                  <small v-if="metric.hint">{{ metric.hint }}</small>
                </strong>
              </template>
            </div>
          </article>

          <article v-if="keyMetricGroups.length === 0" class="demo-account__about-panel demo-account__about-panel--wide">
            <h2>Показатели компании</h2>
            <p class="demo-account__muted">Показатели пока не заполнены.</p>
          </article>
        </div>

        <div v-if="activeInstrumentSection === 'dividends'" class="demo-account__instrument-info-grid">
          <article v-if="isSelectedBond" class="demo-account__about-panel demo-account__about-panel--wide demo-account__coupon-panel">
            <p class="demo-account__coupon-note">
              Купон — это регулярная выплата владельцу облигации. Если продать облигацию до ближайшей выплаты,
              покупатель компенсирует накопленный купонный доход в цене сделки.
            </p>
            <h2>Выплаты купонов</h2>
            <div class="demo-account__coupon-summary">
              <div>
                <span>Ближайшая выплата</span>
                <strong>{{ nextCoupon ? formatDate(nextCoupon.record_date) : '—' }}</strong>
              </div>
              <div>
                <span>Выплачено купонов</span>
                <strong>{{ paidCouponCount }} из {{ couponRows.length }}</strong>
              </div>
              <div>
                <span>Доходность</span>
                <strong>{{ bondYieldText }}</strong>
              </div>
            </div>
            <h2>График выплат</h2>
            <div v-if="couponRows.length" class="demo-account__coupon-table">
              <div class="demo-account__coupon-head">
                <span>Дата</span>
                <span>Купон</span>
                <span>Ставка</span>
              </div>
              <div
                v-for="coupon in couponRows"
                :key="coupon.id"
                class="demo-account__coupon-row"
                :class="{ 'demo-account__coupon-row--next': nextCoupon?.id === coupon.id }"
              >
                <span>
                  {{ formatDate(coupon.record_date) }}
                  <small v-if="nextCoupon?.id === coupon.id">Ближайшая выплата</small>
                </span>
                <strong>{{ formatMoney(coupon.amount, coupon.currency) }}</strong>
                <strong>{{ coupon.yield_percent === null ? '—' : `${toFiniteNumber(coupon.yield_percent).toFixed(2)}%` }}</strong>
              </div>
            </div>
            <p v-else class="demo-account__muted">График купонов пока не заполнен.</p>
          </article>

          <article v-else class="demo-account__about-panel demo-account__about-panel--wide">
            <h2>История дивидендов</h2>
            <div v-if="dividendRows.length" class="demo-account__dividend-table">
              <div class="demo-account__dividend-head">
                <span>Дата</span>
                <span>Выплата на акцию</span>
                <span>Доходность</span>
                <span>Период</span>
              </div>
              <div v-for="dividend in dividendRows" :key="dividend.id" class="demo-account__dividend-row">
                <span>{{ formatDate(dividend.record_date) }}</span>
                <strong>{{ formatMoney(dividend.amount, dividend.currency) }}</strong>
                <strong>{{ dividend.yield_percent === null ? '—' : `${toFiniteNumber(dividend.yield_percent).toFixed(2)}%` }}</strong>
                <span>{{ dividend.period ?? '—' }}</span>
              </div>
            </div>
            <p v-else class="demo-account__muted">История дивидендов пока не заполнена.</p>
          </article>
        </div>

        <div v-if="activeInstrumentSection === 'events'" class="demo-account__instrument-info-grid">
          <article class="demo-account__about-panel demo-account__about-panel--wide">
            <h2>События по активу</h2>
            <div v-if="selectedInstrumentEvents.length" class="demo-account__event-list">
              <article v-for="event in paginatedInstrumentEvents" :key="event.id">
                  <span
                    class="demo-account__event-logo demo-account__instrument-logo"
                    :class="eventLogoClasses(event)"
                  >
                    <img
                      v-if="eventLogoUrl(event)"
                      :src="eventLogoUrl(event) ?? ''"
                      :alt="eventLogoAlt(event)"
                    />
                    <template v-else>{{ eventLogoText(event) }}</template>
                  </span>
                <div>
                  <strong>{{ event.title }}</strong>
                  <span>{{ event.subtitle }}</span>
                </div>
                <div>
                  <b :class="toneClass(event.amount)">{{ formatMoney(event.amount, event.currency) }}</b>
                  <span>{{ formatDate(event.date) }}</span>
                </div>
              </article>
            </div>
            <div v-if="instrumentEventsTotalPages > 1" class="demo-account__pagination">
              <span>{{ instrumentEventsPage }} / {{ instrumentEventsTotalPages }}</span>
              <div>
                <Button variant="secondary" :disabled="instrumentEventsPage <= 1" @click="instrumentEventsPage -= 1">Назад</Button>
                <Button variant="secondary" :disabled="instrumentEventsPage >= instrumentEventsTotalPages" @click="instrumentEventsPage += 1">Вперед</Button>
              </div>
            </div>
            <p v-if="selectedInstrumentEvents.length === 0" class="demo-account__muted">По этому активу пока не было покупок или продаж.</p>
          </article>
        </div>

        <div v-if="activeInstrumentSection === 'about' || activeInstrumentSection === 'data'" class="demo-account__instrument-info-grid">
          <article v-if="activeInstrumentSection === 'about'" id="demo-about" class="demo-account__about-panel demo-account__about-panel--wide">
            <h2>О инструменте</h2>
            <p>{{ selectedInstrumentDetails.instrument.description }}</p>
            <div class="demo-account__facts">
              <span>Страна</span>
              <strong>{{ instrumentCountry(selectedInstrumentDetails.instrument) }}</strong>
              <span>Биржа</span>
              <strong>{{ selectedInstrumentDetails.instrument.exchange }}</strong>
              <span>Сектор</span>
              <strong>{{ selectedInstrumentDetails.instrument.sector ?? '—' }}</strong>
              <span v-if="selectedInstrumentDetails.instrument.isin">ISIN</span>
              <strong v-if="selectedInstrumentDetails.instrument.isin">{{ selectedInstrumentDetails.instrument.isin }}</strong>
              <span v-if="selectedInstrumentDetails.instrument.website_url">Сайт</span>
              <strong v-if="selectedInstrumentDetails.instrument.website_url">
                <a :href="selectedInstrumentDetails.instrument.website_url" target="_blank" rel="noreferrer">
                  {{ selectedInstrumentDetails.instrument.website_url }}
                </a>
              </strong>
              <span>Валюта расчетов</span>
              <strong>{{ settlementCurrency(selectedInstrumentDetails.instrument) }}</strong>
              <span>Лот</span>
              <strong>{{ instrumentLotSize(selectedInstrumentDetails.instrument) }} {{ tradeUnit(selectedInstrumentDetails.instrument) }}</strong>
              <span v-if="selectedInstrumentDetails.instrument.faceValue">Номинал</span>
              <strong v-if="selectedInstrumentDetails.instrument.faceValue">{{ formatMoney(selectedInstrumentDetails.instrument.faceValue, selectedInstrumentDetails.instrument.currency) }}</strong>
            </div>
            <div v-if="providerFactEntries.length" class="demo-account__provider-facts">
              <article v-for="[label, value] in providerFactEntries" :key="label">
                <span>{{ label }}</span>
                <strong>{{ formatFactValue(value) }}</strong>
              </article>
            </div>
            <p v-else class="demo-account__muted">Провайдер не вернул расширенную карточку по этому инструменту.</p>
          </article>

          <article v-if="activeInstrumentSection === 'data'" id="demo-data" class="demo-account__about-panel demo-account__about-panel--wide">
            <h2>Данные и портфель</h2>
            <div class="demo-account__facts">
              <span>Источник</span>
              <strong>{{ selectedInstrumentDetails.instrument.provider.toUpperCase() }}</strong>
              <span>Тикер у источника</span>
              <strong>{{ selectedInstrumentDetails.instrument.provider_symbol }}</strong>
              <span>Котировка</span>
              <strong>{{ quoteAge(selectedInstrumentDetails.instrument) }}</strong>
              <span>В позиции</span>
              <strong>
                {{ formatQuantity(selectedAvailableQuantity) }}
                {{ selectedInstrumentDetails.instrument.asset_type === 'currency' ? currencyFromPair(selectedInstrumentDetails.instrument.symbol) : 'шт.' }}
              </strong>
              <span>Размер лота</span>
              <strong>{{ instrumentLotSize(selectedInstrumentDetails.instrument) }} {{ tradeUnit(selectedInstrumentDetails.instrument) }}</strong>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="demo-account__table">
        <div class="demo-account__table-head">
          <span>Название</span>
          <span v-if="catalogKind === 'bond'">Дата погашения</span>
          <span v-else>Цена</span>
          <span v-if="catalogKind === 'bond'">Доходность</span>
          <span v-else>За день</span>
          <span>{{ catalogKind === 'bond' ? 'Цена' : 'Биржа' }}</span>
        </div>
        <div v-if="catalogInstruments.length === 0" class="demo-account__empty-state">
          <strong>Инструменты не найдены</strong>
          <span>Попробуйте изменить поиск, валюту, страну или биржу.</span>
        </div>
        <article
          v-for="instrument in paginatedCatalogInstruments"
          :key="instrument.id"
          class="demo-account__table-row"
          :class="{ 'demo-account__table-row--favorite': isInstrumentFavorite(instrument) }"
          role="button"
          tabindex="0"
          @click="openInstrument(instrument)"
          @keydown.enter="openInstrument(instrument)"
        >
          <div class="demo-account__instrument-name">
            <button
              type="button"
              class="demo-account__favorite-button"
              :class="{ 'demo-account__favorite-button--active': isInstrumentFavorite(instrument) }"
              :aria-label="isInstrumentFavorite(instrument) ? 'Убрать из избранного' : 'Добавить в избранное'"
              @click.stop="toggleFavorite(instrument)"
              @keydown.enter.stop
            >
              <Star class="demo-account__favorite-icon" />
            </button>
            <span
              class="demo-account__instrument-logo"
              :class="[instrumentTone(instrument), { 'demo-account__instrument-logo--image': instrumentLogoUrl(instrument) }]"
            >
              <img
                v-if="instrumentLogoUrl(instrument)"
                :src="instrumentLogoUrl(instrument) ?? ''"
                :alt="instrument.name"
              />
              <template v-else>{{ instrumentInitials(instrument) }}</template>
            </span>
            <div>
              <strong>{{ instrument.name }}</strong>
              <span>{{ instrument.symbol }}</span>
            </div>
          </div>
          <div v-if="catalogKind === 'bond'" class="demo-account__price-cell">
            <strong>{{ bondMaturityText(instrument) }}</strong>
            <span>{{ bondMaturitySubtext(instrument) }}</span>
          </div>
          <div v-else class="demo-account__price-cell" :class="{ 'demo-account__price-cell--empty': !instrument.demo_price_cache }">
            <strong>{{ priceText(instrument) }}</strong>
            <span>{{ quoteAge(instrument) }}</span>
          </div>
          <div v-if="catalogKind === 'bond'" class="demo-account__change-cell">
            <b>{{ bondYieldForInstrument(instrument) }}</b>
            <span>к погашению</span>
          </div>
          <div v-else class="demo-account__change-cell">
            <b :class="toneClass(instrument.demo_price_cache?.change_percent)">
              {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
            </b>
            <span>{{ changeAbsText(instrument) }}</span>
          </div>
          <div class="demo-account__exchange-cell">
            <strong>{{ catalogKind === 'bond' ? priceText(instrument) : instrument.exchange }}</strong>
            <span>{{ catalogKind === 'bond' ? quoteAge(instrument) : `${instrumentCountry(instrument)} · ${instrument.currency}` }}</span>
          </div>
        </article>
        <div v-if="catalogInstruments.length" class="demo-account__pagination">
          <span>
            {{ (catalogPage - 1) * catalogPageSize + 1 }}-{{ Math.min(catalogPage * catalogPageSize, catalogInstruments.length) }}
            из {{ catalogInstruments.length }}
          </span>
          <div>
            <Button variant="secondary" :disabled="catalogPage <= 1" @click="catalogPage -= 1">Назад</Button>
            <strong>{{ catalogPage }} / {{ catalogTotalPages }}</strong>
            <Button variant="secondary" :disabled="catalogPage >= catalogTotalPages" @click="catalogPage += 1">Вперед</Button>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'analytics'" class="demo-account__analytics">
      <section class="demo-account__analytics-scope">
        <div>
          <span>Аналитика</span>
          <strong>{{ analyticsIsAllAccounts ? 'Все демо-счета' : selectedDemoAccount?.name ?? store.account?.name }}</strong>
        </div>
        <div>
          <select class="demo-account__select demo-account__analytics-select" :value="selectedAccountId ?? 'all'" @change="onAnalyticsAccountChange">
            <option value="all">Все демо-счета</option>
            <option v-for="account in demoAccounts" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>
      </section>

      <article class="demo-account__panel">
        <h2>Распределение</h2>
        <section class="demo-account__overview-stats demo-account__overview-stats--compact">
          <article v-for="stat in analyticsStats" :key="stat.label">
            <span>{{ stat.label }}</span>
            <strong :class="stat.amount !== undefined ? toneClass(stat.amount) : undefined">{{ stat.value }}</strong>
            <small>{{ stat.sub }}</small>
          </article>
        </section>
        <div class="demo-account__allocation">
          <div
            class="demo-account__donut demo-account__donut--allocation"
            :class="{ 'demo-account__donut--has-active': activeAllocation }"
            :style="allocationChartStyle"
            @mousemove="handleAllocationPointerMove"
            @mouseleave="hoveredAllocationIndex = null"
          >
            <svg class="demo-account__allocation-overlay" viewBox="0 0 100 100" aria-hidden="true">
              <path
                v-for="segment in allocationSegments"
                :key="segment.label"
                :d="segment.path"
                :fill="segment.color"
                :class="{ 'demo-account__allocation-segment--active': activeAllocation?.index === segment.index }"
                @mouseenter="hoveredAllocationIndex = segment.index"
              />
            </svg>
            <div>
              <strong>{{ activeAllocation ? activeAllocation.percent.toFixed(1) + '%' : formatMoney(analyticsTotalRub, 'RUB') }}</strong>
              <span>{{ activeAllocation ? activeAllocation.label : `${analyticsPositions.length} активов` }}</span>
              <small v-if="activeAllocation">{{ formatMoney(activeAllocation.value, 'RUB') }}</small>
            </div>
          </div>
          <div class="demo-account__allocation-list">
            <button
              v-for="item in allocationSegments"
              :key="item.label"
              type="button"
              :class="{ 'demo-account__allocation-item--active': hoveredAllocationIndex === item.index }"
              @mouseenter="hoveredAllocationIndex = item.index"
              @mouseleave="hoveredAllocationIndex = null"
              @focus="hoveredAllocationIndex = item.index"
              @blur="hoveredAllocationIndex = null"
            >
              <span class="demo-account__allocation-swatch" :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
              <b>{{ item.percent.toFixed(1) }}%</b>
              <strong>{{ formatMoney(item.value, 'RUB') }}</strong>
            </button>
          </div>
        </div>
      </article>

      <article class="demo-account__panel">
        <h2>Крупнейшие позиции</h2>
        <div v-if="topAllocationPositions.length" class="demo-account__allocation-positions">
          <button
            v-for="row in topAllocationPositions"
            :key="row.position.instrument_id"
            type="button"
            @click="openInstrument(row.position.demo_instruments)"
          >
            <span
              class="demo-account__instrument-logo"
              :class="[instrumentTone(row.position.demo_instruments), { 'demo-account__instrument-logo--image': instrumentLogoUrl(row.position.demo_instruments) }]"
            >
              <img
                v-if="instrumentLogoUrl(row.position.demo_instruments)"
                :src="instrumentLogoUrl(row.position.demo_instruments) ?? ''"
                :alt="row.position.demo_instruments.name"
              />
              <template v-else>{{ instrumentInitials(row.position.demo_instruments) }}</template>
            </span>
            <div>
              <strong>{{ row.position.demo_instruments.name }}</strong>
              <span>{{ row.position.demo_instruments.symbol }} · {{ row.percent.toFixed(1) }}%</span>
            </div>
            <div>
              <strong>{{ formatMoney(row.position.marketValueRub, 'RUB') }}</strong>
              <span :class="toneClass(row.position.unrealizedPnlRub)">
                {{ formatMoney(row.position.unrealizedPnlRub, 'RUB') }}
              </span>
            </div>
          </button>
        </div>
        <p v-else class="demo-account__muted">Позиции появятся после первой покупки.</p>
      </article>

      <article class="demo-account__panel">
        <h2>Валюта</h2>
        <div class="demo-account__currency-list">
          <button v-for="row in currencyBalanceRows" :key="row.currency" type="button" @click="row.instrument ? openInstrument(row.instrument) : undefined">
            <span class="demo-account__instrument-logo demo-account__logo--fx demo-account__instrument-logo--image">
              <img :src="currencyIconUrl(row.currency)" :alt="row.currency" />
            </span>
            <div>
              <strong>{{ row.title }}</strong>
              <span>{{ row.symbol }}</span>
            </div>
            <div>
              <strong>{{ formatMoney(row.amount, row.currency) }}</strong>
              <span>{{ row.currency === 'RUB' ? 'базовая валюта' : `≈ ${formatMoney(row.rubValue, 'RUB')}` }}</span>
            </div>
            <div>
              <strong>{{ row.rate ? formatMoney(row.rate, 'RUB') : '—' }}</strong>
              <span>курс</span>
            </div>
          </button>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === 'events'" class="demo-account__events">
      <article class="demo-account__panel">
        <h2>События</h2>
        <div class="demo-account__event-list">
          <article v-for="event in paginatedEvents" :key="event.id">
            <span
              class="demo-account__event-logo demo-account__instrument-logo"
              :class="eventLogoClasses(event)"
            >
              <img
                v-if="eventLogoUrl(event)"
                :src="eventLogoUrl(event) ?? ''"
                :alt="eventLogoAlt(event)"
              />
              <template v-else>{{ eventLogoText(event) }}</template>
            </span>
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.subtitle }}</span>
            </div>
            <div>
              <b :class="toneClass(event.amount)">{{ formatMoney(event.amount, event.currency) }}</b>
              <span>{{ formatDate(event.date) }}</span>
            </div>
          </article>
        </div>
        <div v-if="eventsTotalPages > 1" class="demo-account__pagination">
          <span>{{ eventsPage }} / {{ eventsTotalPages }}</span>
          <div>
            <Button variant="secondary" :disabled="eventsPage <= 1" @click="eventsPage -= 1">Назад</Button>
            <Button variant="secondary" :disabled="eventsPage >= eventsTotalPages" @click="eventsPage += 1">Вперед</Button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.demo-account {
  display: grid;
  gap: 22px;
  background: hsl(var(--background));
}

.demo-account__topbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 10px;
}

.demo-account__loading-shell,
.demo-account__overview {
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.demo-account__skeleton-title {
  width: 70%;
  height: 22px;
}

.demo-account__skeleton-account {
  height: 74px;
}

.demo-account__skeleton-hero,
.demo-account__skeleton-chart {
  height: 280px;
}

.demo-account__skeleton-stat {
  height: 86px;
}

.demo-account__skeleton-panel {
  height: 260px;
}

.demo-account__skeleton-order {
  height: 360px;
}

.demo-account__workspace-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));
  padding: 14px 16px;
}

.demo-account__workspace-bar div {
  display: grid;
  gap: 3px;
}

.demo-account__workspace-bar span,
.demo-account__workspace-bar small {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__account-select {
  min-width: 220px;
}

.demo-account__topbar h1,
.demo-account__catalog h2,
.demo-account__panel h2,
.demo-account__chart-card h2 {
  margin: 0;
}

.demo-account__topbar span,
.demo-account__sidebar span,
.demo-account__event-list span,
.demo-account__table span,
.demo-account__muted,
.demo-account__panel p {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__tabs,
.demo-account__catalog-tabs,
.demo-account__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo-account__tabs button,
.demo-account__catalog-tabs button {
  border: 0;
  background: transparent;
  border-bottom: 2px solid transparent;
  padding: 10px 8px;
  cursor: pointer;
}

.demo-account__tab--active {
  border-color: hsl(var(--foreground)) !important;
}

.demo-account__catalog-tab--active {
  border-color: hsl(211 88% 52%) !important;
}

.demo-account__overview {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 28px;
}

.demo-account__main,
.demo-account__catalog,
.demo-account__analytics,
.demo-account__events {
  display: grid;
  gap: 22px;
}

.demo-account__sidebar {
  display: grid;
  align-content: start;
  gap: 18px;
}

.demo-account__sidebar h2 {
  margin: 0;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 14px;
}

.demo-account__sidebar-total,
.demo-account__account-row,
.demo-account__new-account {
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 18px;
}

.demo-account__sidebar-total,
.demo-account__account-row div {
  display: grid;
  gap: 6px;
}

.demo-account__sidebar-total strong {
  font-size: 24px;
}

.demo-account__sidebar-total--button,
.demo-account__account-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid hsl(var(--border));
  background: transparent;
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
}

.demo-account__sidebar-total--button {
  border-radius: 12px;
  padding: 12px;
}

.demo-account__account-row--active {
  background: hsl(211 88% 97%);
  box-shadow: inset 3px 0 0 hsl(211 88% 52%);
}

.demo-account__account-row {
  display: flex;
  gap: 12px;
  border-radius: 12px;
  padding: 12px;
}

.demo-account__briefcase {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: hsl(var(--muted));
}

.demo-account__new-account {
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.demo-account__side-nav {
  display: grid;
  gap: 6px;
  border-top: 1px solid hsl(var(--border));
  padding-top: 10px;
}

.demo-account__side-nav button {
  height: 38px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 0 10px;
  text-align: left;
  cursor: pointer;
}

.demo-account__side-nav--active {
  background: hsl(211 88% 95%) !important;
  color: hsl(211 80% 24%);
  font-weight: 800;
}

.demo-account__account-editor {
  display: grid;
  gap: 8px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px;
}

.demo-account__account-editor--inline {
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
  align-items: end;
  padding: 16px;
}

.demo-account__account-editor--inline > div:not(.demo-account__editor-actions, .demo-account__editor-block) {
  display: grid;
  gap: 6px;
}

.demo-account__editor-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.demo-account__account-inline-edit,
.demo-account__inline-editor-bar {
  display: grid;
  gap: 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--card));
  padding: 12px;
}

.demo-account__account-inline-edit label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.demo-account__inline-editor-bar {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.demo-account__inline-editor-bar div:first-child {
  display: grid;
  gap: 3px;
}

.demo-account__name-edit {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.demo-account__name-edit span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__inline-editor-bar span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__editor-block {
  display: grid;
  gap: 8px;
  border-top: 1px solid hsl(var(--border));
  padding-top: 10px;
}

.demo-account__account-editor--inline .demo-account__editor-block {
  grid-column: 1 / -1;
}

.demo-account__editor-block label,
.demo-account__editor-block article {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.demo-account__editor-block article {
  grid-template-columns: minmax(120px, 1fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr) auto;
}

.demo-account__editor-block--positions article {
  grid-template-columns: minmax(180px, 1fr) minmax(90px, 0.45fr) minmax(100px, 0.55fr) auto;
}

.demo-account__editor-block article div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.demo-account__search {
  position: relative;
}

.demo-account__search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
}

.demo-account__search :deep(input) {
  padding-left: 42px;
  padding-right: 42px;
  height: 56px;
  border-radius: 10px;
  background: hsl(var(--background));
}

.demo-account__search--dropdown {
  z-index: 20;
}

.demo-account__search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  width: 30px;
  height: 30px;
  transform: translateY(-50%);
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.demo-account__search-clear:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.demo-account__search-popover {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--card));
  box-shadow: 0 18px 46px hsl(220 30% 20% / 0.14);
  padding: 8px;
}

.demo-account__search-popover section {
  display: grid;
  gap: 4px;
}

.demo-account__search-popover h3 {
  margin: 8px 8px 4px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 600;
}

.demo-account__search-popover button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.demo-account__search-popover button:hover {
  background: hsl(var(--muted) / 0.6);
}

.demo-account__search-popover button > span:last-child {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.demo-account__search-popover strong,
.demo-account__search-popover small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__search-popover p {
  margin: 0;
  padding: 12px;
  color: hsl(var(--muted-foreground));
}

.demo-account__hero {
  min-height: 186px;
  border-radius: 18px;
  border: 1px solid hsl(var(--border));
  background:
    linear-gradient(135deg, hsl(211 88% 97%), hsl(var(--background)) 46%),
    hsl(var(--background));
  box-shadow: 0 16px 40px hsl(220 30% 20% / 0.06);
  color: hsl(var(--foreground));
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding: 28px 32px;
}

.demo-account__hero div,
.demo-account__actions article,
.demo-account__cash-card {
  display: grid;
  gap: 8px;
}

.demo-account__hero strong {
  font-size: 24px;
}

.demo-account__hero-balance,
.demo-account__period-switch {
  display: flex !important;
  align-items: center;
  gap: 8px;
}

.demo-account__hero-balance {
  flex-wrap: wrap;
}

.demo-account__hero-balance strong {
  font-size: 30px;
}

.demo-account__period-switch {
  align-self: start;
  width: fit-content;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--background));
  padding: 3px;
}

.demo-account__period-switch button {
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.demo-account__period-switch--active {
  background: hsl(211 88% 52%) !important;
  color: white;
}

.demo-account__overview-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.demo-account__overview-stats--compact {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-bottom: 18px;
}

.demo-account__overview-stats article {
  display: grid;
  gap: 6px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--card));
  padding: 14px;
}

.demo-account__overview-stats span,
.demo-account__overview-stats small {
  color: hsl(var(--muted-foreground));
}

.demo-account__overview-stats strong {
  font-size: 18px;
}

.demo-account__currency-toggle {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.demo-account__edit-button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.demo-account__currency-icon,
.demo-account__button-icon {
  width: 16px;
  height: 16px;
}

.demo-account__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__actions--buttons {
  align-items: stretch;
}

.demo-account__action-button {
  display: grid;
  gap: 4px;
  min-height: 74px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
}

.demo-account__action-button span,
.demo-account__action-drawer span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__action-button strong {
  font-size: 15px;
}

.demo-account__action-button--active {
  border-color: hsl(211 88% 52%);
  background: hsl(211 88% 97%);
}

.demo-account__action-drawer {
  display: grid;
  grid-template-columns: minmax(220px, 0.45fr) minmax(0, 1fr);
  gap: 16px;
  align-items: end;
}

.demo-account__action-drawer > div:first-child {
  display: grid;
  gap: 5px;
}

.demo-account__accounts-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.demo-account__account-card {
  display: grid;
  gap: 7px;
  min-height: 132px;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
  padding: 18px;
  cursor: pointer;
}

.demo-account__account-card span,
.demo-account__account-card small {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__account-card strong {
  font-size: 18px;
}

.demo-account__account-card b {
  font-size: 24px;
}

.demo-account__value-head,
.demo-account__panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.demo-account__value-head > div:first-child {
  display: grid;
  gap: 5px;
}

.demo-account__value-head strong {
  font-size: 26px;
}

.demo-account__value-head span,
.demo-account__value-head small,
.demo-account__panel-head span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__chart-range {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.demo-account__chart-range button {
  height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.demo-account__chart-range--active {
  border-color: hsl(211 88% 52%) !important;
  background: hsl(211 88% 95%) !important;
  color: hsl(211 80% 24%);
}

.demo-account__overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__cash-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__actions article,
.demo-account__action-drawer,
.demo-account__chart-card,
.demo-account__panel,
.demo-account__cash-card,
.demo-account__table {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
}

.demo-account__actions article,
.demo-account__action-drawer,
.demo-account__chart-card,
.demo-account__panel,
.demo-account__cash-card {
  padding: 18px;
}

.demo-account__inline-form,
.demo-account__income-form,
.demo-account__buy-cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.demo-account__income-form {
  grid-template-columns: minmax(0, 1fr) 170px auto;
}

.demo-account__select {
  height: 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 0 10px;
}

.demo-account__bars {
  position: relative;
  height: 232px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(44px, 1fr));
  align-items: stretch;
  gap: 10px;
  padding: 18px 6px 0;
}

.demo-account__bar-column {
  min-width: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 24px;
  align-items: end;
  gap: 8px;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__bar-column small {
  min-width: 0;
  color: hsl(var(--muted-foreground));
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
}

.demo-account__bar {
  width: 100%;
  max-width: 54px;
  justify-self: center;
  align-self: end;
  border-radius: 7px 7px 0 0;
  background: hsl(206 65% 62%);
  cursor: default;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.demo-account__bar--empty {
  background: hsl(var(--muted));
  opacity: 0.55;
}

.demo-account__bar-column:hover .demo-account__bar {
  background: hsl(198 84% 48%);
  transform: translateY(-2px);
}

.demo-account__portfolio-tooltip {
  position: absolute;
  right: 16px;
  top: 12px;
  display: grid;
  gap: 2px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--background));
  box-shadow: 0 12px 28px hsl(220 30% 20% / 0.12);
  padding: 9px 11px;
  font-size: 12px;
  pointer-events: none;
}

.demo-account__currency-list {
  display: grid;
}

.demo-account__currency-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__currency-row--editing {
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.32fr);
}

.demo-account__currency-row:last-child {
  border-bottom: 0;
}

.demo-account__currency-list button {
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) minmax(150px, 0.75fr) minmax(120px, 0.6fr);
  gap: 14px;
  align-items: center;
  border: 0;
  border-bottom: 1px solid hsl(var(--border));
  background: transparent;
  padding: 13px 0;
  text-align: left;
  cursor: pointer;
}

.demo-account__currency-row button {
  border-bottom: 0;
}

.demo-account__currency-list button:last-child {
  border-bottom: 0;
}

.demo-account__currency-edit {
  height: 38px;
}

.demo-account__currency-list button > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.demo-account__currency-list button > div:nth-child(n + 3) {
  justify-items: end;
  text-align: right;
}

.demo-account__currency-list span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__donut {
  width: 190px;
  aspect-ratio: 1;
  position: relative;
  isolation: isolate;
  background: conic-gradient(hsl(198 84% 61%) 0deg 360deg);
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin: 20px auto 0;
}

.demo-account__donut::before {
  content: '';
  position: absolute;
  inset: 14px;
  z-index: -1;
  border-radius: inherit;
  background: hsl(var(--card));
}

.demo-account__donut div {
  display: grid;
  justify-items: center;
  gap: 4px;
  max-width: 120px;
  position: relative;
  z-index: 2;
  text-align: center;
  pointer-events: none;
}

.demo-account__donut small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__event-list {
  display: grid;
}

.demo-account__event-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(140px, auto);
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__event-list article > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.demo-account__event-list article > div:last-child {
  justify-items: end;
  text-align: right;
}

.demo-account__event-logo {
  width: 38px;
  height: 38px;
  font-size: 12px;
}

.demo-account__event-list strong,
.demo-account__event-list span,
.demo-account__event-list b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-account__event-list b {
  white-space: nowrap;
}

.demo-account__panel--recent-events {
  min-height: 320px;
}

.demo-account__event-list--compact {
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
}

.demo-account__event-list--compact article {
  grid-template-columns: 38px minmax(0, 1fr) minmax(92px, auto);
  gap: 8px;
  padding: 8px 0;
}

.demo-account__event-list--compact .demo-account__event-logo {
  width: 38px;
  height: 38px;
}

.demo-account__event-list--compact strong {
  font-size: 12px;
  line-height: 1.2;
}

.demo-account__event-list--compact span {
  font-size: 11px;
  line-height: 1.25;
}

.demo-account__event-list--compact b {
  font-size: 12px;
}

.demo-account__event-list--compact article > div:first-of-type span {
  display: -webkit-box;
  white-space: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.demo-account__event-list article:last-child {
  border-bottom: 0;
}

.demo-account__panel--wide {
  grid-column: 1 / -1;
}

.demo-account__position-list,
.demo-account__movers,
.demo-account__market-strip {
  display: grid;
}

.demo-account__movers button,
.demo-account__market-strip button {
  border: 0;
  border-bottom: 1px solid hsl(var(--border));
  background: transparent;
  cursor: pointer;
}

.demo-account__position-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__position-row--editing {
  grid-template-columns: minmax(0, 1fr) minmax(260px, auto);
}

.demo-account__position-row:last-child {
  border-bottom: 0;
}

.demo-account__position-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(160px, auto);
  gap: 14px;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 13px 0;
  text-align: left;
  cursor: pointer;
}

.demo-account__movers button:last-child,
.demo-account__market-strip button:last-child {
  border-bottom: 0;
}

.demo-account__position-main > div,
.demo-account__movers button,
.demo-account__market-strip button {
  min-width: 0;
}

.demo-account__position-main > div:nth-child(2) {
  display: grid;
  gap: 2px;
}

.demo-account__position-main > div:last-child {
  display: grid;
  justify-items: end;
  gap: 4px;
  text-align: right;
}

.demo-account__position-edit {
  display: grid;
  grid-template-columns: minmax(80px, 100px) auto auto;
  gap: 8px;
  align-items: center;
  justify-content: end;
}

.demo-account__position-edit :deep(input) {
  height: 36px;
}

.demo-account__position-list span,
.demo-account__position-list small,
.demo-account__movers span,
.demo-account__market-strip span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__position-list small {
  display: block;
}

.demo-account__movers button {
  display: grid;
  grid-template-columns: minmax(80px, 0.7fr) minmax(0, 1fr) minmax(70px, auto);
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  text-align: left;
}

.demo-account__market-strip {
  max-height: 292px;
  overflow: auto;
}

.demo-account__market-strip button {
  display: grid;
  gap: 4px;
  padding: 11px 0;
  text-align: left;
}

.demo-account__market-strip strong {
  font-size: 14px;
}

.demo-account__market-strip b {
  font-size: 12px;
}

.demo-account__catalog-tabs button {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--card));
}

.demo-account__filters {
  align-items: center;
}

.demo-account__table {
  overflow: hidden;
}

.demo-account__table-head,
.demo-account__table-row {
  display: grid;
  grid-template-columns: minmax(300px, 1.7fr) minmax(180px, 0.85fr) minmax(140px, 0.7fr) minmax(150px, 0.75fr);
  gap: 20px;
  align-items: center;
  padding: 16px 24px;
}

.demo-account__table-head {
  border-bottom: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
}

.demo-account__table-row {
  border-bottom: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.demo-account__table-row:hover {
  background: hsl(211 88% 97%);
}

.demo-account__table-row--favorite {
  background: linear-gradient(90deg, hsl(211 88% 97%), hsl(var(--card)) 42%);
}

.demo-account__empty-state {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 36px 20px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.demo-account__empty-state strong {
  color: hsl(var(--foreground));
}

.demo-account__table-row:last-child {
  border-bottom: 0;
}

.demo-account__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid hsl(var(--border));
  padding: 14px 24px;
}

.demo-account__pagination div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo-account__instrument-name {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.demo-account__favorite-button {
  width: 32px;
  height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 9px;
  background: hsl(var(--background));
  color: hsl(var(--muted-foreground));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.demo-account__favorite-button:hover,
.demo-account__favorite-button--active {
  border-color: hsl(211 88% 52%);
  background: hsl(211 88% 96%);
  color: hsl(211 88% 42%);
}

.demo-account__favorite-button--active .demo-account__favorite-icon {
  fill: currentColor;
}

.demo-account__favorite-button--hero {
  align-self: center;
}

.demo-account__favorite-icon {
  width: 16px;
  height: 16px;
}

.demo-account__instrument-name div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.demo-account__instrument-name strong,
.demo-account__instrument-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__instrument-logo {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: white;
  background: hsl(211 88% 52%);
}

.demo-account__instrument-logo--image {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background)) !important;
  color: transparent;
  overflow: hidden;
}

.demo-account__instrument-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: white;
}

.demo-account__instrument-logo--large {
  width: 64px;
  height: 64px;
  font-size: 18px;
}

.demo-account__logo--ru {
  background: linear-gradient(135deg, hsl(145 72% 38%), hsl(199 82% 44%));
}

.demo-account__logo--us {
  background: linear-gradient(135deg, hsl(224 83% 54%), hsl(258 74% 58%));
}

.demo-account__logo--fx {
  background: linear-gradient(135deg, hsl(188 70% 42%), hsl(211 88% 52%));
}

.demo-account__logo--fund {
  background: linear-gradient(135deg, hsl(174 72% 35%), hsl(199 84% 48%));
}

.demo-account__price-cell,
.demo-account__change-cell,
.demo-account__exchange-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.demo-account__price-cell strong,
.demo-account__price-cell span,
.demo-account__change-cell b,
.demo-account__change-cell span,
.demo-account__exchange-cell strong,
.demo-account__exchange-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__price-cell--empty strong {
  color: hsl(var(--muted-foreground));
  font-weight: 600;
}

.demo-account__positive {
  color: hsl(145 80% 34%) !important;
}

.demo-account__negative {
  color: hsl(0 76% 50%) !important;
}

.demo-account__instrument-page {
  display: grid;
  gap: 16px;
}

.demo-account__back-button {
  justify-self: start;
  border: 0;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0;
}

.demo-account__instrument-hero,
.demo-account__chart-panel,
.demo-account__order-panel,
.demo-account__stats-grid article {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
}

.demo-account__instrument-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}

.demo-account__instrument-title {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.demo-account__instrument-hero h2 {
  margin: 6px 0;
  font-size: 30px;
}

.demo-account__instrument-hero p,
.demo-account__instrument-hero span,
.demo-account__stats-grid span,
.demo-account__order-panel p {
  color: hsl(var(--muted-foreground));
}

.demo-account__instrument-hero strong {
  display: block;
  font-size: 28px;
  text-align: right;
}

.demo-account__instrument-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__instrument-nav button {
  color: hsl(var(--foreground));
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 10px 4px;
  font-size: 13px;
  cursor: pointer;
}

.demo-account__instrument-tab--active {
  border-color: hsl(211 88% 52%) !important;
  color: hsl(var(--foreground)) !important;
  font-weight: 800;
}

.demo-account__details-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.7fr);
  align-items: start;
  column-gap: 16px;
  row-gap: 10px;
}

.demo-account__chart-column {
  display: grid;
  gap: 10px;
  align-content: start;
  min-width: 0;
}

.demo-account__chart-panel,
.demo-account__order-panel {
  padding: 20px;
}

.demo-account__section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.demo-account__section-title h2 {
  margin: 0;
}

.demo-account__section-title span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__chart-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.demo-account__chart-controls button {
  height: 32px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}

.demo-account__chart-control--active {
  border-color: hsl(211 88% 52%) !important;
  background: hsl(211 88% 95%) !important;
}

.demo-account__chart-wrap {
  position: relative;
  margin-top: 18px;
}

.demo-account__price-chart {
  width: 100%;
  height: 320px;
  color: hsl(145 70% 40%);
  background:
    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px);
  background-size: 100% 25%, 12.5% 100%;
  border-radius: 12px;
  overflow: visible;
  cursor: crosshair;
  user-select: none;
}

.demo-account__price-chart,
.demo-account__price-chart * {
  outline: none;
}

.demo-account__candle {
  color: hsl(0 74% 55%);
}

.demo-account__candle--positive {
  color: hsl(145 70% 38%);
}

.demo-account__candle line,
.demo-account__candle rect {
  stroke: currentColor;
  fill: currentColor;
  vector-effect: non-scaling-stroke;
}

.demo-account__chart-last-line {
  stroke: hsl(145 70% 42%);
  stroke-dasharray: 2 2;
  vector-effect: non-scaling-stroke;
}

.demo-account__chart-hit-area {
  fill: transparent;
  pointer-events: all;
}

.demo-account__chart-crosshair {
  stroke: hsl(var(--muted-foreground));
  stroke-dasharray: 3 3;
  opacity: 0.7;
  vector-effect: non-scaling-stroke;
}

.demo-account__last-price-badge {
  position: absolute;
  right: -4px;
  transform: translateY(-50%);
  border-radius: 4px;
  background: hsl(145 70% 42%);
  color: white;
  padding: 3px 6px;
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
}

.demo-account__chart-tooltip {
  position: absolute;
  top: 52%;
  transform: translate(-50%, -10%);
  display: grid;
  gap: 4px;
  min-width: 190px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--background) / 0.96);
  box-shadow: 0 14px 34px hsl(220 30% 20% / 0.12);
  padding: 10px 12px;
  font-size: 12px;
  pointer-events: none;
}

.demo-account__instrument-about-card {
  grid-column: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  gap: 22px;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
  padding: 20px;
}

.demo-account__instrument-about-card h2 {
  margin: 0 0 12px;
}

.demo-account__instrument-about-card p {
  margin: 0;
  max-width: 780px;
  color: hsl(var(--foreground));
  font-size: 14px;
  line-height: 1.65;
}

.demo-account__instrument-about-card dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.demo-account__instrument-about-card dl div {
  display: grid;
  gap: 4px;
}

.demo-account__instrument-about-card span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__order-panel {
  display: grid;
  gap: 12px;
  align-content: start;
}

.demo-account__order-head {
  display: grid;
  gap: 4px;
}

.demo-account__order-head span,
.demo-account__order-meta span,
.demo-account__order-total span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__order-head strong {
  font-size: 28px;
}

.demo-account__order-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  border-radius: 10px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  padding: 4px;
}

.demo-account__order-switch--type {
  background: hsl(var(--muted) / 0.45);
}

.demo-account__order-switch button {
  height: 42px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-weight: 700;
}

.demo-account__order-switch--active {
  background: hsl(211 88% 52%) !important;
  color: white;
  box-shadow: 0 6px 18px hsl(220 30% 20% / 0.08);
}

.demo-account__order-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 10px 12px;
}

.demo-account__order-total {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  align-items: center;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 10px 12px;
}

.demo-account__order-total strong {
  justify-self: end;
  text-align: right;
}

.demo-account__order-notice {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
}

.demo-account__order-notice--success {
  background: hsl(145 70% 94%);
  color: hsl(145 80% 28%);
}

.demo-account__order-notice--error {
  background: hsl(0 83% 96%);
  color: hsl(0 75% 32%);
}

.demo-account__order-notice--info {
  display: grid;
  gap: 8px;
  background: hsl(211 88% 96%);
  color: hsl(211 80% 28%);
}

.demo-account__order-notice--info button {
  justify-self: start;
  border: 1px solid hsl(211 88% 52%);
  border-radius: 8px;
  background: hsl(var(--background));
  color: hsl(211 80% 28%);
  padding: 7px 10px;
  cursor: pointer;
  font-weight: 800;
}

.demo-account__stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__metrics-section {
  display: grid;
  gap: 16px;
}

.demo-account__stats-grid article {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.demo-account__instrument-info-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.75fr);
  gap: 16px;
}

.demo-account__about-panel {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--card));
  box-shadow: 0 14px 36px hsl(220 30% 20% / 0.06);
  padding: 20px;
}

.demo-account__about-panel h2 {
  margin: 0 0 12px;
}

.demo-account__about-panel--wide {
  grid-column: 1 / -1;
}

.demo-account__about-panel p {
  margin: 0 0 18px;
  color: hsl(var(--muted-foreground));
  line-height: 1.65;
}

.demo-account__facts {
  display: grid;
  grid-template-columns: minmax(130px, 0.55fr) minmax(0, 1fr);
  gap: 10px 16px;
  align-items: baseline;
}

.demo-account__facts span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__facts strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__facts strong small {
  display: block;
  margin-top: 3px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.demo-account__facts a {
  color: hsl(211 88% 45%);
  text-decoration: none;
}

.demo-account__facts a:hover {
  text-decoration: underline;
}

.demo-account__provider-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.demo-account__provider-facts article {
  display: grid;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 10px 12px;
}

.demo-account__provider-facts span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__provider-facts strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__dividend-table {
  display: grid;
  margin-top: 8px;
}

.demo-account__dividend-head,
.demo-account__dividend-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(150px, 1fr) minmax(120px, 0.8fr) minmax(100px, 0.7fr);
  gap: 16px;
  align-items: center;
  border-bottom: 1px solid hsl(var(--border));
  padding: 13px 0;
}

.demo-account__dividend-head {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  padding-top: 0;
}

.demo-account__dividend-row:last-child {
  border-bottom: 0;
}

.demo-account__dividend-row span,
.demo-account__dividend-row strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-account__coupon-panel {
  display: grid;
  gap: 20px;
}

.demo-account__coupon-note {
  max-width: 720px;
  margin: 0;
  color: hsl(var(--foreground));
  line-height: 1.65;
}

.demo-account__coupon-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.demo-account__coupon-summary div {
  display: grid;
  gap: 8px;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 12px;
}

.demo-account__coupon-summary span,
.demo-account__coupon-head {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__coupon-table {
  display: grid;
}

.demo-account__coupon-head,
.demo-account__coupon-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(140px, 0.75fr) minmax(120px, 0.55fr);
  gap: 18px;
  align-items: center;
  border-bottom: 1px solid hsl(var(--border));
  padding: 15px 14px;
}

.demo-account__coupon-row--next {
  background: hsl(var(--muted) / 0.45);
}

.demo-account__coupon-row span {
  display: grid;
  gap: 4px;
}

.demo-account__coupon-row small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.demo-account__analytics {
  grid-template-columns: minmax(0, 1fr);
}

.demo-account__analytics-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));
  padding: 14px 16px;
}

.demo-account__analytics-scope > div:first-child {
  display: grid;
  gap: 3px;
}

.demo-account__analytics-scope > div:last-child {
  min-width: min(320px, 100%);
}

.demo-account__analytics-select {
  width: 100%;
}

.demo-account__analytics-scope span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__allocation {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.demo-account__allocation-list {
  display: grid;
  gap: 8px;
  max-width: 620px;
}

.demo-account__allocation-list button {
  display: grid;
  grid-template-columns: 12px minmax(120px, 1fr) minmax(52px, auto) minmax(92px, auto);
  gap: 10px;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.demo-account__allocation-list button:hover,
.demo-account__allocation-item--active {
  border-color: hsl(var(--border));
  background: hsl(var(--muted) / 0.35);
}

.demo-account__allocation-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.demo-account__donut--allocation {
  cursor: default;
}

.demo-account__allocation-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: auto;
}

.demo-account__allocation-overlay path {
  opacity: 0;
  transform-origin: 50% 50%;
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    filter 0.16s ease;
}

.demo-account__allocation-overlay path:hover,
.demo-account__allocation-overlay path.demo-account__allocation-segment--active {
  opacity: 0.28;
  transform: scale(1.025);
  filter: drop-shadow(0 6px 10px hsl(220 30% 20% / 0.16));
}

.demo-account__allocation-positions {
  display: grid;
}

.demo-account__allocation-positions button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(130px, auto);
  gap: 12px;
  align-items: center;
  border: 0;
  border-bottom: 1px solid hsl(var(--border));
  background: transparent;
  padding: 12px 0;
  text-align: left;
  cursor: pointer;
}

.demo-account__allocation-positions button:last-child {
  border-bottom: 0;
}

.demo-account__allocation-positions button > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.demo-account__allocation-positions button > div:last-child {
  justify-items: end;
  text-align: right;
}

.demo-account__allocation-positions span {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

@media (max-width: 1100px) {
  .demo-account__overview,
  .demo-account__loading-shell,
  .demo-account__hero,
  .demo-account__overview-stats,
  .demo-account__actions,
  .demo-account__action-drawer,
  .demo-account__overview-grid,
  .demo-account__cash-grid,
  .demo-account__allocation,
  .demo-account__details-grid,
  .demo-account__instrument-about-card,
  .demo-account__instrument-info-grid,
  .demo-account__stats-grid,
  .demo-account__dividend-head,
  .demo-account__dividend-row,
  .demo-account__position-row--editing,
  .demo-account__currency-row--editing {
    grid-template-columns: 1fr;
  }

  .demo-account__workspace-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .demo-account__account-select {
    width: 100%;
  }

  .demo-account__table-head {
    display: none;
  }

  .demo-account__table-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 18px;
  }

  .demo-account__price-cell,
  .demo-account__change-cell,
  .demo-account__exchange-cell {
    grid-template-columns: minmax(110px, auto) minmax(0, 1fr);
    align-items: baseline;
  }
}

@media (max-width: 760px) {
  .demo-account__topbar,
  .demo-account__instrument-hero,
  .demo-account__section-title {
    flex-direction: column;
    align-items: stretch;
  }

  .demo-account__event-list article {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .demo-account__event-list article > div:last-child {
    grid-column: 2;
    justify-items: start;
    text-align: left;
  }

  .demo-account__chart-controls {
    justify-content: flex-start;
  }

  .demo-account__instrument-hero strong {
    text-align: left;
  }

  .demo-account__inline-form,
  .demo-account__income-form,
  .demo-account__buy-cell,
  .demo-account__allocation-list button,
  .demo-account__allocation-positions button {
    grid-template-columns: 1fr;
  }
}
</style>
