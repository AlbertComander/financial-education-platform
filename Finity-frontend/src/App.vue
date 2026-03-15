<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/ui/AppSidebar.vue'

const sidebarOpen = ref(true)
</script>

<template>
  <div class="app-layout">
    <AppSidebar v-model:open="sidebarOpen" />

    <main
      class="app-layout__content"
      :class="{ 'app-layout__content--with-sidebar': sidebarOpen }"
    >
      <div class="app-layout__container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background:
    radial-gradient(1200px 540px at 102% -18%, hsl(var(--accent) / 0.22), transparent 62%),
    radial-gradient(900px 420px at -20% 118%, hsl(var(--muted) / 0.5), transparent 58%),
    hsl(var(--background));
}

.app-layout__content {
  margin-left: 76px;
  padding: 24px 24px 40px;
  transition: margin-left 0.22s ease, padding 0.22s ease;
}

.app-layout__container {
  width: min(1360px, 100%);
  margin-inline: auto;
}

@media (max-width: 900px) {
  .app-layout__content {
    margin-left: 68px;
    padding: 16px 12px 28px;
  }
}

@media (min-width: 901px) {
  .app-layout__content--with-sidebar {
    margin-left: 288px;
  }
}
</style>
