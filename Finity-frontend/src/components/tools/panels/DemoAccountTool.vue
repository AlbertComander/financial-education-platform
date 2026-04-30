<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { DollarSign, Euro, RefreshCw, RussianRuble, WalletCards } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoAccountStore } from '@/stores/demo-account'
import type { DemoInstrument, DemoPosition } from '@/types/demo-account'

type DisplayCurrency = 'RUB' | 'USD' | 'EUR'

const store = useDemoAccountStore()
const displayCurrency = ref<DisplayCurrency>('RUB')
const depositAmount = ref(100000)
const salaryAmount = ref(150000)
const salaryDay = ref(5)
const exchangeFrom = ref('RUB')
const exchangeTo = ref('USD')
const exchangeAmount = ref(10000)
const buyQuantities = reactive<Record<string, number>>({})
const sellQuantities = reactive<Record<string, number>>({})

const portfolioTotalRub = computed(() => Number(store.summary?.totalValue ?? 0))
const cashValueRub = computed(() => Number(store.summary?.cashValueRub ?? store.summary?.cashBalance ?? 0))
const positionsValueRub = computed(() => Number(store.summary?.positionsValue ?? 0))
const investedValueRub = computed(() => Number(store.summary?.investedValue ?? 0))
const portfolioPnlRub = computed(() => positionsValueRub.value - investedValueRub.value)
const pricedInstruments = computed(() => store.instruments.filter((instrument) => instrument.demo_price_cache))
const marketInstruments = computed(() => store.instruments.filter((instrument) => instrument.asset_type !== 'currency'))
const currencyInstruments = computed(() => store.instruments.filter((instrument) => instrument.asset_type === 'currency'))
const currencies = ['RUB', 'USD', 'EUR', 'CNY']

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
const displayRate = computed(() => {
  if (displayCurrency.value === 'USD') return findRate('USDRUB')
  if (displayCurrency.value === 'EUR') return findRate('EURRUB')
  return 1
})
const convertedPortfolioTotal = computed(() => convertRubAmount(portfolioTotalRub.value))
const balanceRateNote = computed(() => {
  if (displayCurrency.value === 'RUB') return 'Базовая оценка в рублях'
  if (!displayRate.value) return 'Обновите цены, чтобы подтянуть курс'
  return `1 ${displayCurrency.value} = ${formatMoney(displayRate.value, 'RUB')}`
})

function findRate(symbol: string) {
  const instrument = store.instruments.find((item) => item.symbol === symbol)
  const price = Number(instrument?.demo_price_cache?.price)
  return Number.isFinite(price) && price > 0 ? price : null
}

function convertRubAmount(value: number) {
  if (displayCurrency.value === 'RUB') return value
  return displayRate.value ? value / displayRate.value : 0
}

function cycleDisplayCurrency() {
  displayCurrency.value = nextDisplayCurrency.value
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
  if (value === null) return '0%'
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

function isPositive(value: string | number) {
  return Number(value) >= 0
}

function quantityFor(instrument: DemoInstrument) {
  return buyQuantities[instrument.id] ?? 1
}

function sellQuantityFor(position: DemoPosition) {
  return sellQuantities[position.instrument_id] ?? Number(position.quantity)
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

onMounted(() => {
  void store.fetchOverview()
})
</script>

<template>
  <section class="demo-account">
    <header class="demo-account__header">
      <div>
        <p class="demo-account__eyebrow">Инвестиционная песочница</p>
        <h1>Демо-счет</h1>
        <p class="demo-account__lead">
          Учебный портфель с реальными котировками, отдельными валютными остатками и покупкой активов только за валюту инструмента.
        </p>
      </div>

      <Button variant="outline" class="demo-account__refresh" :disabled="store.isMutating" @click="store.refreshQuotes">
        <RefreshCw class="demo-account__button-icon" />
        Обновить цены
      </Button>
    </header>

    <p v-if="store.error" class="demo-account__error">{{ store.error }}</p>

    <section class="demo-account__summary">
      <article class="demo-account__balance">
        <div class="demo-account__balance-head">
          <span class="demo-account__metric-label">Общий баланс</span>
          <button type="button" class="demo-account__currency-toggle" :title="`Показать в ${nextDisplayCurrency}`" @click="cycleDisplayCurrency">
            <component :is="nextCurrencyIcon" class="demo-account__currency-icon" />
          </button>
        </div>
        <strong>{{ formatMoney(convertedPortfolioTotal, displayCurrency) }}</strong>
        <span>Деньги: {{ formatMoney(cashValueRub, 'RUB') }} · Активы: {{ formatMoney(positionsValueRub, 'RUB') }}</span>
        <small>{{ balanceRateNote }}</small>
      </article>

      <article class="demo-account__metric">
        <span class="demo-account__metric-label">Результат портфеля</span>
        <strong :class="{ 'demo-account__positive': portfolioPnlRub >= 0 }">{{ formatMoney(portfolioPnlRub, 'RUB') }}</strong>
        <span>Без учета учебных пополнений и обменов валют</span>
      </article>

      <article class="demo-account__metric">
        <span class="demo-account__metric-label">Котировки</span>
        <strong>{{ pricedInstruments.length }}/{{ store.instruments.length }}</strong>
        <span>MOEX для РФ, Stooq для зарубежных инструментов</span>
      </article>
    </section>

    <section class="demo-account__cash-grid">
      <article v-for="currency in currencies" :key="currency" class="demo-account__cash-card">
        <span>{{ currency }}</span>
        <strong>{{ formatMoney(cashAmount(currency), currency) }}</strong>
      </article>
    </section>

    <section class="demo-account__workspace">
      <article class="demo-account__panel">
        <div class="demo-account__panel-heading">
          <WalletCards class="demo-account__panel-icon" />
          <div>
            <h2>Деньги и поступления</h2>
            <p>Пополнения начисляются в рублях, а иностранную валюту нужно покупать отдельно.</p>
          </div>
        </div>

        <div class="demo-account__form-row">
          <div class="demo-account__field">
            <Label for="demo-deposit">Сумма, ₽</Label>
            <Input id="demo-deposit" v-model.number="depositAmount" type="number" min="1" step="100" />
          </div>
          <Button :disabled="store.isMutating" @click="deposit">Начислить</Button>
        </div>

        <div class="demo-account__form-row demo-account__form-row--salary">
          <div class="demo-account__field">
            <Label for="demo-salary">Ежемесячно, ₽</Label>
            <Input id="demo-salary" v-model.number="salaryAmount" type="number" min="1" step="100" />
          </div>
          <div class="demo-account__field demo-account__field--day">
            <Label for="demo-salary-day">День</Label>
            <Input id="demo-salary-day" v-model.number="salaryDay" type="number" min="1" max="28" />
          </div>
          <Button variant="secondary" :disabled="store.isMutating" @click="createSalaryRule">Добавить</Button>
        </div>
      </article>

      <article class="demo-account__panel">
        <h2>Обмен валюты</h2>
        <p>Покупка зарубежных активов станет доступна только после покупки нужной валюты.</p>
        <div class="demo-account__exchange-row">
          <div class="demo-account__field">
            <Label for="exchange-from">Из</Label>
            <select id="exchange-from" v-model="exchangeFrom" class="demo-account__select">
              <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
            </select>
          </div>
          <div class="demo-account__field">
            <Label for="exchange-to">В</Label>
            <select id="exchange-to" v-model="exchangeTo" class="demo-account__select">
              <option v-for="currency in currencies" :key="currency" :value="currency">{{ currency }}</option>
            </select>
          </div>
          <div class="demo-account__field">
            <Label for="exchange-amount">Сумма</Label>
            <Input id="exchange-amount" v-model.number="exchangeAmount" type="number" min="0.01" step="100" />
          </div>
          <Button :disabled="store.isMutating || exchangeFrom === exchangeTo" @click="exchangeCurrency">Обменять</Button>
        </div>
        <div class="demo-account__fx-list">
          <span v-for="instrument in currencyInstruments" :key="instrument.id">
            {{ instrument.symbol }}:
            <b>{{ instrument.demo_price_cache ? formatMoney(instrument.demo_price_cache.price, 'RUB') : 'нет цены' }}</b>
          </span>
        </div>
      </article>
    </section>

    <section class="demo-account__panel">
      <div class="demo-account__section-title">
        <h2>Портфель</h2>
        <span>Продажа выполняется из позиции, без отдельной вкладки сделок</span>
      </div>

      <div v-if="store.positions.length" class="demo-account__positions">
        <article v-for="position in store.positions" :key="position.instrument_id" class="demo-account__position">
          <div>
            <strong>{{ position.demo_instruments.symbol }}</strong>
            <span>{{ position.demo_instruments.name }}</span>
          </div>
          <div>
            <small>Количество</small>
            <b>{{ formatQuantity(position.quantity) }}</b>
          </div>
          <div>
            <small>Стоимость</small>
            <b>{{ formatMoney(position.marketValueRub, 'RUB') }}</b>
          </div>
          <div>
            <small>PnL</small>
            <b :class="{ 'demo-account__positive': isPositive(position.unrealizedPnlRub) }">
              {{ formatMoney(position.unrealizedPnlRub, 'RUB') }}
            </b>
          </div>
          <div class="demo-account__position-actions">
            <Input v-model.number="sellQuantities[position.instrument_id]" type="number" min="0.00000001" :max="Number(position.quantity)" step="1" />
            <Button variant="outline" :disabled="store.isMutating" @click="sellPosition(position)">Продать</Button>
          </div>
        </article>
      </div>
      <p v-else class="demo-account__muted">Портфель пока пуст. Обновите цены и купите первый инструмент в рыночной карточке.</p>
    </section>

    <section class="demo-account__market">
      <div class="demo-account__section-title">
        <h2>Рынок</h2>
        <span>Российские акции через MOEX ISS, зарубежные инструменты через внешний провайдер котировок</span>
      </div>

      <div class="demo-account__instrument-grid">
        <article v-for="instrument in marketInstruments" :key="instrument.id" class="demo-account__instrument">
          <div class="demo-account__instrument-head">
            <div>
              <strong>{{ instrument.symbol }}</strong>
              <span>{{ instrument.name }}</span>
            </div>
            <small>{{ instrument.exchange }}</small>
          </div>

          <div v-if="instrument.demo_price_cache" class="demo-account__quote">
            <b>{{ formatMoney(instrument.demo_price_cache.price, instrument.demo_price_cache.currency) }}</b>
            <span :class="{ 'demo-account__quote-change--positive': Number(instrument.demo_price_cache.change_percent) >= 0 }">
              {{ formatPercent(instrument.demo_price_cache.change_percent) }}
            </span>
          </div>
          <p v-else class="demo-account__muted">Цена появится после обновления котировок.</p>

          <div class="demo-account__buy-row">
            <Input v-model.number="buyQuantities[instrument.id]" type="number" min="0.00000001" step="1" />
            <Button :disabled="store.isMutating || !instrument.demo_price_cache" @click="buyInstrument(instrument)">
              Купить за {{ instrument.currency }}
            </Button>
          </div>
        </article>
      </div>
    </section>

    <section class="demo-account__workspace">
      <article class="demo-account__panel">
        <h2>Последние сделки</h2>
        <div v-if="store.trades.length" class="demo-account__list">
          <article v-for="trade in store.trades" :key="trade.id" class="demo-account__list-item">
            <div>
              <strong>{{ trade.side === 'buy' ? 'Покупка' : 'Продажа' }} {{ trade.demo_instruments.symbol }}</strong>
              <span>{{ formatDate(trade.executed_at) }} · {{ formatQuantity(trade.quantity) }} шт.</span>
            </div>
            <b>{{ formatMoney(trade.price, trade.currency) }}</b>
          </article>
        </div>
        <p v-else class="demo-account__muted">Сделок пока нет.</p>
      </article>

      <article class="demo-account__panel">
        <h2>Операции с деньгами</h2>
        <div v-if="store.transactions.length" class="demo-account__list">
          <article v-for="transaction in store.transactions" :key="transaction.id" class="demo-account__list-item">
            <div>
              <strong>{{ transaction.description ?? 'Операция по счету' }}</strong>
              <span>{{ formatDate(transaction.effective_at) }}</span>
            </div>
            <b>{{ formatMoney(transaction.amount, transaction.currency) }}</b>
          </article>
        </div>
        <p v-else class="demo-account__muted">Операций пока нет.</p>
      </article>
    </section>
  </section>
</template>

<style scoped>
.demo-account {
  display: grid;
  gap: 20px;
}

.demo-account__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, hsl(205 58% 20%), hsl(164 48% 28%));
  color: white;
}

.demo-account__eyebrow,
.demo-account__metric-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.78;
}

.demo-account__header h1 {
  margin: 6px 0 8px;
  font-size: 34px;
  line-height: 1.1;
}

.demo-account__lead {
  margin: 0;
  max-width: 720px;
  color: hsl(0 0% 100% / 0.82);
}

.demo-account__refresh {
  background: hsl(0 0% 100% / 0.12);
  color: white;
  border-color: hsl(0 0% 100% / 0.28);
}

.demo-account__button-icon,
.demo-account__panel-icon,
.demo-account__currency-icon {
  width: 16px;
  height: 16px;
}

.demo-account__error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 8px;
  color: hsl(0 75% 32%);
  background: hsl(0 83% 96%);
}

.demo-account__summary,
.demo-account__cash-grid,
.demo-account__workspace,
.demo-account__instrument-grid {
  display: grid;
  gap: 14px;
}

.demo-account__summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.demo-account__cash-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.demo-account__workspace {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.demo-account__instrument-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.demo-account__balance,
.demo-account__metric,
.demo-account__cash-card,
.demo-account__panel,
.demo-account__instrument {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  box-shadow: 0 10px 24px hsl(220 35% 20% / 0.06);
}

.demo-account__balance,
.demo-account__metric,
.demo-account__cash-card,
.demo-account__panel,
.demo-account__instrument,
.demo-account__market {
  padding: 18px;
}

.demo-account__balance,
.demo-account__metric,
.demo-account__cash-card {
  display: grid;
  gap: 8px;
}

.demo-account__balance-head,
.demo-account__section-title,
.demo-account__instrument-head,
.demo-account__quote,
.demo-account__list-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
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

.demo-account__balance strong,
.demo-account__metric strong,
.demo-account__cash-card strong {
  font-size: 24px;
}

.demo-account__balance span,
.demo-account__metric span:last-child,
.demo-account__muted,
.demo-account__balance small,
.demo-account__cash-card span,
.demo-account__panel p,
.demo-account__section-title span,
.demo-account__list-item span,
.demo-account__position span,
.demo-account__position small,
.demo-account__fx-list {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__positive {
  color: hsl(150 72% 30%) !important;
}

.demo-account__panel-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.demo-account__panel h2,
.demo-account__section-title h2 {
  margin: 0;
  font-size: 20px;
}

.demo-account__form-row,
.demo-account__form-row--salary,
.demo-account__exchange-row,
.demo-account__buy-row,
.demo-account__position-actions {
  display: grid;
  gap: 12px;
  align-items: end;
}

.demo-account__form-row {
  grid-template-columns: minmax(0, 1fr) auto;
}

.demo-account__form-row--salary,
.demo-account__exchange-row {
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
}

.demo-account__buy-row,
.demo-account__position-actions {
  grid-template-columns: minmax(0, 1fr) auto;
}

.demo-account__form-row + .demo-account__form-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid hsl(var(--border));
}

.demo-account__field,
.demo-account__list,
.demo-account__positions {
  display: grid;
  gap: 8px;
}

.demo-account__select {
  height: 40px;
  min-width: 0;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  padding: 0 10px;
  color: hsl(var(--foreground));
}

.demo-account__fx-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.demo-account__position {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(110px, 1fr)) minmax(190px, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__position:last-child,
.demo-account__list-item:last-child {
  border-bottom: 0;
}

.demo-account__list-item {
  padding: 12px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__instrument {
  display: grid;
  gap: 14px;
}

.demo-account__instrument-head div {
  display: grid;
  gap: 4px;
}

.demo-account__instrument-head span,
.demo-account__instrument small {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__quote b {
  font-size: 18px;
}

.demo-account__quote span {
  color: hsl(0 70% 42%);
  font-weight: 700;
}

.demo-account__quote-change--positive {
  color: hsl(150 72% 30%) !important;
}

@media (max-width: 1100px) {
  .demo-account__summary,
  .demo-account__cash-grid,
  .demo-account__workspace,
  .demo-account__instrument-grid {
    grid-template-columns: 1fr;
  }

  .demo-account__position {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .demo-account__header,
  .demo-account__section-title,
  .demo-account__list-item {
    flex-direction: column;
  }

  .demo-account__form-row,
  .demo-account__form-row--salary,
  .demo-account__exchange-row,
  .demo-account__buy-row,
  .demo-account__position-actions,
  .demo-account__position {
    grid-template-columns: 1fr;
  }
}
</style>
