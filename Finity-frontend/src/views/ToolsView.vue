<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToolsOverviewPanel from '@/components/tools/panels/ToolsOverviewPanel.vue'
import BudgetPlannerTool from '@/components/tools/panels/BudgetPlannerTool.vue'
import Rule503020Tool from '@/components/tools/panels/Rule503020Tool.vue'
import EmergencyFundTool from '@/components/tools/panels/EmergencyFundTool.vue'
import CreditCalculatorTool from '@/components/tools/panels/CreditCalculatorTool.vue'
import SavingsPlannerTool from '@/components/tools/panels/SavingsPlannerTool.vue'
import ScenarioComparisonTool from '@/components/tools/panels/ScenarioComparisonTool.vue'
import DemoAccountTool from '@/components/tools/panels/DemoAccountTool.vue'
import type { InteractiveToolId } from '@/lib/tool-navigation'

const route = useRoute()

const panelMap: Record<InteractiveToolId, unknown> = {
  overview: ToolsOverviewPanel,
  'budget-planner': BudgetPlannerTool,
  'rule-503020': Rule503020Tool,
  'emergency-fund': EmergencyFundTool,
  'credit-calculator': CreditCalculatorTool,
  'savings-planner': SavingsPlannerTool,
  'scenario-comparison': ScenarioComparisonTool,
  'demo-account': DemoAccountTool,
}

const activeToolId = computed(() => {
  const value = route.meta.toolId
  return typeof value === 'string' ? (value as InteractiveToolId) : 'overview'
})

const activePanel = computed(() => panelMap[activeToolId.value] ?? ToolsOverviewPanel)
</script>

<template>
  <section class="tools-view">
    <component :is="activePanel" />
  </section>
</template>

<style scoped>
.tools-view {
  display: grid;
  gap: 16px;
}
</style>
