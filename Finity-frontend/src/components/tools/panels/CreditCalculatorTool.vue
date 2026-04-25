<template>
  <ToolPageShell
    eyebrow="Инструменты • Обязательства"
    title="Кредитный калькулятор"
    description="Калькулятор помогает оценить ежемесячную нагрузку по кредиту, общий объём переплаты и эффект от регулярного досрочного погашения."
    theme="rose"
  >
    <template #hero-panel>
      <div class="credit-tool__hero-grid">
        <ToolMetricCard
          label="Ежемесячный платёж"
          :value="formatCurrency(basePlan.monthlyPayment)"
          note="Аннуитетный платёж без учёта дополнительных досрочных взносов."
          tone="accent"
        />
        <ToolMetricCard
          label="Переплата"
          :value="formatCurrency(activePlan.totalInterest)"
          :note="interestNote"
          :tone="interestTone"
        />
        <ToolMetricCard
          label="Срок закрытия"
          :value="`${activePlan.payoffMonths} мес.`"
          :note="payoffNote"
          :tone="payoffTone"
        />
      </div>
    </template>

    <div class="credit-tool__layout">
      <Card class="credit-tool__panel credit-tool__panel--form">
        <div class="credit-tool__panel-head">
          <h2 class="credit-tool__panel-title">Параметры кредита</h2>
          <p class="credit-tool__panel-description">Укажите сумму, ставку, срок и возможный ежемесячный досрочный платёж.</p>
        </div>

        <div class="credit-tool__field-grid">
          <div class="credit-tool__field">
            <Label for="credit-amount">Сумма кредита</Label>
            <Input id="credit-amount" :model-value="String(principal)" type="number" min="0" @update:model-value="principal = toNumber($event)" />
          </div>
          <div class="credit-tool__field">
            <Label for="credit-rate">Ставка, % годовых</Label>
            <Input id="credit-rate" :model-value="String(annualRate)" type="number" min="0" @update:model-value="annualRate = toNumber($event)" />
          </div>
          <div class="credit-tool__field">
            <Label for="credit-months">Срок, месяцев</Label>
            <Input id="credit-months" :model-value="String(months)" type="number" min="1" @update:model-value="months = Math.max(1, toNumber($event))" />
          </div>
          <div class="credit-tool__field">
            <Label for="credit-extra">Досрочное погашение в месяц</Label>
            <Input id="credit-extra" :model-value="String(extraPayment)" type="number" min="0" @update:model-value="extraPayment = toNumber($event)" />
          </div>
        </div>
      </Card>

      <div class="credit-tool__analysis-column">
        <Card class="credit-tool__panel">
          <div class="credit-tool__comparison-grid">
            <ToolMetricCard label="Общая выплата" :value="formatCurrency(activePlan.totalPaid)" note="Сумма всех ежемесячных платежей по активному сценарию." tone="warning" />
            <ToolMetricCard label="Экономия на процентах" :value="formatCurrency(interestSaved)" :note="interestSavedNote" :tone="interestSavedTone" />
            <ToolMetricCard label="Сокращение срока" :value="`${monthsSaved} мес.`" :note="monthsSavedNote" :tone="monthsSavedTone" />
          </div>
        </Card>

        <Card class="credit-tool__panel">
          <div class="credit-tool__panel-head">
            <h2 class="credit-tool__panel-title">Первые месяцы графика</h2>
            <p class="credit-tool__panel-description">Таблица помогает увидеть, какая часть платежа уходит в проценты, а какая уменьшает основной долг.</p>
          </div>

          <div class="credit-tool__table-wrap">
            <table class="credit-tool__table">
              <thead>
                <tr>
                  <th>Месяц</th>
                  <th>Платёж</th>
                  <th>В проценты</th>
                  <th>В основной долг</th>
                  <th>Остаток</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in schedulePreview" :key="row.month">
                  <td>{{ row.month }}</td>
                  <td>{{ formatCurrency(row.payment) }}</td>
                  <td>{{ formatCurrency(row.interestPart) }}</td>
                  <td>{{ formatCurrency(row.principalPart) }}</td>
                  <td>{{ formatCurrency(row.balanceAfterPayment) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card class="credit-tool__panel">
          <div class="credit-tool__panel-head">
            <h2 class="credit-tool__panel-title">Практические выводы</h2>
          </div>

          <div class="credit-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="credit-tool__insight-card">
              <h3 class="credit-tool__insight-title">{{ insight.title }}</h3>
              <p class="credit-tool__insight-text">{{ insight.text }}</p>
            </article>
          </div>
        </Card>
      </div>
    </div>
  </ToolPageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ToolMetricCard from '@/components/tools/ToolMetricCard.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import { calculateCreditPlan, formatCurrency } from '@/lib/financial-tools'

const principal = ref(650000)
const annualRate = ref(19)
const months = ref(36)
const extraPayment = ref(5000)

const basePlan = computed(() => calculateCreditPlan(principal.value, annualRate.value, months.value, 0))
const activePlan = computed(() => calculateCreditPlan(principal.value, annualRate.value, months.value, extraPayment.value))
const interestSaved = computed(() => Math.max(0, basePlan.value.totalInterest - activePlan.value.totalInterest))
const monthsSaved = computed(() => Math.max(0, basePlan.value.payoffMonths - activePlan.value.payoffMonths))
const schedulePreview = computed(() => activePlan.value.schedule.slice(0, 6))

const interestTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (activePlan.value.totalInterest <= principal.value * 0.2) return 'positive'
  if (activePlan.value.totalInterest >= principal.value * 0.45) return 'warning'
  return 'accent'
})

const interestNote = computed(() => {
  if (extraPayment.value > 0) {
    return `С учётом досрочного платежа экономится ${formatCurrency(interestSaved.value)} по процентам.`
  }
  return 'Это стоимость использования заёмных средств по заданному сценарию.'
})

const payoffTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (monthsSaved.value >= 6) return 'positive'
  if (months.value > 60) return 'warning'
  return 'accent'
})

const payoffNote = computed(() => {
  if (monthsSaved.value > 0) return `Срок сокращён на ${monthsSaved.value} мес. за счёт регулярного досрочного платежа.`
  return 'Сценарий без досрочного ускорения.'
})

const interestSavedTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (interestSaved.value > 0) return 'positive'
  return 'accent'
})

const interestSavedNote = computed(() => {
  if (interestSaved.value > 0) return 'Разница между базовым графиком и сценарием с досрочным платежом.'
  return 'Пока досрочный платёж не задан, экономии на процентах нет.'
})

const monthsSavedTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (monthsSaved.value > 0) return 'positive'
  return 'accent'
})

const monthsSavedNote = computed(() => {
  if (monthsSaved.value > 0) return 'Количество месяцев, на которое сокращается график.'
  return 'Срок совпадает с исходным договорным периодом.'
})

const insights = computed(() => {
  const result = [] as { title: string; text: string }[]

  if (activePlan.value.monthlyPayment > principal.value * 0.03) {
    result.push({
      title: 'Нагрузка на ежемесячный поток довольно высокая',
      text: 'Если платёж забирает слишком большую долю свободного дохода, запас устойчивости быстро уменьшается. В таком сценарии особенно важна отдельная подушка безопасности.',
    })
  } else {
    result.push({
      title: 'Ежемесячный платёж выглядит управляемо',
      text: 'Текущий уровень платежа не выглядит экстремальным. Это не отменяет переплату, но снижает риск кассового разрыва в обычном месяце.',
    })
  }

  if (interestSaved.value > 0) {
    result.push({
      title: 'Досрочное погашение действительно работает',
      text: `Даже регулярный небольшой досрочный взнос сокращает переплату на ${formatCurrency(interestSaved.value)} и уменьшает срок обслуживания долга.`,
    })
  } else {
    result.push({
      title: 'Без досрочного платежа переплата остаётся полной',
      text: 'Если доход позволяет, даже небольшой фиксированный досрочный платёж способен заметно улучшить итоговую стоимость кредита.',
    })
  }

  result.push({
    title: 'График полезно оценивать по структуре платежа',
    text: 'В начале срока значительная часть аннуитетного платежа уходит в проценты. Поэтому эффект от досрочного погашения особенно заметен на ранних этапах кредита.',
  })

  return result
})

function toNumber(value: string | number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.credit-tool__hero-grid,
.credit-tool__analysis-column,
.credit-tool__comparison-grid,
.credit-tool__insight-list {
  display: grid;
  gap: 12px;
}

.credit-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: start;
}

.credit-tool__panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
}

.credit-tool__panel--form {
  position: sticky;
  top: 12px;
}

.credit-tool__panel-head {
  display: grid;
  gap: 4px;
}

.credit-tool__panel-title,
.credit-tool__insight-title {
  margin: 0;
  line-height: 1.15;
}

.credit-tool__panel-description,
.credit-tool__insight-text {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

.credit-tool__field-grid {
  display: grid;
  gap: 12px;
}

.credit-tool__field {
  display: grid;
  gap: 6px;
}

.credit-tool__table-wrap {
  overflow-x: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
}

.credit-tool__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

.credit-tool__table th,
.credit-tool__table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid hsl(var(--border));
  font-size: 14px;
}

.credit-tool__table th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 0.35);
}

.credit-tool__table tbody tr:last-child td {
  border-bottom: 0;
}

.credit-tool__insight-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

@media (max-width: 1080px) {
  .credit-tool__layout {
    grid-template-columns: 1fr;
  }

  .credit-tool__panel--form {
    position: static;
  }
}
</style>
