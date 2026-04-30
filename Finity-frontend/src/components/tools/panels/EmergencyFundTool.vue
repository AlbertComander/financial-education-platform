<template>
  <ToolPageShell
    eyebrow="Инструменты • Резерв"
    title="Калькулятор финансовой подушки"
    description="Инструмент оценивает, насколько текущий резерв покрывает обязательные расходы и как быстро можно собрать рекомендуемую подушку безопасности."
    theme="mint"
  >
    <template #hero-panel>
      <div class="reserve-tool__hero-grid">
        <ToolMetricCard
          label="Целевой резерв"
          :value="formatCurrency(targetReserve)"
          note="Рекомендуемая подушка, рассчитанная от обязательных ежемесячных расходов."
          tone="accent"
        />
        <ToolMetricCard
          label="Прогресс"
          :value="formatPercent(progressPercent)"
          :note="progressNote"
          :tone="progressTone"
        />
        <ToolMetricCard
          label="До цели"
          :value="monthsToGoalLabel"
          :note="monthsToGoalNote"
          :tone="monthsToGoalTone"
        />
      </div>
    </template>

    <div class="reserve-tool__layout">
      <Card class="reserve-tool__panel reserve-tool__panel--form">
        <div class="reserve-tool__panel-head">
          <h2 class="reserve-tool__panel-title">Параметры резерва</h2>
          <p class="reserve-tool__panel-description">Задайте месячные обязательные расходы, текущий резерв и комфортный горизонт подушки.</p>
        </div>

        <div class="reserve-tool__field-grid">
          <div class="reserve-tool__field">
            <Label for="reserve-essential">Обязательные расходы в месяц</Label>
            <Input id="reserve-essential" :model-value="String(essentialMonthly)" type="number" min="0" @update:model-value="essentialMonthly = toNumber($event)" />
          </div>

          <div class="reserve-tool__field">
            <Label for="reserve-current">Текущий резерв</Label>
            <Input id="reserve-current" :model-value="String(currentReserve)" type="number" min="0" @update:model-value="currentReserve = toNumber($event)" />
          </div>

          <div class="reserve-tool__field reserve-tool__field--select">
            <Label for="reserve-months">Горизонт подушки</Label>
            <Select v-model="reserveMonthsValue">
              <SelectTrigger id="reserve-months">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 месяца</SelectItem>
                <SelectItem value="4">4 месяца</SelectItem>
                <SelectItem value="6">6 месяцев</SelectItem>
                <SelectItem value="9">9 месяцев</SelectItem>
                <SelectItem value="12">12 месяцев</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="reserve-tool__field">
            <Label for="reserve-contribution">Ежемесячное пополнение</Label>
            <Input id="reserve-contribution" :model-value="String(monthlyContribution)" type="number" min="0" @update:model-value="monthlyContribution = toNumber($event)" />
          </div>

          <div class="reserve-tool__field">
            <Label for="reserve-rate">Годовая доходность резерва, %</Label>
            <Input id="reserve-rate" :model-value="String(annualRate)" type="number" min="0" @update:model-value="annualRate = toNumber($event)" />
          </div>
        </div>
      </Card>

      <div class="reserve-tool__analysis-column">
        <Card class="reserve-tool__panel">
          <div class="reserve-tool__panel-head">
            <h2 class="reserve-tool__panel-title">Состояние подушки</h2>
            <p class="reserve-tool__panel-description">Резерв полезно оценивать не только в рублях, но и в количестве месяцев, которые он покрывает.</p>
          </div>

          <div class="reserve-tool__state-grid">
            <ToolMetricCard label="Покрытие расходов" :value="coveredMonthsLabel" note="Сколько месяцев текущий резерв выдерживает без нового дохода." tone="accent" />
            <ToolMetricCard label="Нужно добавить" :value="formatCurrency(missingReserve)" :note="missingReserveNote" :tone="missingReserveTone" />
            <ToolMetricCard label="При достижении цели" :value="futureCoverageLabel" note="Полный объём покрытия при выбранном горизонте подушки." tone="positive" />
          </div>

          <div class="reserve-tool__progress-card">
            <div class="reserve-tool__progress-head">
              <h3 class="reserve-tool__progress-title">Шкала готовности</h3>
              <span class="reserve-tool__progress-status" :class="`reserve-tool__progress-status--${progressTone}`">{{ readinessLabel }}</span>
            </div>

            <div class="reserve-tool__progress-track">
              <div class="reserve-tool__progress-fill" :class="`reserve-tool__progress-fill--${progressTone}`" :style="{ width: `${progressPercent}%` }" />
            </div>

            <p class="reserve-tool__progress-note">{{ readinessDescription }}</p>
          </div>
        </Card>

        <Card class="reserve-tool__panel">
          <div class="reserve-tool__panel-head">
            <h2 class="reserve-tool__panel-title">Практические выводы</h2>
          </div>

          <div class="reserve-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="reserve-tool__insight-card">
              <h3 class="reserve-tool__insight-title">{{ insight.title }}</h3>
              <p class="reserve-tool__insight-text">{{ insight.text }}</p>
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ToolMetricCard from '@/components/tools/ToolMetricCard.vue'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import { calculateMonthsToGoal, clampPercent, formatCurrency, formatPercent, sanitizeNumber } from '@/lib/financial-tools'

const essentialMonthly = ref(42000)
const currentReserve = ref(120000)
const reserveMonthsValue = ref('6')
const monthlyContribution = ref(14000)
const annualRate = ref(8)

const reserveMonths = computed(() => Math.max(1, Number(reserveMonthsValue.value) || 6))
const targetReserve = computed(() => Math.max(0, sanitizeNumber(essentialMonthly.value)) * reserveMonths.value)
const missingReserve = computed(() => Math.max(0, targetReserve.value - Math.max(0, sanitizeNumber(currentReserve.value))))
const progressPercent = computed(() => {
  if (targetReserve.value <= 0) return 0
  return clampPercent((Math.max(0, sanitizeNumber(currentReserve.value)) / targetReserve.value) * 100)
})
const coveredMonths = computed(() => {
  if (essentialMonthly.value <= 0) return 0
  return Math.max(0, sanitizeNumber(currentReserve.value)) / Math.max(1, sanitizeNumber(essentialMonthly.value))
})
const monthsToGoal = computed(() => {
  return calculateMonthsToGoal(targetReserve.value, currentReserve.value, monthlyContribution.value, annualRate.value)
})

const coveredMonthsLabel = computed(() => `${coveredMonths.value.toFixed(1)} мес.`)
const futureCoverageLabel = computed(() => `${reserveMonths.value} мес.`)
const progressNote = computed(() => `${formatCurrency(Math.max(0, sanitizeNumber(currentReserve.value)))} уже сформировано.`)
const monthsToGoalLabel = computed(() => {
  if (missingReserve.value <= 0) return 'Цель достигнута'
  if (monthsToGoal.value === null) return 'Не рассчитано'
  return `${monthsToGoal.value} мес.`
})
const monthsToGoalNote = computed(() => {
  if (missingReserve.value <= 0) return 'Текущий резерв уже соответствует выбранному горизонту.'
  if (monthsToGoal.value === null) return 'Нужно задать ненулевое пополнение или доходность.'
  return 'Оценка выполнена с учётом регулярного пополнения и выбранной доходности.'
})

const progressTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (progressPercent.value >= 100) return 'positive'
  if (progressPercent.value < 50) return 'warning'
  return 'accent'
})

const monthsToGoalTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (missingReserve.value <= 0) return 'positive'
  if (monthsToGoal.value === null || monthsToGoal.value > 18) return 'warning'
  return 'accent'
})

const missingReserveTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (missingReserve.value <= 0) return 'positive'
  if (progressPercent.value < 50) return 'warning'
  return 'accent'
})

const missingReserveNote = computed(() => {
  if (missingReserve.value <= 0) return 'Подушка уже перекрывает целевой минимум.'
  return 'Столько ещё нужно накопить, чтобы выйти на выбранный резерв.'
})

const readinessLabel = computed(() => {
  if (progressPercent.value >= 100) return 'Подушка сформирована'
  if (progressPercent.value >= 70) return 'Близко к целевому уровню'
  if (progressPercent.value >= 40) return 'Есть базовый резерв'
  return 'Резерв недостаточен'
})

const readinessDescription = computed(() => {
  if (progressPercent.value >= 100) {
    return 'Текущего резерва достаточно, чтобы пройти выбранный период снижения дохода без критического кассового разрыва.'
  }
  if (progressPercent.value >= 70) {
    return 'Фундамент уже есть. Осталось довести резерв до полного целевого объёма, чтобы усилить устойчивость.'
  }
  if (progressPercent.value >= 40) {
    return 'Подушка частично работает, но пока покрывает не весь риск. При сбоях по доходу запас быстро исчерпается.'
  }
  return 'Резерв ещё слабый. В первую очередь полезно закрепить регулярное пополнение и защитить обязательные расходы.'
})

const insights = computed(() => {
  const result = [] as { title: string; text: string }[]

  if (progressPercent.value < 50) {
    result.push({
      title: 'Сначала закройте базовый минимум',
      text: 'Если резерв покрывает меньше половины целевой подушки, лучше сосредоточиться именно на ликвидной финансовой подушке, а не на длинных целях.',
    })
  } else {
    result.push({
      title: 'Резерв уже начинает работать',
      text: 'Текущего объёма хватает на часть обязательных расходов. Это уже снижает риск кассового разрыва при временном падении дохода.',
    })
  }

  if (monthsToGoal.value !== null && monthsToGoal.value <= 12) {
    result.push({
      title: 'Цель достижима в обозримый срок',
      text: 'При текущем пополнении и выбранной доходности подушка может быть сформирована в течение года, что делает сценарий вполне реалистичным.',
    })
  } else {
    result.push({
      title: 'Срок формирования стоит ускорить',
      text: 'Если резерв собирается слишком долго, имеет смысл либо увеличить ежемесячное пополнение, либо временно пересмотреть часть переменных расходов.',
    })
  }

  result.push({
    title: 'Подушка должна быть ликвидной',
    text: 'Даже если используется доходность, этот резерв лучше держать в доступной форме: на накопительном счёте или в краткосрочных инструментах с низким риском.',
  })

  return result
})

function toNumber(value: string | number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.reserve-tool__hero-grid,
.reserve-tool__analysis-column,
.reserve-tool__insight-list,
.reserve-tool__state-grid {
  display: grid;
  gap: 12px;
}

.reserve-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
  align-items: start;
}

.reserve-tool__panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
}

.reserve-tool__panel--form {
  position: sticky;
  top: 12px;
}

.reserve-tool__panel-head {
  display: grid;
  gap: 4px;
}

.reserve-tool__panel-title,
.reserve-tool__progress-title,
.reserve-tool__insight-title {
  margin: 0;
  line-height: 1.15;
}

.reserve-tool__panel-description,
.reserve-tool__insight-text,
.reserve-tool__progress-note {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

.reserve-tool__field-grid {
  display: grid;
  gap: 12px;
}

.reserve-tool__field {
  display: grid;
  gap: 6px;
}

.reserve-tool__progress-card,
.reserve-tool__insight-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.reserve-tool__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.reserve-tool__progress-status {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  border: 1px solid transparent;
}

.reserve-tool__progress-status--positive {
  color: hsl(146 66% 28%);
  background: hsl(145 58% 94%);
  border-color: hsl(145 40% 80%);
}

.reserve-tool__progress-status--warning {
  color: hsl(18 78% 37%);
  background: hsl(18 88% 95%);
  border-color: hsl(18 74% 84%);
}

.reserve-tool__progress-status--accent {
  color: hsl(214 64% 38%);
  background: hsl(214 100% 97%);
  border-color: hsl(214 78% 84%);
}

.reserve-tool__progress-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
}

.reserve-tool__progress-fill {
  height: 100%;
  border-radius: inherit;
}

.reserve-tool__progress-fill--positive {
  background: linear-gradient(90deg, hsl(153 62% 42%), hsl(176 72% 41%));
}

.reserve-tool__progress-fill--warning {
  background: linear-gradient(90deg, hsl(24 95% 57%), hsl(355 83% 63%));
}

.reserve-tool__progress-fill--accent {
  background: linear-gradient(90deg, hsl(163 72% 40%), hsl(193 74% 46%));
}

@media (max-width: 1080px) {
  .reserve-tool__layout {
    grid-template-columns: 1fr;
  }

  .reserve-tool__panel--form {
    position: static;
  }
}
</style>
