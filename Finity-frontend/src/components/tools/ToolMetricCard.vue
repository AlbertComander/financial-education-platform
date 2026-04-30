<template>
  <article class="tool-metric-card" :class="toneClass">
    <p class="tool-metric-card__label">{{ label }}</p>
    <strong class="tool-metric-card__value">{{ value }}</strong>
    <p v-if="note" class="tool-metric-card__note">{{ note }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    note?: string
    tone?: 'default' | 'positive' | 'warning' | 'accent'
  }>(),
  {
    note: '',
    tone: 'default',
  },
)

const toneClass = computed(() => `tool-metric-card--${props.tone}`)
</script>

<style scoped>
.tool-metric-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.tool-metric-card--positive {
  background: hsl(150 58% 96%);
  border-color: hsl(150 42% 82%);
}

.tool-metric-card--warning {
  background: hsl(38 94% 95%);
  border-color: hsl(38 78% 82%);
}

.tool-metric-card--accent {
  background: hsl(214 100% 97%);
  border-color: hsl(214 78% 84%);
}

.tool-metric-card__label {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: hsl(var(--muted-foreground));
}

.tool-metric-card__value {
  font-size: 24px;
  line-height: 1.1;
}

.tool-metric-card__note {
  margin: 0;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
  line-height: 1.45;
}
</style>
