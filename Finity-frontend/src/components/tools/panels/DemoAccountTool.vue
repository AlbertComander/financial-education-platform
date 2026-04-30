<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { DollarSign, Euro, RefreshCw, RussianRuble, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoAccountStore } from '@/stores/demo-account'
import type { DemoInstrument, DemoPosition } from '@/types/demo-account'

type DisplayCurrency = 'RUB' | 'USD' | 'EUR'
type AccountTab = 'overview' | 'catalog' | 'analytics' | 'events'
type CatalogKind = 'all' | 'stock' | 'currency' | 'etf' | 'bond' | 'future' | 'option' | 'strategy' | 'index' | 'favorite'

const store = useDemoAccountStore()
const activeTab = ref<AccountTab>('overview')
const displayCurrency = ref<DisplayCurrency>('RUB')
const searchQuery = ref('')
const catalogKind = ref<CatalogKind>('stock')
const filterCurrency = ref('all')
const filterExchange = ref('all')
const filterCountry = ref('all')
const depositAmount = ref(100000)
const salaryAmount = ref(150000)
const salaryDay = ref(5)
const exchangeFrom = ref('RUB')
const exchangeTo = ref('USD')
const exchangeAmount = ref(10000)
const buyQuantities = reactive<Record<string, number>>({})
const sellQuantities = reactive<Record<string, number>>({})
const selectedCatalogInstrumentId = ref<string | null>(null)

const currencies = ['RUB', 'USD', 'EUR', 'CNY']
const tabs: Array<{ id: AccountTab; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'events', label: 'События' },
]
const catalogKinds: Array<{ id: CatalogKind; label: string }> = [
  { id: 'all', label: 'Что купить' },
  { id: 'stock', label: 'Акции' },
  { id: 'currency', label: 'Валюта' },
  { id: 'etf', label: 'Фонды' },
  { id: 'bond', label: 'Облигации' },
  { id: 'future', label: 'Фьючерсы' },
  { id: 'option', label: 'Опционы' },
  { id: 'strategy', label: 'Стратегии' },
  { id: 'index', label: 'Индексы' },
  { id: 'favorite', label: 'Избранное' },
]

const portfolioTotalRub = computed(() => Number(store.summary?.totalValue ?? 0))
const cashValueRub = computed(() => Number(store.summary?.cashValueRub ?? store.summary?.cashBalance ?? 0))
const positionsValueRub = computed(() => Number(store.summary?.positionsValue ?? 0))
const investedValueRub = computed(() => Number(store.summary?.investedValue ?? 0))
const portfolioPnlRub = computed(() => positionsValueRub.value - investedValueRub.value)
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
const exchanges = computed(() => [...new Set(store.instruments.map((item) => item.exchange).filter(Boolean))] as string[])
const catalogInstruments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return store.instruments.filter((instrument) => {
    const matchesKind =
      catalogKind.value === 'all' ||
      (catalogKind.value === 'stock' && instrument.asset_type === 'stock') ||
      (catalogKind.value === 'currency' && instrument.asset_type === 'currency') ||
      (catalogKind.value === 'etf' && instrument.asset_type === 'etf')
    const matchesSearch =
      !query ||
      instrument.symbol.toLowerCase().includes(query) ||
      instrument.name.toLowerCase().includes(query)
    const matchesCurrency = filterCurrency.value === 'all' || instrument.currency === filterCurrency.value
    const matchesExchange = filterExchange.value === 'all' || instrument.exchange === filterExchange.value
    const country = instrument.exchange?.includes('MOEX') ? 'RU' : 'US'
    const matchesCountry = filterCountry.value === 'all' || country === filterCountry.value

    return matchesKind && matchesSearch && matchesCurrency && matchesExchange && matchesCountry
  })
})
const portfolioBars = computed(() => {
  const base = Math.max(portfolioTotalRub.value, 1)
  return Array.from({ length: 12 }, (_, index) => {
    const wave = 0.82 + ((index * 17) % 9) / 50
    return Math.max(18, Math.round((base * wave * 100) / base))
  })
})
const allocation = computed(() => {
  const items = [
    { label: 'Деньги', value: cashValueRub.value },
    { label: 'Акции', value: sumPositionsBy('stock') },
    { label: 'Фонды', value: sumPositionsBy('etf') },
    { label: 'Крипто', value: sumPositionsBy('crypto') },
  ]
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1)
  return items.map((item) => ({ ...item, percent: (item.value / total) * 100 }))
})
const events = computed(() => [
  ...store.trades.map((trade) => ({
    id: `trade-${trade.id}`,
    title: `${trade.side === 'buy' ? 'Покупка' : 'Продажа'} ${trade.demo_instruments.symbol}`,
    subtitle: `${formatQuantity(trade.quantity)} шт. · ${formatMoney(trade.price, trade.currency)}`,
    date: trade.executed_at,
    amount: trade.side === 'buy' ? -Number(trade.price) * Number(trade.quantity) : Number(trade.price) * Number(trade.quantity),
    currency: trade.currency,
  })),
  ...store.transactions.map((transaction) => ({
    id: `cash-${transaction.id}`,
    title: transaction.description ?? 'Операция по счету',
    subtitle: transaction.kind,
    date: transaction.effective_at,
    amount: Number(transaction.amount),
    currency: transaction.currency,
  })),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
const selectedInstrumentDetails = computed(() => store.instrumentDetails)
const chartPolyline = computed(() => {
  const candles = selectedInstrumentDetails.value?.candles ?? []
  if (candles.length === 0) return ''
  const closes = candles.map((candle) => candle.close)
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1
  return candles
    .map((candle, index) => {
      const x = (index / Math.max(candles.length - 1, 1)) * 100
      const y = 100 - ((candle.close - min) / range) * 86 - 7
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const quoteCoverage = computed(() => {
  if (store.instruments.length === 0) return 0
  return Math.round((pricedInstruments.value.length / store.instruments.length) * 100)
})
const isCatalogLoading = computed(() => store.isLoading || store.isMutating)

function instrumentInitials(instrument: DemoInstrument) {
  return instrument.symbol.slice(0, 2).toUpperCase()
}

function instrumentCountry(instrument: DemoInstrument) {
  return instrument.exchange?.includes('MOEX') ? 'Россия' : 'США'
}

function instrumentTone(instrument: DemoInstrument) {
  if (instrument.exchange?.includes('MOEX')) return 'demo-account__logo--ru'
  if (instrument.asset_type === 'currency') return 'demo-account__logo--fx'
  if (instrument.asset_type === 'etf') return 'demo-account__logo--fund'
  return 'demo-account__logo--us'
}

function quoteAge(instrument: DemoInstrument) {
  const value = instrument.demo_price_cache?.as_of
  return value ? formatDate(value) : 'котировка не загружена'
}

function priceText(instrument: DemoInstrument) {
  const quote = instrument.demo_price_cache
  return quote ? formatMoney(quote.price, quote.currency) : 'Обновите котировки'
}

function changeAbsText(instrument: DemoInstrument) {
  const value = instrument.demo_price_cache?.change_abs
  if (value === null || value === undefined) return '—'
  const amount = Number(value)
  return `${amount >= 0 ? '+' : ''}${formatMoney(amount, instrument.demo_price_cache?.currency ?? instrument.currency)}`
}

function findRate(symbol: string) {
  const instrument = store.instruments.find((item) => item.symbol === symbol)
  const price = Number(instrument?.demo_price_cache?.price)
  return Number.isFinite(price) && price > 0 ? price : null
}

function sumPositionsBy(assetType: string) {
  return store.positions
    .filter((position) => position.demo_instruments.asset_type === assetType)
    .reduce((sum, position) => sum + Number(position.marketValueRub), 0)
}

function cashAmount(currency: string) {
  return Number(store.cashBalances.find((balance) => balance.currency === currency)?.amount ?? 0)
}

function formatMoney(value: string | number, currency = 'RUB') {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatQuantity(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatPercent(value: string | null) {
  if (value === null) return '—'
  const amount = Number(value)
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}%`
}

function formatDate(value: string | null) {
  if (!value) return 'пока не задано'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function quantityFor(instrument: DemoInstrument) {
  return buyQuantities[instrument.id] ?? 1
}

function sellQuantityFor(position: DemoPosition) {
  return sellQuantities[position.instrument_id] ?? Number(position.quantity)
}

function isPositive(value: string | number) {
  return Number(value) >= 0
}

function switchDisplayCurrency() {
  displayCurrency.value = nextDisplayCurrency.value
}

async function refreshQuotes() {
  await store.refreshQuotes()
}

async function deposit() {
  await store.depositCash(depositAmount.value, 'Учебное пополнение')
}

async function createSalaryRule() {
  await store.createIncomeRule('Ежемесячное демо-пополнение', salaryAmount.value, salaryDay.value)
}

async function exchangeCurrency() {
  await store.exchangeCurrency(exchangeFrom.value, exchangeTo.value, exchangeAmount.value)
}

async function buyInstrument(instrument: DemoInstrument) {
  await store.placeTrade('buy', Number(instrument.id), quantityFor(instrument))
}

async function sellPosition(position: DemoPosition) {
  await store.placeTrade('sell', Number(position.instrument_id), sellQuantityFor(position))
}

async function openInstrument(instrument: DemoInstrument) {
  selectedCatalogInstrumentId.value = instrument.id
  await store.fetchInstrumentDetails(instrument.id)
}

function closeInstrument() {
  selectedCatalogInstrumentId.value = null
  store.clearInstrumentDetails()
}

async function initDemoAccount() {
  await store.fetchOverview()
  if (store.instruments.length > 0 && pricedInstruments.value.length < store.instruments.length) {
    await store.refreshQuotes()
  }
}

onMounted(() => {
  void initDemoAccount()
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
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <p v-if="store.error" class="demo-account__error">{{ store.error }}</p>

    <section v-if="activeTab === 'overview'" class="demo-account__overview">
      <aside class="demo-account__sidebar">
        <h2>Брокерские счета</h2>
        <div class="demo-account__sidebar-total">
          <span>В рублях</span>
          <strong>{{ formatMoney(portfolioTotalRub, 'RUB') }}</strong>
          <b :class="{ 'demo-account__positive': portfolioPnlRub >= 0 }">{{ formatMoney(portfolioPnlRub, 'RUB') }}</b>
        </div>
        <article class="demo-account__account-row demo-account__account-row--active">
          <span class="demo-account__briefcase" />
          <div>
            <strong>Демо брокерский счет</strong>
            <span>{{ formatMoney(portfolioTotalRub, 'RUB') }}</span>
          </div>
        </article>
        <button type="button" class="demo-account__new-account">+ Открыть новый счет</button>
      </aside>

      <div class="demo-account__main">
        <div class="demo-account__search">
          <Search class="demo-account__search-icon" />
          <Input v-model="searchQuery" placeholder="Название или тикер" @focus="activeTab = 'catalog'" />
        </div>

        <section class="demo-account__hero">
          <div>
            <span>Стоимость в {{ displayCurrency }}</span>
            <button type="button" class="demo-account__currency-toggle" @click="switchDisplayCurrency">
              <component :is="nextCurrencyIcon" class="demo-account__currency-icon" />
            </button>
            <strong>{{ formatMoney(shownPortfolioTotal, displayCurrency) }}</strong>
            <small>{{ displayCurrency === 'RUB' ? 'Базовая оценка' : `1 ${displayCurrency} = ${formatMoney(displayRate ?? 0, 'RUB')}` }}</small>
          </div>
          <div>
            <span>За все время</span>
            <strong :class="{ 'demo-account__positive': portfolioPnlRub >= 0 }">{{ formatMoney(portfolioPnlRub, 'RUB') }}</strong>
            <small>Нереализованный результат по позициям</small>
          </div>
        </section>

        <section class="demo-account__actions">
          <article>
            <span>Пополнить счет</span>
            <div class="demo-account__inline-form">
              <Input v-model.number="depositAmount" type="number" min="1" step="100" />
              <Button :disabled="store.isMutating" @click="deposit">Пополнить</Button>
            </div>
          </article>
          <article>
            <span>Обмен валюты</span>
            <div class="demo-account__exchange-mini">
              <select v-model="exchangeFrom" class="demo-account__select">
                <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
              </select>
              <select v-model="exchangeTo" class="demo-account__select">
                <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
              </select>
              <Input v-model.number="exchangeAmount" type="number" min="0.01" step="100" />
              <Button :disabled="store.isMutating || exchangeFrom === exchangeTo" @click="exchangeCurrency">OK</Button>
            </div>
          </article>
          <article>
            <span>Автопополнение</span>
            <div class="demo-account__inline-form">
              <Input v-model.number="salaryAmount" type="number" min="1" step="100" />
              <Button variant="secondary" :disabled="store.isMutating" @click="createSalaryRule">Включить</Button>
            </div>
          </article>
        </section>

        <section class="demo-account__chart-card">
          <h2>Стоимость портфеля</h2>
          <div class="demo-account__bars">
            <span v-for="(bar, index) in portfolioBars" :key="index" :style="{ height: `${bar}%` }" />
          </div>
          <div class="demo-account__months">
            <span>Апрель</span>
            <span>Июнь</span>
            <span>Август</span>
            <span>Октябрь</span>
            <span>Декабрь</span>
            <span>Февраль</span>
          </div>
        </section>

        <section class="demo-account__overview-grid">
          <article class="demo-account__panel">
            <h2>Аналитика</h2>
            <div class="demo-account__donut">
              <div>
                <strong>{{ formatMoney(portfolioTotalRub, 'RUB') }}</strong>
                <span>{{ store.positions.length }} активов</span>
              </div>
            </div>
          </article>
          <article class="demo-account__panel">
            <h2>Последние события</h2>
            <div class="demo-account__event-list">
              <article v-for="event in events.slice(0, 4)" :key="event.id">
                <div>
                  <strong>{{ event.title }}</strong>
                  <span>{{ event.subtitle }}</span>
                </div>
                <div>
                  <b :class="{ 'demo-account__positive': event.amount >= 0 }">{{ formatMoney(event.amount, event.currency) }}</b>
                  <span>{{ formatDate(event.date) }}</span>
                </div>
              </article>
            </div>
          </article>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'catalog'" class="demo-account__catalog">
      <div class="demo-account__search demo-account__search--wide">
        <Search class="demo-account__search-icon" />
        <Input v-model="searchQuery" placeholder="Название или тикер" />
      </div>

      <nav class="demo-account__catalog-tabs" aria-label="Категории каталога">
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

      <h2>Каталог {{ catalogKind === 'stock' ? 'акций' : 'инструментов' }}</h2>

      <section class="demo-account__catalog-status">
        <article>
          <span>Инструментов найдено</span>
          <strong>{{ catalogInstruments.length }}</strong>
        </article>
        <article>
          <span>Котировки загружены</span>
          <strong>{{ isCatalogLoading ? 'Обновляем' : `${quoteCoverage}%` }}</strong>
        </article>
        <article>
          <span>Источники данных</span>
          <strong>MOEX ISS / Stooq</strong>
        </article>
      </section>

      <div class="demo-account__filters">
        <select v-model="filterCurrency" class="demo-account__select">
          <option value="all">Валюта</option>
          <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
        </select>
        <select v-model="filterCountry" class="demo-account__select">
          <option value="all">Страна</option>
          <option value="RU">Россия</option>
          <option value="US">США</option>
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
            <span class="demo-account__instrument-logo demo-account__instrument-logo--large" :class="instrumentTone(selectedInstrumentDetails.instrument)">
              {{ instrumentInitials(selectedInstrumentDetails.instrument) }}
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
                  ? formatMoney(
                      selectedInstrumentDetails.instrument.demo_price_cache.price,
                      selectedInstrumentDetails.instrument.demo_price_cache.currency,
                    )
                  : 'Нет цены'
              }}
            </strong>
            <span
              :class="{
                'demo-account__positive':
                  Number(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent ?? 0) >= 0,
              }"
            >
              {{ formatPercent(selectedInstrumentDetails.instrument.demo_price_cache?.change_percent ?? null) }}
            </span>
          </div>
        </div>

        <div class="demo-account__details-grid">
          <article class="demo-account__chart-panel">
            <div class="demo-account__section-title">
              <h2>График цены</h2>
              <span>Последние 120 торговых дней</span>
            </div>
            <svg v-if="chartPolyline" class="demo-account__price-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline :points="chartPolyline" fill="none" stroke="currentColor" stroke-width="2.8" vector-effect="non-scaling-stroke" />
            </svg>
            <p v-else class="demo-account__muted">История появится после обновления котировок.</p>
          </article>

          <article class="demo-account__order-panel">
            <h2>Покупка</h2>
            <p>
              Покупка идет только за {{ selectedInstrumentDetails.instrument.currency }}.
              Если валюты не хватает, сначала купите ее в обменнике.
            </p>
            <Label :for="`buy-detail-${selectedInstrumentDetails.instrument.id}`">Количество</Label>
            <Input
              :id="`buy-detail-${selectedInstrumentDetails.instrument.id}`"
              v-model.number="buyQuantities[selectedInstrumentDetails.instrument.id]"
              type="number"
              min="0.00000001"
              step="1"
            />
            <Button
              :disabled="store.isMutating || !selectedInstrumentDetails.instrument.demo_price_cache"
              @click="buyInstrument(selectedInstrumentDetails.instrument)"
            >
              Купить
            </Button>
          </article>
        </div>

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
            <strong :class="{ 'demo-account__positive': Number(selectedInstrumentDetails.stats.periodChangePercent ?? 0) >= 0 }">
              {{ selectedInstrumentDetails.stats.periodChangePercent === null ? '—' : `${selectedInstrumentDetails.stats.periodChangePercent.toFixed(2)}%` }}
            </strong>
          </article>
        </div>
      </div>

      <div v-else class="demo-account__table">
        <div class="demo-account__table-head">
          <span>Название</span>
          <span>Цена</span>
          <span>За день</span>
          <span>Биржа</span>
        </div>
        <div v-if="catalogInstruments.length === 0" class="demo-account__empty-state">
          <strong>Инструменты не найдены</strong>
          <span>Попробуйте изменить поиск, валюту, страну или биржу.</span>
        </div>
        <article
          v-for="instrument in catalogInstruments"
          :key="instrument.id"
          class="demo-account__table-row"
          role="button"
          tabindex="0"
          @click="openInstrument(instrument)"
          @keydown.enter="openInstrument(instrument)"
        >
          <div class="demo-account__instrument-name">
            <span class="demo-account__instrument-logo" :class="instrumentTone(instrument)">
              {{ instrumentInitials(instrument) }}
            </span>
            <div>
              <strong>{{ instrument.name }}</strong>
              <span>{{ instrument.symbol }}</span>
            </div>
          </div>
          <div class="demo-account__price-cell" :class="{ 'demo-account__price-cell--empty': !instrument.demo_price_cache }">
            <strong>{{ priceText(instrument) }}</strong>
            <span>{{ quoteAge(instrument) }}</span>
          </div>
          <div class="demo-account__change-cell">
            <b :class="{ 'demo-account__positive': Number(instrument.demo_price_cache?.change_percent ?? 0) >= 0 }">
              {{ formatPercent(instrument.demo_price_cache?.change_percent ?? null) }}
            </b>
            <span>{{ changeAbsText(instrument) }}</span>
          </div>
          <div class="demo-account__exchange-cell">
            <strong>{{ instrument.exchange }}</strong>
            <span>{{ instrumentCountry(instrument) }} · {{ instrument.currency }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'analytics'" class="demo-account__analytics">
      <article class="demo-account__panel">
        <h2>Распределение</h2>
        <div class="demo-account__allocation">
          <div class="demo-account__donut">
            <div>
              <strong>{{ formatMoney(portfolioTotalRub, 'RUB') }}</strong>
              <span>{{ store.positions.length }} активов</span>
            </div>
          </div>
          <div class="demo-account__allocation-list">
            <article v-for="item in allocation" :key="item.label">
              <span>{{ item.label }}</span>
              <b>{{ item.percent.toFixed(1) }}%</b>
              <strong>{{ formatMoney(item.value, 'RUB') }}</strong>
            </article>
          </div>
        </div>
      </article>

      <article class="demo-account__panel">
        <h2>Валюта</h2>
        <div class="demo-account__cash-grid demo-account__cash-grid--inside">
          <article v-for="currency in currencies" :key="currency" class="demo-account__cash-card">
            <span>{{ currency }}</span>
            <strong>{{ formatMoney(cashAmount(currency), currency) }}</strong>
          </article>
        </div>
      </article>
    </section>

    <section v-else class="demo-account__events">
      <article class="demo-account__panel">
        <h2>События</h2>
        <div class="demo-account__event-list">
          <article v-for="event in events" :key="event.id">
            <div>
              <strong>{{ event.title }}</strong>
              <span>{{ event.subtitle }}</span>
            </div>
            <div>
              <b :class="{ 'demo-account__positive': event.amount >= 0 }">{{ formatMoney(event.amount, event.currency) }}</b>
              <span>{{ formatDate(event.date) }}</span>
            </div>
          </article>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.demo-account {
  display: grid;
  gap: 22px;
}

.demo-account__topbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 10px;
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
.demo-account__months,
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
  border-color: hsl(45 100% 50%) !important;
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

.demo-account__account-row {
  display: flex;
  gap: 12px;
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
  height: 56px;
  border-radius: 10px;
  background: hsl(var(--muted) / 0.5);
}

.demo-account__hero {
  min-height: 186px;
  border-radius: 18px;
  background: linear-gradient(135deg, hsl(225 4% 32%), hsl(238 13% 21%));
  color: white;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding: 28px 32px;
}

.demo-account__hero div,
.demo-account__actions article,
.demo-account__cash-card,
.demo-account__allocation-list article {
  display: grid;
  gap: 8px;
}

.demo-account__hero strong {
  font-size: 24px;
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

.demo-account__currency-icon,
.demo-account__button-icon {
  width: 16px;
  height: 16px;
}

.demo-account__actions,
.demo-account__overview-grid,
.demo-account__cash-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__cash-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.demo-account__actions article,
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
.demo-account__chart-card,
.demo-account__panel,
.demo-account__cash-card {
  padding: 18px;
}

.demo-account__inline-form,
.demo-account__exchange-mini,
.demo-account__buy-cell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.demo-account__exchange-mini {
  grid-template-columns: 70px 70px minmax(0, 1fr) auto;
}

.demo-account__select {
  height: 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--background));
  padding: 0 10px;
}

.demo-account__bars {
  height: 210px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  align-items: end;
  gap: 28px;
  border-bottom: 1px solid hsl(var(--border));
  padding: 20px 16px 0;
}

.demo-account__bars span {
  border-radius: 7px 7px 0 0;
  background: hsl(206 65% 62%);
}

.demo-account__months {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
}

.demo-account__donut {
  width: 190px;
  aspect-ratio: 1;
  border: 14px solid hsl(198 84% 61%);
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin: 20px auto 0;
}

.demo-account__donut div {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.demo-account__event-list {
  display: grid;
}

.demo-account__event-list article {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__event-list article:last-child {
  border-bottom: 0;
}

.demo-account__catalog-tabs button {
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  background: hsl(var(--card));
}

.demo-account__filters {
  align-items: center;
}

.demo-account__catalog-status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.demo-account__catalog-status article {
  display: grid;
  gap: 6px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--card));
  padding: 14px 16px;
}

.demo-account__catalog-status span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
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
  background: hsl(var(--muted) / 0.42);
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

.demo-account__instrument-name {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
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
  background: linear-gradient(135deg, hsl(42 95% 50%), hsl(24 89% 56%));
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

.demo-account__details-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.7fr);
  gap: 16px;
}

.demo-account__chart-panel,
.demo-account__order-panel {
  padding: 20px;
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
  margin-top: 18px;
  overflow: visible;
}

.demo-account__order-panel {
  display: grid;
  gap: 12px;
  align-content: start;
}

.demo-account__stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.demo-account__stats-grid article {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.demo-account__error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 8px;
  color: hsl(0 75% 32%);
  background: hsl(0 83% 96%);
}

.demo-account__analytics {
  grid-template-columns: 1fr;
}

.demo-account__allocation {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.demo-account__allocation-list {
  display: grid;
  gap: 12px;
}

.demo-account__allocation-list article {
  grid-template-columns: minmax(0, 1fr) 80px 140px;
  align-items: center;
}

@media (max-width: 1100px) {
  .demo-account__overview,
  .demo-account__hero,
  .demo-account__actions,
  .demo-account__overview-grid,
  .demo-account__cash-grid,
  .demo-account__allocation,
  .demo-account__details-grid,
  .demo-account__stats-grid {
    grid-template-columns: 1fr;
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
  .demo-account__event-list article,
  .demo-account__instrument-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .demo-account__instrument-hero strong {
    text-align: left;
  }

  .demo-account__inline-form,
  .demo-account__exchange-mini,
  .demo-account__buy-cell {
    grid-template-columns: 1fr;
  }
}
</style>
