<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/ui/AppSidebar.vue'
import { Button } from '@/components/ui/button'

const sidebarOpen = ref(true)

function onToggleSidebar(event: MouseEvent) {
  sidebarOpen.value = !sidebarOpen.value

  // Remove focus after pointer click to avoid persistent focus ring/caret feel.
  if (event.detail > 0) {
    const button = event.currentTarget as HTMLButtonElement | null
    button?.blur()
  }
}
</script>

<template>
  <div class="app-layout">
    <AppSidebar v-model:open="sidebarOpen" />

    <main
      class="app-layout__content"
      :class="{ 'app-layout__content--with-sidebar': sidebarOpen }"
    >
      <div class="app-layout__toolbar">
        <Button
          variant="outline"
          size="icon"
          aria-label="Переключить меню"
          class="app-layout__sidebar-toggle"
          @click="onToggleSidebar"
        >
          <span class="app-layout__burger" :class="{ 'app-layout__burger--open': sidebarOpen }" aria-hidden="true">
            <span class="app-layout__burger-line app-layout__burger-line--top" />
            <span class="app-layout__burger-line app-layout__burger-line--middle" />
            <span class="app-layout__burger-line app-layout__burger-line--bottom" />
          </span>
        </Button>
      </div>

      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-layout__content {
  padding: 20px 24px 40px;
  transition: margin-left 0.2s ease;
}

.app-layout__toolbar {
  margin-bottom: 12px;
}

.app-layout__sidebar-toggle {
  display: inline-flex;
}

.app-layout__burger {
  width: 18px;
  height: 14px;
  position: relative;
  display: inline-block;
}

.app-layout__burger-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: currentColor;
  border-radius: 999px;
  transition: transform 0.2s ease, opacity 0.2s ease, top 0.2s ease;
}

.app-layout__burger-line--top {
  top: 0;
}

.app-layout__burger-line--middle {
  top: 6px;
}

.app-layout__burger-line--bottom {
  top: 12px;
}

.app-layout__burger--open .app-layout__burger-line--top {
  top: 6px;
  transform: rotate(45deg);
}

.app-layout__burger--open .app-layout__burger-line--middle {
  opacity: 0;
}

.app-layout__burger--open .app-layout__burger-line--bottom {
  top: 6px;
  transform: rotate(-45deg);
}

@media (max-width: 900px) {
  .app-layout__content {
    padding: 20px 14px 28px;
  }
}

@media (min-width: 901px) {
  .app-layout__content--with-sidebar {
    margin-left: 280px;
  }
}
</style>
