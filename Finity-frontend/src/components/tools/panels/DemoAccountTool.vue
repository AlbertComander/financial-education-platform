<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArrowDownUp,
  DollarSign,
  Euro,
  RefreshCw,
  RussianRuble,
  WalletCards,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoAccountStore } from '@/stores/demo-account'

type DisplayCurrency = 'RUB' | 'USD' | 'EUR'
type TradeSide = 'buy' | 'sell'

const store = useDemoAccountStore()
const displayCurrency = ref<DisplayCurrency>('RUB')
const depositAmount = ref(100000)
const salaryAmount = ref(150000)
const salaryDay = ref(5)
const selectedInstrumentId = ref<number | null>(null)
const tradeQuantity = ref(1)
const tradeSide = ref<TradeSide>('buy')

const accountCurrency = computed(() => store.account?.currency ?? 'RUB')
const portfolioTotal = computed(() => Number(store.summary?.totalValue ?? store.account?.cash_balance ?? 0))
const cashBalance = computed(() => Number(store.account?.cash_balance ?? 0))
const positionsValue = computed(() => Number(store.summary?.positionsValue ?? 0))
const investedValue = computed(() => Number(store.summary?.investedValue ?? 0))
const portfolioPnl = computed(() => positionsValue.value - investedValue.value)
const pricedInstruments = computed(() => store.instruments.filter((instrument) => instrument.demo_price_cache))
const tradeableInstruments = computed(() =>
  store.instruments.filter((instrument) => instrument.demo_price_cache && instrument.asset_type !== 'currency'),
)
const selectedInstrument = computed(() =>
  store.instruments.find((instrument) => Number(instrument.id) === selectedInstrumentId.value) ?? null,
)

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
const usdRubRate = computed(() => findRate('USDRUB'))
const eurRubRate = computed(() => findRate('EURRUB'))
const displayRate = computed(() => {
  if (displayCurrency.value === 'USD') return usdRubRate.value
  if (displayCurrency.value === 'EUR') return eurRubRate.value
  return 1
})
const convertedPortfolioTotal = computed(() => convertRubAmount(portfolioTotal.value))
const convertedCashBalance = computed(() => convertRubAmount(cashBalance.value))
const balanceRateNote = computed(() => {
  if (displayCurrency.value === 'RUB') return 'Базовая валюта демо-счета'
  if (!displayRate.value) return 'Нажмите обновить цены, чтобы подтянуть курс'
  return `Курс: 1 ${displayCurrency.value} = ${formatMoney(displayRate.value, 'RUB')}`
})
const estimatedTradeRub = computed(() => {
  const quote = selectedInstrument.value?.demo_price_cache
  if (!quote) return 0
  const price = Number(quote.price)
  const rate = quote.currency === 'USD' ? usdRubRate.value : quote.currency === 'EUR' ? eurRubRate.value : 1
  return rate ? price * tradeQuantity.value * rate : 0
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

function formatMoney(value: string | number, selectedCurrency: DisplayCurrency | string = accountCurrency.value) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: selectedCurrency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatQuantity(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 8,
  }).format(Number.isFinite(amount) ? amount : 0)
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

async function deposit() {
  await store.depositCash(depositAmount.value, 'Учебное пополнение')
}

async function createSalaryRule() {
  await store.createIncomeRule('Ежемесячное демо-пополнение', salaryAmount.value, salaryDay.value)
}

async function placeTrade() {
  if (!selectedInstrumentId.value) return
  await store.placeTrade(tradeSide.value, selectedInstrumentId.value, tradeQuantity.value)
}

watch(
  tradeableInstruments,
  (items) => {
    if (!selectedInstrumentId.value && items[0]) {
      selectedInstrumentId.value = Number(items[0].id)
    }
  },
  { immediate: true },
)

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
          Учебный счет с виртуальными рублями, регулярными пополнениями, настоящими котировками и пробными сделками.
        </p>
      </div>

      <Button variant="outline" class="demo-account__refresh" :disabled="store.isMutating" @click="store.refreshQuotes">
        <RefreshCw class="demo-account__button-icon" />
        Обновить цены
      </Button>
    </header>

    <p v-if="store.error" class="demo-account__error">{{ store.error }}</p>

    <div class="demo-account__summary">
      <article class="demo-account__balance">
        <div class="demo-account__balance-head">
          <span class="demo-account__metric-label">Общий баланс</span>
          <button
            type="button"
            class="demo-account__currency-toggle"
            :title="`Показать в ${nextDisplayCurrency}`"
            @click="cycleDisplayCurrency"
          >
            <component :is="nextCurrencyIcon" class="demo-account__currency-icon" />
          </button>
        </div>
        <strong>{{ formatMoney(convertedPortfolioTotal, displayCurrency) }}</strong>
        <span>Свободные деньги: {{ formatMoney(convertedCashBalance, displayCurrency) }}</span>
        <small>{{ balanceRateNote }}</small>
      </article>

      <article class="demo-account__metric">
        <span class="demo-account__metric-label">В инструментах</span>
        <strong>{{ formatMoney(positionsValue, 'RUB') }}</strong>
        <span :class="{ 'demo-account__positive': portfolioPnl >= 0 }">
          PnL: {{ formatMoney(portfolioPnl, 'RUB') }}
        </span>
      </article>

      <article class="demo-account__metric">
        <span class="demo-account__metric-label">Рыночные данные</span>
        <strong>{{ pricedInstruments.length }}/{{ store.instruments.length }}</strong>
        <span>Котировки нужны для сделок и валютного отображения</span>
      </article>
    </div>

    <div class="demo-account__workspace">
      <section class="demo-account__panel">
        <div class="demo-account__panel-heading">
          <WalletCards class="demo-account__panel-icon" />
          <div>
            <h2>Деньги и поступления</h2>
            <p>Пополнения учебные, но баланс и операции ведутся как на настоящем счете.</p>
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

        <div v-if="store.incomeRules.length" class="demo-account__income-rules">
          <article v-for="rule in store.incomeRules" :key="rule.id" class="demo-account__income-rule">
            <div>
              <strong>{{ rule.title }}</strong>
              <span>{{ formatMoney(rule.amount, rule.currency) }} · {{ rule.day_of_month }} число</span>
            </div>
            <small>{{ rule.is_active ? formatDate(rule.next_run_at) : 'пауза' }}</small>
          </article>
        </div>
      </section>

      <section class="demo-account__panel">
        <div class="demo-account__panel-heading">
          <ArrowDownUp class="demo-account__panel-icon" />
          <div>
            <h2>Сделка</h2>
            <p>Покупка списывает рубли по текущему курсу, продажа возвращает рубли на счет.</p>
          </div>
        </div>

        <div class="demo-account__trade-grid">
          <div class="demo-account__field">
            <Label for="demo-trade-side">Действие</Label>
            <select id="demo-trade-side" v-model="tradeSide" class="demo-account__select">
              <option value="buy">Купить</option>
              <option value="sell">Продать</option>
            </select>
          </div>

          <div class="demo-account__field">
            <Label for="demo-instrument">Инструмент</Label>
            <select id="demo-instrument" v-model.number="selectedInstrumentId" class="demo-account__select">
              <option v-for="instrument in tradeableInstruments" :key="instrument.id" :value="Number(instrument.id)">
                {{ instrument.symbol }} · {{ instrument.name }}
              </option>
            </select>
          </div>

          <div class="demo-account__field">
            <Label for="demo-quantity">Количество</Label>
            <Input id="demo-quantity" v-model.number="tradeQuantity" type="number" min="0.00000001" step="1" />
          </div>
        </div>

        <div class="demo-account__trade-footer">
          <span>Оценка сделки: {{ formatMoney(estimatedTradeRub, 'RUB') }}</span>
          <Button :disabled="store.isMutating || !selectedInstrumentId" @click="placeTrade">
            {{ tradeSide === 'buy' ? 'Купить' : 'Продать' }}
          </Button>
        </div>
      </section>
    </div>

    <section class="demo-account__panel">
      <div class="demo-account__section-title">
        <h2>Портфель</h2>
        <span>Позиции оцениваются в рублях по последним доступным ценам и курсам</span>
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
            <small>Средняя</small>
            <b>{{ formatMoney(position.avg_price, position.demo_instruments.currency) }}</b>
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
        </article>
      </div>
      <p v-else class="demo-account__muted">Портфель пока пуст. Обновите цены и совершите первую учебную покупку.</p>
    </section>

    <div class="demo-account__workspace">
      <section class="demo-account__panel">
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
      </section>

      <section class="demo-account__panel">
        <h2>Последние операции</h2>
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
      </section>
    </div>

    <section class="demo-account__market">
      <div class="demo-account__section-title">
        <h2>Рыночные инструменты</h2>
        <span>Акции, ETF, валюта и крипто для первого учебного портфеля</span>
      </div>

      <div class="demo-account__instrument-grid">
        <article v-for="instrument in store.instruments" :key="instrument.id" class="demo-account__instrument">
          <div class="demo-account__instrument-head">
            <div>
              <strong>{{ instrument.symbol }}</strong>
              <span>{{ instrument.name }}</span>
            </div>
            <small>{{ instrument.asset_type }}</small>
          </div>

          <div v-if="instrument.demo_price_cache" class="demo-account__quote">
            <b>{{ formatMoney(instrument.demo_price_cache.price, instrument.demo_price_cache.currency) }}</b>
            <span :class="{ 'demo-account__quote-change--positive': Number(instrument.demo_price_cache.change_percent) >= 0 }">
              {{ formatPercent(instrument.demo_price_cache.change_percent) }}
            </span>
          </div>
          <p v-else class="demo-account__muted">Цена появится после обновления котировок.</p>

          <footer>{{ instrument.exchange }} · {{ instrument.sector }}</footer>
        </article>
      </div>
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
  align-items: flex-start;
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
  letter-spacing: 0;
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
  max-width: 620px;
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
.demo-account__workspace {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.demo-account__workspace {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.demo-account__balance,
.demo-account__metric,
.demo-account__panel,
.demo-account__instrument {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  box-shadow: 0 10px 24px hsl(220 35% 20% / 0.06);
}

.demo-account__balance,
.demo-account__metric {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.demo-account__balance-head {
  display: flex;
  align-items: center;
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

.demo-account__currency-toggle:hover {
  background: hsl(var(--accent));
}

.demo-account__balance strong,
.demo-account__metric strong {
  font-size: 26px;
  line-height: 1.1;
}

.demo-account__balance > span,
.demo-account__metric span:last-child,
.demo-account__muted,
.demo-account__balance small {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__positive {
  color: hsl(150 72% 30%) !important;
}

.demo-account__panel,
.demo-account__market {
  padding: 20px;
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

.demo-account__panel p,
.demo-account__section-title span {
  margin: 4px 0 0;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}

.demo-account__form-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.demo-account__form-row + .demo-account__form-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid hsl(var(--border));
}

.demo-account__form-row--salary,
.demo-account__trade-grid {
  grid-template-columns: minmax(0, 1fr) 92px auto;
}

.demo-account__field {
  display: grid;
  gap: 7px;
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

.demo-account__trade-grid {
  display: grid;
  gap: 12px;
}

.demo-account__trade-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid hsl(var(--border));
}

.demo-account__list,
.demo-account__positions,
.demo-account__income-rules {
  display: grid;
  gap: 10px;
}

.demo-account__list-item,
.demo-account__position,
.demo-account__income-rule {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid hsl(var(--border));
}

.demo-account__position {
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) repeat(4, minmax(110px, 1fr));
  align-items: center;
}

.demo-account__list-item:last-child,
.demo-account__position:last-child,
.demo-account__income-rule:last-child {
  border-bottom: 0;
}

.demo-account__list-item div,
.demo-account__position div,
.demo-account__income-rule div {
  display: grid;
  gap: 3px;
}

.demo-account__list-item span,
.demo-account__position span,
.demo-account__position small,
.demo-account__income-rule span,
.demo-account__income-rule small {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__income-rules {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid hsl(var(--border));
}

.demo-account__market {
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
}

.demo-account__section-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.demo-account__instrument-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.demo-account__instrument {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.demo-account__instrument-head,
.demo-account__quote {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.demo-account__instrument-head div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.demo-account__instrument-head span,
.demo-account__instrument footer {
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.demo-account__instrument-head small {
  border-radius: 999px;
  padding: 4px 8px;
  background: hsl(164 48% 92%);
  color: hsl(164 48% 23%);
  font-weight: 700;
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
  .demo-account__position {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .demo-account__header,
  .demo-account__section-title,
  .demo-account__trade-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .demo-account__summary,
  .demo-account__workspace,
  .demo-account__instrument-grid,
  .demo-account__form-row,
  .demo-account__form-row--salary,
  .demo-account__trade-grid {
    grid-template-columns: 1fr;
  }
}
</style>
