<template>
  <ToolPageShell
    eyebrow="Инструменты • Баланс"
    title="Калькулятор по правилу 50/30/20"
    description="Модель помогает увидеть, насколько текущая структура расходов соответствует базовому финансовому балансу: обязательные траты, гибкие желания и накопления."
    theme="sunset"
  >
    <template #hero-panel>
      <div class="rule-tool__hero-grid">
        <ToolMetricCard
          label="Чистый доход"
          :value="formatCurrency(netIncomeValue)"
          note="База для расчёта нормативного распределения по модели 50/30/20."
          tone="accent"
        />
        <ToolMetricCard
          label="Распределено"
          :value="formatCurrency(totalActual)"
          :note="allocationNote"
          :tone="allocationTone"
        />
        <ToolMetricCard
          label="Баланс модели"
          :value="formatCurrency(balanceGap)"
          :note="balanceGapNote"
          :tone="balanceGapTone"
        />
      </div>
    </template>

    <div class="rule-tool__layout">
      <Card class="rule-tool__panel rule-tool__panel--form">
        <div class="rule-tool__panel-head">
          <h2 class="rule-tool__panel-title">Исходные данные</h2>
          <p class="rule-tool__panel-description">Введите чистый доход и фактическое распределение по трём блокам.</p>
        </div>

        <div class="rule-tool__field-grid">
          <div class="rule-tool__field">
            <Label for="rule-income">Чистый доход в месяц</Label>
            <Input id="rule-income" :model-value="String(netIncome)" type="number" min="0" @update:model-value="netIncome = toNumber($event)" />
          </div>
          <div class="rule-tool__field">
            <Label for="rule-needs">Обязательные расходы</Label>
            <Input id="rule-needs" :model-value="String(actualNeeds)" type="number" min="0" @update:model-value="actualNeeds = toNumber($event)" />
          </div>
          <div class="rule-tool__field">
            <Label for="rule-wants">Желательные расходы</Label>
            <Input id="rule-wants" :model-value="String(actualWants)" type="number" min="0" @update:model-value="actualWants = toNumber($event)" />
          </div>
          <div class="rule-tool__field">
            <Label for="rule-savings">Накопления и инвестиции</Label>
            <Input id="rule-savings" :model-value="String(actualSavings)" type="number" min="0" @update:model-value="actualSavings = toNumber($event)" />
          </div>
        </div>
      </Card>

      <div class="rule-tool__analysis-column">
        <Card class="rule-tool__panel">
          <div class="rule-tool__panel-head">
            <h2 class="rule-tool__panel-title">Сравнение с моделью</h2>
            <p class="rule-tool__panel-description">Целевые значения пересчитываются автоматически от введённого дохода.</p>
          </div>

          <div class="rule-tool__category-list">
            <article v-for="item in categoryCards" :key="item.id" class="rule-tool__category-card">
              <div class="rule-tool__category-head">
                <div>
                  <h3 class="rule-tool__category-title">{{ item.title }}</h3>
                  <p class="rule-tool__category-share">Цель: {{ item.targetShare }}</p>
                </div>
                <span class="rule-tool__category-status" :class="`rule-tool__category-status--${item.tone}`">{{ item.status }}</span>
              </div>

              <div class="rule-tool__category-values">
                <p class="rule-tool__category-metric">Факт: <strong>{{ formatCurrency(item.actual) }}</strong></p>
                <p class="rule-tool__category-metric">Норма: <strong>{{ formatCurrency(item.target) }}</strong></p>
                <p class="rule-tool__category-metric">Отклонение: <strong>{{ item.deviationLabel }}</strong></p>
              </div>

              <div class="rule-tool__bar-track">
                <div class="rule-tool__bar-fill" :class="`rule-tool__bar-fill--${item.tone}`" :style="{ width: `${item.actualPercent}%` }" />
              </div>
              <p class="rule-tool__bar-caption">Фактическая доля: {{ item.actualPercentLabel }}</p>
            </article>
          </div>
        </Card>

        <Card class="rule-tool__panel">
          <div class="rule-tool__panel-head">
            <h2 class="rule-tool__panel-title">Интерпретация</h2>
          </div>

          <div class="rule-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="rule-tool__insight-card">
              <h3 class="rule-tool__insight-title">{{ insight.title }}</h3>
              <p class="rule-tool__insight-text">{{ insight.text }}</p>
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
import { clampPercent, formatCurrency, formatPercent, sanitizeNumber } from '@/lib/financial-tools'

type RuleCategoryCard = {
  id: 'needs' | 'wants' | 'savings'
  title: string
  targetShare: string
  actual: number
  target: number
  actualPercent: number
  actualPercentLabel: string
  deviation: number
  deviationLabel: string
  status: string
  tone: 'positive' | 'warning' | 'accent'
}

const netIncome = ref(95000)
const actualNeeds = ref(48000)
const actualWants = ref(23000)
const actualSavings = ref(17000)

const netIncomeValue = computed(() => Math.max(0, sanitizeNumber(netIncome.value)))
const totalActual = computed(() => Math.max(0, sanitizeNumber(actualNeeds.value) + sanitizeNumber(actualWants.value) + sanitizeNumber(actualSavings.value)))
const targetNeeds = computed(() => netIncomeValue.value * 0.5)
const targetWants = computed(() => netIncomeValue.value * 0.3)
const targetSavings = computed(() => netIncomeValue.value * 0.2)
const balanceGap = computed(() => netIncomeValue.value - totalActual.value)

const allocationTone = computed(() => {
  if (totalActual.value > netIncomeValue.value) return 'warning'
  if (Math.abs(balanceGap.value) <= 3000) return 'positive'
  return 'accent'
})

const allocationNote = computed(() => {
  if (totalActual.value > netIncomeValue.value) {
    return 'Суммарные категории уже превышают доступный доход.'
  }
  return `Свободный остаток после распределения: ${formatCurrency(Math.max(0, balanceGap.value))}.`
})

const balanceGapTone = computed(() => {
  if (balanceGap.value < 0) return 'warning'
  if (balanceGap.value <= 5000) return 'positive'
  return 'accent'
})

const balanceGapNote = computed(() => {
  if (balanceGap.value < 0) return 'Текущий сценарий перегружен и требует сокращения расходов.'
  if (balanceGap.value <= 5000) return 'Распределение близко к полному и выглядит управляемо.'
  return 'Часть дохода пока не распределена и может быть направлена в резерв или цель.'
})

const categoryCards = computed<RuleCategoryCard[]>(() => {
  const income = netIncomeValue.value || 1
  const definitions = [
    {
      id: 'needs' as const,
      title: 'Обязательные расходы',
      targetShare: '50%',
      actual: Math.max(0, sanitizeNumber(actualNeeds.value)),
      target: targetNeeds.value,
    },
    {
      id: 'wants' as const,
      title: 'Желательные расходы',
      targetShare: '30%',
      actual: Math.max(0, sanitizeNumber(actualWants.value)),
      target: targetWants.value,
    },
    {
      id: 'savings' as const,
      title: 'Накопления и инвестиции',
      targetShare: '20%',
      actual: Math.max(0, sanitizeNumber(actualSavings.value)),
      target: targetSavings.value,
    },
  ]

  return definitions.map((item) => {
    const deviation = item.actual - item.target
    const absDeviation = Math.abs(deviation)
    const actualPercent = clampPercent((item.actual / income) * 100)
    const tolerance = item.target * 0.08
    let tone: RuleCategoryCard['tone'] = 'accent'
    let status = 'Требует внимания'

    if (absDeviation <= tolerance) {
      tone = 'positive'
      status = 'Близко к норме'
    } else if (item.id === 'savings' && deviation > 0) {
      tone = 'positive'
      status = 'Выше целевого уровня'
    } else if (item.id !== 'savings' && deviation < 0) {
      tone = 'positive'
      status = 'Ниже целевого порога'
    } else {
      tone = 'warning'
      status = deviation > 0 ? 'Выше нормы' : 'Ниже нормы'
    }

    return {
      ...item,
      deviation,
      deviationLabel: `${deviation >= 0 ? '+' : '−'}${formatCurrency(absDeviation)}`,
      actualPercent,
      actualPercentLabel: formatPercent(actualPercent),
      status,
      tone,
    }
  })
})

const insights = computed(() => {
  const needCard = categoryCards.value.find((item) => item.id === 'needs')
  const wantCard = categoryCards.value.find((item) => item.id === 'wants')
  const savingsCard = categoryCards.value.find((item) => item.id === 'savings')
  const result = [] as { title: string; text: string }[]

  if (needCard && needCard.deviation > targetNeeds.value * 0.08) {
    result.push({
      title: 'Базовые расходы занимают слишком большую долю',
      text: 'Если обязательные траты стабильно выше половины дохода, модель становится менее гибкой. В первую очередь стоит проверить жильё, транспорт и регулярные подписки.',
    })
  } else {
    result.push({
      title: 'Обязательная часть выглядит контролируемой',
      text: 'Доля базовых расходов не разрушает структуру бюджета. Это создаёт запас для накоплений и для управляемых желательных трат.',
    })
  }

  if (wantCard && wantCard.deviation > targetWants.value * 0.08) {
    result.push({
      title: 'Желательные траты размывают баланс',
      text: 'Гибкие расходы уже заметно выше рекомендуемой доли. Обычно именно эта категория даёт самый быстрый эффект при мягкой корректировке бюджета.',
    })
  } else {
    result.push({
      title: 'Гибкие траты не перегружают модель',
      text: 'Это хороший признак: текущая структура не съедает резерв и сохраняет пространство для накоплений.',
    })
  }

  if (savingsCard && savingsCard.actual < targetSavings.value) {
    result.push({
      title: 'Накопительная часть пока ниже нормы',
      text: 'Если доля сбережений не дотягивает до 20%, сложнее строить резерв и долгосрочные цели. Полезно закрепить автоматический перевод части дохода сразу после поступления.',
    })
  } else {
    result.push({
      title: 'Накопления поддерживают устойчивость',
      text: 'Текущий объём накопительной части помогает формировать финансовую подушку и не зависеть полностью от следующего доходного периода.',
    })
  }

  return result
})

function toNumber(value: string | number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.rule-tool__hero-grid,
.rule-tool__analysis-column,
.rule-tool__category-list,
.rule-tool__insight-list {
  display: grid;
  gap: 12px;
}

.rule-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 16px;
  align-items: start;
}

.rule-tool__panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
}

.rule-tool__panel--form {
  position: sticky;
  top: 12px;
}

.rule-tool__panel-head {
  display: grid;
  gap: 4px;
}

.rule-tool__panel-title,
.rule-tool__category-title,
.rule-tool__insight-title {
  margin: 0;
  line-height: 1.15;
}

.rule-tool__panel-description,
.rule-tool__insight-text,
.rule-tool__bar-caption,
.rule-tool__category-share,
.rule-tool__category-metric {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

.rule-tool__field-grid {
  display: grid;
  gap: 12px;
}

.rule-tool__field {
  display: grid;
  gap: 6px;
}

.rule-tool__category-card,
.rule-tool__insight-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.rule-tool__category-head,
.rule-tool__category-values {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.rule-tool__category-status {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  border: 1px solid transparent;
}

.rule-tool__category-status--positive {
  color: hsl(146 66% 28%);
  background: hsl(145 58% 94%);
  border-color: hsl(145 40% 80%);
}

.rule-tool__category-status--warning {
  color: hsl(18 78% 37%);
  background: hsl(18 88% 95%);
  border-color: hsl(18 74% 84%);
}

.rule-tool__category-status--accent {
  color: hsl(215 64% 38%);
  background: hsl(214 100% 97%);
  border-color: hsl(214 78% 84%);
}

.rule-tool__bar-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
}

.rule-tool__bar-fill {
  height: 100%;
  border-radius: inherit;
}

.rule-tool__bar-fill--positive {
  background: linear-gradient(90deg, hsl(153 62% 42%), hsl(176 72% 41%));
}

.rule-tool__bar-fill--warning {
  background: linear-gradient(90deg, hsl(23 94% 58%), hsl(354 83% 63%));
}

.rule-tool__bar-fill--accent {
  background: linear-gradient(90deg, hsl(32 95% 60%), hsl(348 84% 63%));
}

@media (max-width: 1080px) {
  .rule-tool__layout {
    grid-template-columns: 1fr;
  }

  .rule-tool__panel--form {
    position: static;
  }
}
</style>
