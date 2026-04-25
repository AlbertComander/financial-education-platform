<template>
  <ToolPageShell
    eyebrow="Инструменты • Сценарии"
    title="Сравнение финансовых сценариев"
    description="Инструмент помогает сопоставить два частых решения: купить сейчас в кредит или накопить до цели. Это удобно для учебного анализа компромисса между скоростью и переплатой."
    theme="indigo"
  >
    <template #hero-panel>
      <div class="scenario-tool__hero-grid">
        <ToolMetricCard
          label="Нужно профинансировать"
          :value="formatCurrency(requiredAmount)"
          note="Часть стоимости, которой пока не хватает для покупки сразу за собственные средства."
          tone="accent"
        />
        <ToolMetricCard
          label="Кредитный сценарий"
          :value="loanMonthlyLabel"
          :note="loanScenarioNote"
          :tone="loanScenarioTone"
        />
        <ToolMetricCard
          label="Сценарий накопления"
          :value="savingsScenarioLabel"
          :note="savingsScenarioNote"
          :tone="savingsScenarioTone"
        />
      </div>
    </template>

    <div class="scenario-tool__layout">
      <Card class="scenario-tool__panel scenario-tool__panel--form">
        <div class="scenario-tool__panel-head">
          <h2 class="scenario-tool__panel-title">Исходные параметры</h2>
          <p class="scenario-tool__panel-description">Сравните два сценария на одинаковых исходных данных: текущие накопления, свободный денежный поток и цену цели.</p>
        </div>

        <div class="scenario-tool__field-grid">
          <div class="scenario-tool__field">
            <Label for="scenario-price">Стоимость цели</Label>
            <Input id="scenario-price" :model-value="String(purchasePrice)" type="number" min="0" @update:model-value="purchasePrice = toNumber($event)" />
          </div>
          <div class="scenario-tool__field">
            <Label for="scenario-current">Уже накоплено</Label>
            <Input id="scenario-current" :model-value="String(currentSavings)" type="number" min="0" @update:model-value="currentSavings = toNumber($event)" />
          </div>
          <div class="scenario-tool__field">
            <Label for="scenario-cashflow">Свободный денежный поток в месяц</Label>
            <Input id="scenario-cashflow" :model-value="String(monthlyFreeCash)" type="number" min="0" @update:model-value="monthlyFreeCash = toNumber($event)" />
          </div>
          <div class="scenario-tool__field">
            <Label for="scenario-loan-rate">Ставка кредита, %</Label>
            <Input id="scenario-loan-rate" :model-value="String(loanAnnualRate)" type="number" min="0" @update:model-value="loanAnnualRate = toNumber($event)" />
          </div>
          <div class="scenario-tool__field">
            <Label for="scenario-loan-months">Срок кредита, месяцев</Label>
            <Input id="scenario-loan-months" :model-value="String(loanMonths)" type="number" min="1" @update:model-value="loanMonths = Math.max(1, toNumber($event))" />
          </div>
          <div class="scenario-tool__field">
            <Label for="scenario-savings-rate">Доходность накоплений, %</Label>
            <Input id="scenario-savings-rate" :model-value="String(savingsAnnualRate)" type="number" min="0" @update:model-value="savingsAnnualRate = toNumber($event)" />
          </div>
        </div>
      </Card>

      <div class="scenario-tool__analysis-column">
        <div class="scenario-tool__cards-grid">
          <Card class="scenario-tool__panel">
            <div class="scenario-tool__panel-head">
              <h2 class="scenario-tool__panel-title">Покупка в кредит</h2>
            </div>

            <div class="scenario-tool__metric-stack">
              <ToolMetricCard label="Ежемесячный платёж" :value="loanMonthlyLabel" note="Платёж по недостающей сумме, если оформить кредит сейчас." :tone="loanScenarioTone" />
              <ToolMetricCard label="Полная переплата" :value="formatCurrency(loanPlan.totalInterest)" note="Проценты, которые будут уплачены сверх цены цели." tone="warning" />
              <ToolMetricCard label="Общая стоимость сценария" :value="formatCurrency(totalLoanCost)" note="Текущие накопления плюс все платежи по кредиту." tone="accent" />
            </div>
          </Card>

          <Card class="scenario-tool__panel">
            <div class="scenario-tool__panel-head">
              <h2 class="scenario-tool__panel-title">Накопить и купить позже</h2>
            </div>

            <div class="scenario-tool__metric-stack">
              <ToolMetricCard label="До покупки" :value="savingsScenarioLabel" note="Сколько месяцев потребуется, чтобы дойти до цели текущим темпом." :tone="savingsScenarioTone" />
              <ToolMetricCard label="Прогноз суммы" :value="formatCurrency(projectedSavingsAtLoanTerm)" note="Сколько удастся накопить за срок, равный кредитному сценарию." tone="positive" />
              <ToolMetricCard label="Итоговая стоимость" :value="formatCurrency(purchasePrice)" note="Без процентной переплаты, но с временной отсрочкой покупки." tone="accent" />
            </div>
          </Card>
        </div>

        <Card class="scenario-tool__panel">
          <div class="scenario-tool__panel-head">
            <h2 class="scenario-tool__panel-title">Рекомендация по сценарию</h2>
            <p class="scenario-tool__panel-description">Здесь нет универсально правильного ответа: инструмент показывает, какой компромисс скрывается за каждым вариантом.</p>
          </div>

          <div class="scenario-tool__recommendation-card" :class="`scenario-tool__recommendation-card--${recommendationTone}`">
            <h3 class="scenario-tool__recommendation-title">{{ recommendationTitle }}</h3>
            <p class="scenario-tool__recommendation-text">{{ recommendationText }}</p>
          </div>

          <div class="scenario-tool__insight-list">
            <article v-for="insight in insights" :key="insight.title" class="scenario-tool__insight-card">
              <h3 class="scenario-tool__insight-title">{{ insight.title }}</h3>
              <p class="scenario-tool__insight-text">{{ insight.text }}</p>
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
import { calculateCreditPlan, calculateFutureValue, calculateMonthsToGoal, formatCurrency } from '@/lib/financial-tools'

const purchasePrice = ref(420000)
const currentSavings = ref(90000)
const monthlyFreeCash = ref(18000)
const loanAnnualRate = ref(19)
const loanMonths = ref(24)
const savingsAnnualRate = ref(10)

const requiredAmount = computed(() => Math.max(0, purchasePrice.value - currentSavings.value))
const loanPlan = computed(() => calculateCreditPlan(requiredAmount.value, loanAnnualRate.value, loanMonths.value, 0))
const savingsMonths = computed(() => calculateMonthsToGoal(purchasePrice.value, currentSavings.value, monthlyFreeCash.value, savingsAnnualRate.value))
const projectedSavingsAtLoanTerm = computed(() => calculateFutureValue(currentSavings.value, monthlyFreeCash.value, savingsAnnualRate.value, loanMonths.value))
const totalLoanCost = computed(() => currentSavings.value + loanPlan.value.totalPaid)
const isLoanAffordable = computed(() => monthlyFreeCash.value > 0 && loanPlan.value.monthlyPayment <= monthlyFreeCash.value)

const loanMonthlyLabel = computed(() => {
  if (requiredAmount.value <= 0) return 'Не нужен'
  return formatCurrency(loanPlan.value.monthlyPayment)
})

const loanScenarioNote = computed(() => {
  if (requiredAmount.value <= 0) return 'Цель уже можно оплатить за счёт накоплений без займа.'
  if (isLoanAffordable.value) return 'Платёж укладывается в заданный свободный поток.'
  return 'Платёж выше доступного свободного денежного потока.'
})

const loanScenarioTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (requiredAmount.value <= 0) return 'positive'
  if (!isLoanAffordable.value) return 'warning'
  return 'accent'
})

const savingsScenarioLabel = computed(() => {
  if (requiredAmount.value <= 0) return 'Уже доступно'
  if (savingsMonths.value === null) return 'Не рассчитано'
  return `${savingsMonths.value} мес.`
})

const savingsScenarioNote = computed(() => {
  if (requiredAmount.value <= 0) return 'Накопленной суммы уже достаточно для покупки.'
  if (savingsMonths.value === null) return 'Нужен положительный свободный поток или доходность.'
  return 'Оценка срока до покупки без привлечения кредита.'
})

const savingsScenarioTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (requiredAmount.value <= 0) return 'positive'
  if (savingsMonths.value !== null && savingsMonths.value <= 12) return 'positive'
  if (savingsMonths.value !== null && savingsMonths.value <= 24) return 'accent'
  return 'warning'
})

const recommendationTone = computed<'positive' | 'warning' | 'accent'>(() => {
  if (requiredAmount.value <= 0) return 'positive'
  if (!isLoanAffordable.value) return 'warning'
  if (savingsMonths.value !== null && savingsMonths.value <= 10 && loanPlan.value.totalInterest > requiredAmount.value * 0.12) return 'positive'
  if (loanPlan.value.totalInterest > requiredAmount.value * 0.25) return 'warning'
  return 'accent'
})

const recommendationTitle = computed(() => {
  if (requiredAmount.value <= 0) return 'Покупку уже можно совершить без кредитной нагрузки'
  if (!isLoanAffordable.value) return 'Накопление выглядит безопаснее кредита'
  if (savingsMonths.value !== null && savingsMonths.value <= 10 && loanPlan.value.totalInterest > requiredAmount.value * 0.12) {
    return 'Накопление выглядит рациональнее'
  }
  if (loanPlan.value.totalInterest <= requiredAmount.value * 0.12 && isLoanAffordable.value) {
    return 'Кредит допустим, если покупка нужна сейчас'
  }
  return 'Решение зависит от срочности покупки'
})

const recommendationText = computed(() => {
  if (requiredAmount.value <= 0) {
    return 'Текущих накоплений достаточно, поэтому привлекать кредит ради этой цели нет смысла. Основной фокус можно сместить на качество самой покупки и сохранение резервов.'
  }

  if (!isLoanAffordable.value) {
    return 'Платёж по кредиту превышает свободный денежный поток. В таком сценарии покупка в кредит создаёт риск кассового дефицита, поэтому накопление выглядит устойчивее.'
  }

  if (savingsMonths.value !== null && savingsMonths.value <= 10 && loanPlan.value.totalInterest > requiredAmount.value * 0.12) {
    return 'Если цель можно закрыть накоплением меньше чем за год, а переплата по кредиту уже заметна, разумнее подождать и избежать лишней стоимости займа.'
  }

  if (loanPlan.value.totalInterest <= requiredAmount.value * 0.12 && isLoanAffordable.value) {
    return 'Если покупка действительно нужна сейчас, кредит выглядит относительно мягким по переплате и укладывается в доступный поток. Такой сценарий можно рассматривать как допустимый.'
  }

  return 'Оба сценария жизнеспособны, но выбор зависит от срочности. Кредит экономит время, накопление — деньги и запас финансовой устойчивости.'
})

const insights = computed(() => {
  const result = [] as { title: string; text: string }[]

  if (requiredAmount.value <= 0) {
    result.push({
      title: 'Сценарий уже закрыт накоплениями',
      text: 'Задача этого расчёта теперь не в выборе между кредитом и накоплением, а в проверке того, насколько комфортно совершать покупку без ущерба для резерва.',
    })
  } else if (!isLoanAffordable.value) {
    result.push({
      title: 'Кредитная нагрузка выше безопасного уровня',
      text: 'Свободного денежного потока не хватает для ежемесячного платежа. Это сильный аргумент в пользу отложенной покупки и сценария накопления.',
    })
  } else {
    result.push({
      title: 'Кредит технически доступен',
      text: 'Ежемесячный платёж укладывается в свободный поток. Это не делает сценарий автоматически лучшим, но снимает главное ограничение по ликвидности.',
    })
  }

  if (savingsMonths.value !== null) {
    result.push({
      title: 'Накопление показывает цену времени',
      text: `При текущем темпе до покупки потребуется около ${savingsMonths.value} мес. Это число помогает сопоставить время ожидания с переплатой по кредиту.`,
    })
  } else {
    result.push({
      title: 'Без свободного потока накопительный сценарий не двигается',
      text: 'Если нет регулярного взноса или доходности, накопление не может считаться рабочим сценарием. Тогда сначала стоит высвободить ресурс в бюджете.',
    })
  }

  result.push({
    title: 'Правильный выбор зависит от контекста',
    text: 'Если покупка критична по времени, умеренный кредит может быть оправдан. Если срочности нет, накопление обычно выигрывает за счёт меньшей общей стоимости и более высокой устойчивости.',
  })

  return result
})

function toNumber(value: string | number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
}
</script>

<style scoped>
.scenario-tool__hero-grid,
.scenario-tool__analysis-column,
.scenario-tool__cards-grid,
.scenario-tool__metric-stack,
.scenario-tool__insight-list {
  display: grid;
  gap: 12px;
}

.scenario-tool__layout {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 16px;
  align-items: start;
}

.scenario-tool__panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
}

.scenario-tool__panel--form {
  position: sticky;
  top: 12px;
}

.scenario-tool__panel-head {
  display: grid;
  gap: 4px;
}

.scenario-tool__panel-title,
.scenario-tool__recommendation-title,
.scenario-tool__insight-title {
  margin: 0;
  line-height: 1.15;
}

.scenario-tool__panel-description,
.scenario-tool__recommendation-text,
.scenario-tool__insight-text {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.55;
}

.scenario-tool__field-grid {
  display: grid;
  gap: 12px;
}

.scenario-tool__field {
  display: grid;
  gap: 6px;
}

.scenario-tool__recommendation-card,
.scenario-tool__insight-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.scenario-tool__recommendation-card--positive {
  background: hsl(145 58% 95%);
  border-color: hsl(145 40% 80%);
}

.scenario-tool__recommendation-card--warning {
  background: hsl(18 88% 95%);
  border-color: hsl(18 74% 84%);
}

.scenario-tool__recommendation-card--accent {
  background: hsl(232 100% 97%);
  border-color: hsl(235 70% 84%);
}

@media (max-width: 1080px) {
  .scenario-tool__layout,
  .scenario-tool__cards-grid {
    grid-template-columns: 1fr;
  }

  .scenario-tool__panel--form {
    position: static;
  }
}
</style>
