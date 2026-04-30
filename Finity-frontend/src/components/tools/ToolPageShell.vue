<template>
  <section class="tool-page-shell" :class="`tool-page-shell--${theme}`">
    <header class="tool-page-shell__hero">
      <div class="tool-page-shell__hero-copy">
        <p class="tool-page-shell__eyebrow">{{ eyebrow }}</p>
        <h1 class="tool-page-shell__title">{{ title }}</h1>
        <p class="tool-page-shell__description">{{ description }}</p>
      </div>

      <div v-if="$slots['hero-panel']" class="tool-page-shell__hero-panel">
        <slot name="hero-panel" />
      </div>
    </header>

    <div class="tool-page-shell__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    description: string
    theme?: 'gold' | 'ocean' | 'mint' | 'rose' | 'indigo' | 'teal' | 'sunset'
  }>(),
  {
    theme: 'gold',
  },
)
</script>

<style scoped>
.tool-page-shell {
  --tool-accent-start: hsl(208 92% 57%);
  --tool-accent-end: hsl(258 84% 64%);
  --tool-accent-cloud: hsl(44 100% 62% / 0.14);
  display: grid;
  gap: 16px;
}

.tool-page-shell--gold {
  --tool-accent-start: hsl(39 94% 57%);
  --tool-accent-end: hsl(22 90% 61%);
  --tool-accent-cloud: hsl(210 85% 60% / 0.16);
}

.tool-page-shell--ocean {
  --tool-accent-start: hsl(204 92% 56%);
  --tool-accent-end: hsl(223 78% 62%);
  --tool-accent-cloud: hsl(274 80% 63% / 0.13);
}

.tool-page-shell--mint {
  --tool-accent-start: hsl(161 72% 40%);
  --tool-accent-end: hsl(187 76% 48%);
  --tool-accent-cloud: hsl(210 85% 58% / 0.13);
}

.tool-page-shell--rose {
  --tool-accent-start: hsl(349 86% 62%);
  --tool-accent-end: hsl(16 91% 61%);
  --tool-accent-cloud: hsl(204 92% 60% / 0.14);
}

.tool-page-shell--indigo {
  --tool-accent-start: hsl(234 73% 60%);
  --tool-accent-end: hsl(262 80% 66%);
  --tool-accent-cloud: hsl(188 73% 50% / 0.14);
}

.tool-page-shell--teal {
  --tool-accent-start: hsl(172 74% 38%);
  --tool-accent-end: hsl(205 90% 55%);
  --tool-accent-cloud: hsl(46 96% 58% / 0.12);
}

.tool-page-shell--sunset {
  --tool-accent-start: hsl(35 96% 59%);
  --tool-accent-end: hsl(334 82% 63%);
  --tool-accent-cloud: hsl(213 88% 58% / 0.15);
}

.tool-page-shell__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
  gap: 14px;
  padding: 20px;
  border: 1px solid hsl(var(--border));
  border-radius: 22px;
  background:
    radial-gradient(520px 240px at 100% 0%, var(--tool-accent-cloud), transparent 68%),
    linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)));
}

.tool-page-shell__hero-copy {
  display: grid;
  gap: 8px;
  align-content: center;
}

.tool-page-shell__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.tool-page-shell__title {
  margin: 0;
  font-size: clamp(30px, 3.5vw, 40px);
  line-height: 1.06;
}

.tool-page-shell__description {
  margin: 0;
  max-width: 820px;
  color: hsl(var(--muted-foreground));
  font-size: 15px;
  line-height: 1.6;
}

.tool-page-shell__hero-panel {
  min-width: 0;
}

.tool-page-shell__body {
  display: grid;
  gap: 16px;
}

@media (max-width: 1080px) {
  .tool-page-shell__hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .tool-page-shell__hero {
    padding: 16px;
  }

  .tool-page-shell__title {
    font-size: 28px;
  }
}
</style>
