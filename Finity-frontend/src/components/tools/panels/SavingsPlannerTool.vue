<template>
  <ToolPageShell
    eyebrow="Инструменты • Цели"
    title="Калькулятор накоплений"
    description="Инструмент помогает оценить, хватает ли текущего темпа накопления для цели, сколько времени займёт путь и какой ежемесячный взнос нужен для заданного срока."
    theme="teal"
  >
    <template #hero-panel>
      <div class="savings-tool__hero-grid">
        <ToolMetricCard
          label="Цель"
          :value="formatCurrency(goalAmount)"
          note="Финансовая цель, которую пользователь планирует достичь."
          tone="accent"
        />
        <ToolMetricCard
          label="Через заданный срок"
          :value="formatCurrency(projectedBalance)"
          :note="projectionNote"
          :tone="projectionTone"
        />
        <ToolMetricCard
          label="До достижения"
          :value="monthsToGoalLabel"
          :note="monthsToGoalNote"
          :tone="monthsToGoalTone"
        />
      </div>
    </template>

    <div class="savings-tool__layout">
      <Card class="savings-tool__panel savings-tool__panel--form">
        <div class="savings-tool__panel-head">
          <h2 class="savings-tool__panel-title">Параметры цели</h2>
          <p class="savings-tool__panel-description">Введите цель, текущую стартовую сумму, регулярный вклад и ожидаемую доходность.</p>
        </div>

        <div class="savings-tool__field-grid">
          <div class="savings-tool__field">
            <Label for="savings-goal">Сумма цели</Label>
            <Input id="savings-goal" :model-value="String(goalAmount)" type="number" min="0" @update:model-value="goalAmount = toNumber($event)" />
          </div>
          <div class="savings-tool__field">
            <Label for="savings-current">Уже накоплено</Label>
            <Input id="savings-current" :model-value="String(currentAmount)" type="number" min="0" @update:model-value="currentAmount = toNumber($event)" />
          </div>
          <div class="savings-tool__field">
            <Label for="savings-contribution">Ежемесячный взнос</Label>
            <Input id="savings-contribution" :model-value="String(monthlyContribution)" type="number" min="0" @update:model-value="monthlyContribution = toNumber($event)" />
          </div>
          <div class="savings-tool__field">
            <Label for="savings-rate">Ожидаемая доходность, % годовых</Label>
            <Input id="savings-rate" :model-value="String(annualRate)" type="number" min="0" @update:model-value="annualRate = toNumber($event)" />
          </div>
          <div class="savings-tool__field">
            <Label for="savings-months">Плановый срок, месяцев</Label>
            <Input id="savings-months" :model-value="String(targetMonths)" type="number" min="1" @update:model-value="targetMonths = Math.max(1, toNumber($event))" />
          </div>
        </div>
      </Card>

      <div class="savings-tool__analysis-column">
        <Card class="savings-tool__panel">
          <div class="savings-tool__summary-grid">
            <ToolMetricCard label="Прогресс к цели" :value="formatPercent(progressPercent)" :note="progressNote" :tone="progressTone" />
            <ToolMetricCard label="Нужный взнос" :value="formatCurrency(requiredMonthlyContribution)" :note="requiredContributionNote" :tone="requiredContributionTone" />
            <ToolMetricCard label="Разница по сроку" :value="termGapLabel" :note="termGapNote" :tone="termGapTone" />
          </div>

          <div class="savings-tool__progress-card">
            <div class="savings-tool__progress-head">
              <h3 class="savings-tool__progress-title">Текущая траектория</h3>
              <span class="savings-tool__progress-status" :class="`savings-tool__progress-status--${projectionTone}`">{{ projectionStatus }}</span>
            </div>
            <div class="savings-tool__progress-track">
              <div class="savings-tool__progress-fill" :class="`savings-tool__progress-fill--${projectionTone}`" :style="{ width: `${progressPercent}%` }" />
            </div>
            <p class="savings-tool__progress-note">{{ trajectoryDescription }}</p>
          </div>
        </Card>

        <Card class="savings-tool__panel">
          <div class="savings-tool__panel-head">
            <h2 class="savings-tool__panel-title">Практические выводы</h2>
          </div>

          <div class="savings-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="savings-tool__insight-card">
              <h3 class="savings-tool__insight-title">{{ insight.title }}</h3>
              <p class="savings-tool__insight-text">{{ insight.text }}</p>
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
import {
  calculateFutureValue,
  calculateMonthsToGoal,
  calculateRequiredMonthlyContribution,
  clampPercent,
  formatCurrency,
  formatPercent,
} from '@/lib/financial-tools'

const goalAmount = ref(420000)
const currentAmount = ref(90000)
const monthlyContribution = ref(16000)
const annualRate = ref(10)
const targetMonths = ref(18)

const projectedBalance = computed(() => calculateFutureValue(currentAmount.value, monthlyContribution.value, annualRate.value, targetMonths.value))
const monthsToGoal = computed(() => calculateMonthsToGoal(goalAmount.value, currentAmount.value, monthlyContribution.value, annualRate.value))
const requiredMonthlyContribution = computed(() => calculateRequiredMonthlyContribution(goalAmount.value, currentAmount.value, annualRate.value, targetMonths.value))
const progressPercent = computed(() => {
  if (goalAmount.value <= 0) return 0
  return clampPercent((Math.max(0, currentAmount.value) / goalAmount.value) * 100)
})
const goalGap = computed(() => Math.max(0, goalAmount.value - projectedBalance.value))
const termGap = computed(() => {
  if (monthsToGoal.value === null) return null
  return monthsToGoal.value - targetMonths.value
})

const projectionTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (projectedBalance.value >= goalAmount.value) return 'positive'
  if (goalGap.value > goalAmount.value * 0.2) return 'warning'
  return 'accent'
})

const projectionNote = computed(() => {
  if (projectedBalance.value >= goalAmount.value) return 'Текущая стратегия позволяет уложиться в плановый срок.'
  return `До цели в заданный срок не хватает ${formatCurrency(goalGap.value)}.`
})

const monthsToGoalLabel = computed(() => {
  if (monthsToGoal.value === null) return 'Не рассчитано'
  return `${monthsToGoal.value} мес.`
})

const monthsToGoalNote = computed(() => {
  if (monthsToGoal.value === null) return 'Нужно задать хотя бы ежемесячный взнос или положительную доходность.'
  return 'Оценка показывает, когда цель будет достигнута при текущем темпе.'
})

const monthsToGoalTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (monthsToGoal.value === null) return 'warning'
  if (monthsToGoal.value <= targetMonths.value) return 'positive'
  if (monthsToGoal.value - targetMonths.value <= 6) return 'accent'
  return 'warning'
})

const progressNote = computed(() => `${formatCurrency(currentAmount.value)} уже накоплено.`)
const progressTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (progressPercent.value >= 50) return 'positive'
  if (progressPercent.value >= 20) return 'accent'
  return 'warning'
})

const requiredContributionNote = computed(() => {
  if (requiredMonthlyContribution.value <= monthlyContribution.value) return 'Текущий взнос уже достаточен для цели в выбранный срок.'
  return 'Это ориентир по новому ежемесячному взносу, если срок менять не хочется.'
})

const requiredContributionTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (requiredMonthlyContribution.value <= monthlyContribution.value) return 'positive'
  if (requiredMonthlyContribution.value - monthlyContribution.value > monthlyContribution.value * 0.35) return 'warning'
  return 'accent'
})

const termGapLabel = computed(() => {
  if (termGap.value === null) return '—'
  if (termGap.value <= 0) return `${Math.abs(termGap.value)} мес. в запасе`
  return `+${termGap.value} мес.`
})

const termGapNote = computed(() => {
  if (termGap.value === null) return 'Текущее сочетание параметров не позволяет оценить срок.'
  if (termGap.value <= 0) return 'Траектория укладывается в выбранный горизонт.'
  return 'Столько месяцев не хватает к желаемому сроку при текущем взносе.'
})

const termGapTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (termGap.value === null) return 'warning'
  if (termGap.value <= 0) return 'positive'
  if (termGap.value <= 6) return 'accent'
  return 'warning'
})

const projectionStatus = computed(() => {
  if (projectedBalance.value >= goalAmount.value) return 'Цель достижима'
  if (goalGap.value <= goalAmount.value * 0.1) return 'Почти хватает'
  return 'Нужно усилить темп'
})

const trajectoryDescription = computed(() => {
  if (projectedBalance.value >= goalAmount.value) {
    return 'При текущем темпе и ожидаемой доходности цель достижима в выбранный срок без дополнительной корректировки.'
  }
  return 'Текущая траектория пока не закрывает цель полностью. Логичнее выбирать между увеличением ежемесячного взноса и пересмотром горизонта.'
})

const insights = computed(() => {
  const result = [] as { title: string; text: string }[]

  if (projectedBalance.value >= goalAmount.value) {
    result.push({
      title: 'Стратегия уже выглядит рабочей',
      text: 'Текущий темп накопления вместе с доходностью позволяет достичь цели без дополнительного ускорения. Это хороший момент, чтобы закрепить дисциплину и не снимать накопления на промежуточные траты.',
    })
  } else {
    result.push({
      title: 'План требует корректировки',
      text: 'Если оставить текущие параметры без изменений, целевая сумма не будет достигнута вовремя. На практике помогают либо увеличение взноса, либо сдвиг горизонта на несколько месяцев.',
    })
  }

  if (requiredMonthlyContribution.value > monthlyContribution.value) {
    result.push({
      title: 'Нужен более высокий регулярный вклад',
      text: `Чтобы уложиться в срок, ежемесячный взнос стоит поднять примерно до ${formatCurrency(requiredMonthlyContribution.value)}.`,
    })
  } else {
    result.push({
      title: 'Текущий вклад достаточен',
      text: 'Размер регулярного пополнения не выглядит узким местом. Основной фокус можно держать на стабильности самого графика накопления.',
    })
  }

  result.push({
    title: 'Доходность не заменяет регулярность',
    text: 'Даже при умеренной доходности основную роль в достижении цели обычно играет сам ежемесячный взнос и отсутствие длинных пауз в пополнении.',
  })

  return result
})

function toNumber(value: string | number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.savings-tool__hero-grid,
.savings-tool__analysis-column,
.savings-tool__summary-grid,
.savings-tool__insight-list {
  display: grid;
  gap: 12px;
}

.savings-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: start;
}

.savings-tool__panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
}

.savings-tool__panel--form {
  position: sticky;
  top: 12px;
}

.savings-tool__panel-head {
  display: grid;
  gap: 4px;
}

.savings-tool__panel-title,
.savings-tool__progress-title,
.savings-tool__insight-title {
  margin: 0;
  line-height: 1.15;
}

.savings-tool__panel-description,
.savings-tool__progress-note,
.savings-tool__insight-text {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

.savings-tool__field-grid {
  display: grid;
  gap: 12px;
}

.savings-tool__field {
  display: grid;
  gap: 6px;
}

.savings-tool__progress-card,
.savings-tool__insight-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.savings-tool__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.savings-tool__progress-status {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  border: 1px solid transparent;
}

.savings-tool__progress-status--positive {
  color: hsl(146 66% 28%);
  background: hsl(145 58% 94%);
  border-color: hsl(145 40% 80%);
}

.savings-tool__progress-status--warning {
  color: hsl(18 78% 37%);
  background: hsl(18 88% 95%);
  border-color: hsl(18 74% 84%);
}

.savings-tool__progress-status--accent {
  color: hsl(194 64% 34%);
  background: hsl(194 100% 97%);
  border-color: hsl(194 70% 84%);
}

.savings-tool__progress-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
}

.savings-tool__progress-fill {
  height: 100%;
  border-radius: inherit;
}

.savings-tool__progress-fill--positive {
  background: linear-gradient(90deg, hsl(155 60% 42%), hsl(188 70% 44%));
}

.savings-tool__progress-fill--warning {
  background: linear-gradient(90deg, hsl(24 95% 57%), hsl(354 83% 63%));
}

.savings-tool__progress-fill--accent {
  background: linear-gradient(90deg, hsl(173 73% 39%), hsl(207 86% 55%));
}

@media (max-width: 1080px) {
  .savings-tool__layout {
    grid-template-columns: 1fr;
  }

  .savings-tool__panel--form {
    position: static;
  }
}
</style>
