<template>
  <ToolPageShell
    eyebrow="Finity Tools"
    title="Интерактивные финансовые инструменты"
    description="Этот раздел объединяет прикладные калькуляторы и сценарные модели. Они помогают не только изучать теорию, но и проверять решения на собственных числах."
    theme="gold"
  >
    <template #hero-panel>
      <div class="tools-overview__hero-grid">
        <ToolMetricCard label="Инструментов" :value="String(toolCards.length)" note="Полный набор расчётных модулей для обучения и практики." tone="accent" />
        <ToolMetricCard label="Основной фокус" value="Практика" note="Каждый инструмент переводит учебные темы в конкретные пользовательские расчёты." tone="warning" />
        <ToolMetricCard label="Сценарии" value="6 форматов" note="Бюджет, резервы, кредиты, накопления и сравнение решений." tone="positive" />
      </div>
    </template>

    <section class="tools-overview__grid">
      <RouterLink
        v-for="tool in toolCards"
        :key="tool.to"
        :to="tool.to"
        class="tools-overview__card"
        :class="`tools-overview__card--${tool.theme}`"
      >
        <div class="tools-overview__card-head">
          <component :is="iconComponent(tool.iconKey)" class="tools-overview__card-icon" />
          <span class="tools-overview__card-tag">{{ tool.shortName }}</span>
        </div>
        <h2 class="tools-overview__card-title">{{ tool.name }}</h2>
        <p class="tools-overview__card-description">{{ tool.description }}</p>
        <span class="tools-overview__card-link">Открыть инструмент</span>
      </RouterLink>
    </section>

    <section class="tools-overview__principles">
      <Card class="tools-overview__principle-card">
        <h2 class="tools-overview__section-title">Как использовать модуль</h2>
        <ol class="tools-overview__steps">
          <li class="tools-overview__step">Выберите инструмент под текущую задачу: бюджет, кредит, резерв или цель накопления.</li>
          <li class="tools-overview__step">Введите свои исходные параметры и посмотрите ключевые показатели в правой части экрана.</li>
          <li class="tools-overview__step">Сравните альтернативные сценарии и используйте результат как основу для учебного анализа.</li>
        </ol>
      </Card>

      <Card class="tools-overview__principle-card">
        <h2 class="tools-overview__section-title">Что даёт этот раздел</h2>
        <ul class="tools-overview__bullet-list">
          <li class="tools-overview__bullet">связь между теорией финансовой грамотности и прикладным расчётом;</li>
          <li class="tools-overview__bullet">возможность быстро моделировать личные финансовые решения;</li>
          <li class="tools-overview__bullet">наглядное представление сильных и слабых сторон выбранного сценария.</li>
        </ul>
      </Card>
    </section>
  </ToolPageShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRightLeft, Calculator, PieChart, ShieldCheck, Sparkles, Target, Wallet, WalletCards } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import ToolPageShell from '@/components/tools/ToolPageShell.vue'
import ToolMetricCard from '@/components/tools/ToolMetricCard.vue'
import { interactiveToolLinks } from '@/lib/tool-navigation'

const toolCards = computed(() => interactiveToolLinks.filter((tool) => tool.id !== 'overview'))

const iconMap = {
  sparkles: Sparkles,
  wallet: Wallet,
  pie: PieChart,
  shield: ShieldCheck,
  calculator: Calculator,
  target: Target,
  split: ArrowRightLeft,
  'wallet-cards': WalletCards,
} as const

function iconComponent(iconKey: keyof typeof iconMap) {
  return iconMap[iconKey] ?? Sparkles
}
</script>

<style scoped>
.tools-overview__hero-grid {
  display: grid;
  gap: 10px;
}

.tools-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.tools-overview__card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid hsl(var(--border));
  border-radius: 20px;
  background: hsl(var(--card));
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.tools-overview__card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 36px hsl(215 35% 18% / 0.08);
}

.tools-overview__card--ocean:hover {
  border-color: hsl(206 88% 68%);
}

.tools-overview__card--sunset:hover {
  border-color: hsl(28 88% 66%);
}

.tools-overview__card--mint:hover {
  border-color: hsl(161 52% 58%);
}

.tools-overview__card--rose:hover {
  border-color: hsl(350 76% 71%);
}

.tools-overview__card--teal:hover {
  border-color: hsl(188 62% 63%);
}

.tools-overview__card--indigo:hover {
  border-color: hsl(244 75% 74%);
}

.tools-overview__card--market:hover {
  border-color: hsl(164 48% 52%);
}

.tools-overview__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tools-overview__card-icon {
  width: 22px;
  height: 22px;
  color: hsl(var(--muted-foreground));
}

.tools-overview__card-tag {
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.tools-overview__card-title,
.tools-overview__section-title {
  margin: 0;
  line-height: 1.14;
}

.tools-overview__card-title {
  font-size: 24px;
}

.tools-overview__card-description,
.tools-overview__card-link,
.tools-overview__step,
.tools-overview__bullet {
  margin: 0;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

.tools-overview__card-link {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.tools-overview__principles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tools-overview__principle-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 20px;
}

.tools-overview__steps,
.tools-overview__bullet-list {
  display: grid;
  gap: 10px;
  padding-left: 18px;
  margin: 0;
}

@media (max-width: 1100px) {
  .tools-overview__grid,
  .tools-overview__principles {
    grid-template-columns: 1fr;
  }
}
</style>
