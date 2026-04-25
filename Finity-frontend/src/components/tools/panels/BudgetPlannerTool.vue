<template>
  <ToolPageShell
    eyebrow="Инструменты • Бюджет"
    title="Планировщик личного бюджета"
    description="Инструмент фиксирует доходы и расходы по категориям, показывает итоговый баланс и помогает увидеть, какие статьи затрат сильнее всего влияют на финансовую устойчивость."
    theme="ocean"
  >
    <template #hero-panel>
      <div class="budget-tool__hero-metrics">
        <ToolMetricCard label="Доходы" :value="formatCurrency(totalIncome)" note="Совокупный приток средств за расчётный месяц." tone="accent" />
        <ToolMetricCard label="Расходы" :value="formatCurrency(totalExpenses)" note="Сумма всех обязательных и переменных трат." tone="warning" />
        <ToolMetricCard label="Баланс" :value="formatCurrency(balance)" :note="balanceNote" :tone="balanceTone" />
      </div>
    </template>

    <div class="budget-tool__layout">
      <Card class="budget-tool__editor-card">
        <section class="budget-tool__editor-section">
          <div class="budget-tool__section-head">
            <h2 class="budget-tool__section-title">Доходы</h2>
            <Button type="button" variant="outline" size="sm" @click="addIncome">Добавить</Button>
          </div>

          <div class="budget-tool__entry-list">
            <div v-for="income in incomes" :key="income.id" class="budget-tool__entry-row">
              <Input v-model="income.name" placeholder="Источник дохода" />
              <Input :model-value="String(income.amount)" type="number" min="0" @update:model-value="updateAmount(income, $event)" />
              <Button type="button" variant="ghost" size="sm" class="budget-tool__entry-remove" @click="removeIncome(income.id)">Удалить</Button>
            </div>
          </div>
        </section>

        <section class="budget-tool__editor-section">
          <div class="budget-tool__section-head">
            <h2 class="budget-tool__section-title">Расходы</h2>
            <Button type="button" variant="outline" size="sm" @click="addExpense">Добавить</Button>
          </div>

          <div class="budget-tool__entry-list">
            <div v-for="expense in expenses" :key="expense.id" class="budget-tool__entry-row">
              <Input v-model="expense.name" placeholder="Категория расхода" />
              <Input :model-value="String(expense.amount)" type="number" min="0" @update:model-value="updateAmount(expense, $event)" />
              <Button type="button" variant="ghost" size="sm" class="budget-tool__entry-remove" @click="removeExpense(expense.id)">Удалить</Button>
            </div>
          </div>
        </section>
      </Card>

      <div class="budget-tool__analysis-column">
        <Card class="budget-tool__analysis-card">
          <div class="budget-tool__section-head budget-tool__section-head--compact">
            <h2 class="budget-tool__section-title">Структура расходов</h2>
            <span class="budget-tool__tag">{{ formatPercent(savingsRate) }} на накопление</span>
          </div>

          <div class="budget-tool__bar-list">
            <article v-for="expense in orderedExpenses" :key="expense.id" class="budget-tool__bar-item">
              <div class="budget-tool__bar-head">
                <strong class="budget-tool__bar-label">{{ expense.name }}</strong>
                <span class="budget-tool__bar-value">{{ formatCurrency(expense.amount) }}</span>
              </div>
              <div class="budget-tool__bar-track">
                <div class="budget-tool__bar-fill" :style="{ width: `${expense.percent}%` }" />
              </div>
              <p class="budget-tool__bar-note">{{ formatPercent(expense.percent) }} от общего объёма расходов</p>
            </article>
          </div>
        </Card>

        <Card class="budget-tool__analysis-card">
          <h2 class="budget-tool__section-title">Ключевые выводы</h2>
          <div class="budget-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="budget-tool__insight-item">
              <strong class="budget-tool__insight-title">{{ insight.title }}</strong>
              <p class="budget-tool__insight-text">{{ insight.text }}</p>
            </article>
          </div>
        </Card>
      </div>
    </div>
  </ToolPageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import ToolMetricCard from '@/components/tools/ToolMetricCard.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import { clampPercent, formatCurrency, formatPercent, sumMoney, type MoneyEntry } from '@/lib/financial-tools'

const incomes = ref<MoneyEntry[]>([
  { id: crypto.randomUUID(), name: 'Заработная плата', amount: 90000 },
  { id: crypto.randomUUID(), name: 'Подработка', amount: 12000 },
])

const expenses = ref<MoneyEntry[]>([
  { id: crypto.randomUUID(), name: 'Жильё и коммунальные услуги', amount: 26000 },
  { id: crypto.randomUUID(), name: 'Продукты', amount: 18000 },
  { id: crypto.randomUUID(), name: 'Транспорт', amount: 6500 },
  { id: crypto.randomUUID(), name: 'Кредитные платежи', amount: 12000 },
  { id: crypto.randomUUID(), name: 'Досуг', amount: 9000 },
])

const totalIncome = computed(() => sumMoney(incomes.value))
const totalExpenses = computed(() => sumMoney(expenses.value))
const balance = computed(() => totalIncome.value - totalExpenses.value)
const savingsRate = computed(() => {
  if (totalIncome.value <= 0) return 0
  return clampPercent((Math.max(0, balance.value) / totalIncome.value) * 100)
})

const orderedExpenses = computed(() => {
  if (totalExpenses.value <= 0) {
    return expenses.value.map((expense) => ({ ...expense, percent: 0 }))
  }

  return [...expenses.value]
    .map((expense) => ({
      ...expense,
      percent: clampPercent((expense.amount / totalExpenses.value) * 100),
    }))
    .sort((left, right) => right.amount - left.amount)
})

const largestExpense = computed(() => orderedExpenses.value[0] ?? null)
const balanceTone = computed(() => {
  if (balance.value < 0) return 'warning'
  if (savingsRate.value >= 20) return 'positive'
  return 'accent'
})

const balanceNote = computed(() => {
  if (balance.value < 0) return 'Расходы превышают доходы — план нужно корректировать.'
  if (savingsRate.value >= 20) return 'Есть устойчивый резерв для накоплений и целей.'
  return 'Баланс положительный, но доля свободных средств пока ограничена.'
})

const insights = computed(() => {
  const result = [] as { title: string; text: string }[]

  if (balance.value < 0) {
    result.push({
      title: 'Дефицит бюджета',
      text: 'Текущий набор расходов превышает доход. В первую очередь имеет смысл пересмотреть переменные категории и необязательные траты.',
    })
  } else {
    result.push({
      title: 'Положительный остаток',
      text: `После всех расходов остаётся ${formatCurrency(balance.value)}. Эти средства можно направить в резерв, накопления или досрочное погашение обязательств.`,
    })
  }

  if (largestExpense.value) {
    result.push({
      title: 'Самая тяжёлая категория',
      text: `Наибольшая нагрузка приходится на статью «${largestExpense.value.name}». Она занимает ${formatPercent(largestExpense.value.percent)} от общего объёма расходов.`,
    })
  }

  if (savingsRate.value < 10) {
    result.push({
      title: 'Низкая доля накоплений',
      text: 'Свободный остаток меньше комфортного уровня. Стоит посмотреть, какие категории можно ограничить без потери базовой устойчивости.',
    })
  } else if (savingsRate.value < 20) {
    result.push({
      title: 'Умеренный запас',
      text: 'Баланс уже позволяет формировать накопления, но для подушки безопасности полезно постепенно нарастить долю свободных средств.',
    })
  } else {
    result.push({
      title: 'Хорошая финансовая дисциплина',
      text: 'Доля остатка соответствует устойчивой модели. При таком балансе проще формировать резерв и цели без дополнительной нагрузки.',
    })
  }

  return result
})

function addIncome() {
  incomes.value.push({
    id: crypto.randomUUID(),
    name: 'Новый доход',
    amount: 0,
  })
}

function addExpense() {
  expenses.value.push({
    id: crypto.randomUUID(),
    name: 'Новый расход',
    amount: 0,
  })
}

function removeIncome(entryId: string) {
  if (incomes.value.length <= 1) return
  incomes.value = incomes.value.filter((entry) => entry.id !== entryId)
}

function removeExpense(entryId: string) {
  if (expenses.value.length <= 1) return
  expenses.value = expenses.value.filter((entry) => entry.id !== entryId)
}

function updateAmount(entry: MoneyEntry, value: string | number) {
  const nextValue = Number(value)
  entry.amount = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.budget-tool__hero-metrics,
.budget-tool__analysis-column,
.budget-tool__entry-list,
.budget-tool__bar-list,
.budget-tool__insight-list {
  display: grid;
  gap: 12px;
}

.budget-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(340px, 0.88fr);
  gap: 16px;
  align-items: start;
}

.budget-tool__editor-card,
.budget-tool__analysis-card {
  display: grid;
  gap: 18px;
  padding: 18px;
  border-radius: 20px;
}

.budget-tool__editor-section {
  display: grid;
  gap: 12px;
}

.budget-tool__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.budget-tool__section-head--compact {
  align-items: flex-start;
}

.budget-tool__section-title,
.budget-tool__insight-title {
  margin: 0;
  line-height: 1.16;
}

.budget-tool__tag {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  display: inline-flex;
  align-items: center;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.budget-tool__entry-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px auto;
  gap: 10px;
  align-items: center;
}

.budget-tool__entry-remove {
  justify-self: start;
}

.budget-tool__bar-item,
.budget-tool__insight-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.budget-tool__bar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.budget-tool__bar-label,
.budget-tool__bar-value {
  line-height: 1.2;
}

.budget-tool__bar-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
}

.budget-tool__bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, hsl(205 91% 56%), hsl(224 74% 62%));
}

.budget-tool__bar-note,
.budget-tool__insight-text {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

@media (max-width: 1080px) {
  .budget-tool__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .budget-tool__entry-row {
    grid-template-columns: 1fr;
  }

  .budget-tool__section-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
