<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { useUserStore } from '@/stores/user'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCcw, SlidersHorizontal } from 'lucide-vue-next'

type Notice = {
  type: 'success' | 'error'
  text: string
}

const router = useRouter()
const userStore = useUserStore()

const settingsForm = reactive({
  ui_lang: 'ru',
  theme: 'light',
  notifications_enabled: true,
})

const notice = ref<Notice | null>(null)
const initialSettingsState = ref('')

const isBusy = computed(() => {
  return userStore.isLoading || userStore.isSavingSettings
})

const isDirty = computed(() => {
  return JSON.stringify(getSettingsState()) !== initialSettingsState.value
})

const settingsUpdatedAt = computed(() => {
  return formatDate(userStore.settings?.updated_at)
})

watch(
  () => userStore.settings,
  (settings) => {
    if (!settings) return
    settingsForm.ui_lang = settings.ui_lang
    settingsForm.theme = settings.theme === 'dark' ? 'dark' : 'light'
    settingsForm.notifications_enabled = settings.notifications_enabled
    initialSettingsState.value = JSON.stringify(getSettingsState())
  },
  { immediate: true },
)

onMounted(async () => {
  if (userStore.hasData) return
  try {
    await userStore.loadAll()
  } catch (error) {
    notice.value = {
      type: 'error',
      text: normalizeMessage(error, 'Не удалось загрузить настройки.'),
    }
  }
})

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function getSettingsState() {
  return {
    ui_lang: settingsForm.ui_lang.trim().toLowerCase(),
    theme: settingsForm.theme === 'dark' ? 'dark' : 'light',
    notifications_enabled: settingsForm.notifications_enabled,
  }
}

function onReset() {
  const settings = userStore.settings
  if (!settings) return
  settingsForm.ui_lang = settings.ui_lang
  settingsForm.theme = settings.theme === 'dark' ? 'dark' : 'light'
  settingsForm.notifications_enabled = settings.notifications_enabled
  notice.value = null
}

async function onSave() {
  notice.value = null

  settingsForm.ui_lang = settingsForm.ui_lang.trim().toLowerCase() || 'ru'
  settingsForm.theme = settingsForm.theme === 'dark' ? 'dark' : 'light'

  try {
    await userStore.saveSettings({
      ui_lang: settingsForm.ui_lang,
      theme: settingsForm.theme,
      notifications_enabled: settingsForm.notifications_enabled,
    })
    initialSettingsState.value = JSON.stringify(getSettingsState())
    notice.value = { type: 'success', text: 'Настройки сохранены.' }
  } catch (error) {
    notice.value = {
      type: 'error',
      text: normalizeMessage(error, 'Не удалось сохранить настройки.'),
    }
  }
}

function backToProfile() {
  void router.push({ name: 'profile' })
}
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__header">
      <Button type="button" variant="outline" class="settings-page__back-button" @click="backToProfile">
        <ArrowLeft />
        Профиль
      </Button>

      <div class="settings-page__header-main">
        <p class="settings-page__eyebrow">Параметры</p>
        <h1 class="settings-page__title">Настройки платформы</h1>
        <p class="settings-page__subtitle">Управление языком, темой и уведомлениями.</p>
      </div>
    </header>

    <Card class="settings-card">
      <div class="settings-card__meta">
        <SlidersHorizontal class="settings-card__meta-icon" />
        <p class="settings-card__meta-text">Последнее обновление: {{ settingsUpdatedAt }}</p>
      </div>

      <form class="settings-card__form" @submit.prevent="onSave">
        <label class="settings-card__field">
          <span class="settings-card__label">Язык интерфейса</span>
          <Input v-model="settingsForm.ui_lang" :maxlength="10" :disabled="isBusy" />
        </label>

        <label class="settings-card__field">
          <span class="settings-card__label">Тема оформления</span>
          <select v-model="settingsForm.theme" class="settings-card__select" :disabled="isBusy">
            <option value="light">Светлая</option>
            <option value="dark">Темная</option>
          </select>
        </label>

        <label class="settings-card__toggle">
          <input v-model="settingsForm.notifications_enabled" type="checkbox" :disabled="isBusy">
          <span>Уведомления о новых уроках и тестах</span>
        </label>

        <div class="settings-card__actions">
          <Button type="submit" :disabled="isBusy || !isDirty">
            <CheckCircle2 />
            {{ userStore.isSavingSettings ? 'Сохранение...' : 'Сохранить' }}
          </Button>
          <Button type="button" variant="outline" :disabled="isBusy || !isDirty" @click="onReset">
            <RotateCcw />
            Сбросить
          </Button>
        </div>
      </form>

      <div
        v-if="notice"
        class="settings-card__notice"
        :class="{
          'settings-card__notice--success': notice.type === 'success',
          'settings-card__notice--error': notice.type === 'error',
        }"
      >
        <CheckCircle2 v-if="notice.type === 'success'" class="settings-card__notice-icon" />
        <AlertCircle v-else class="settings-card__notice-icon" />
        <p>{{ notice.text }}</p>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 14px;
}

.settings-page__header {
  display: grid;
  gap: 10px;
}

.settings-page__back-button {
  width: fit-content;
}

.settings-page__header-main {
  display: grid;
  gap: 4px;
}

.settings-page__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.settings-page__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
}

.settings-page__subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.settings-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
}

.settings-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  padding: 6px 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--background));
}

.settings-card__meta-icon {
  width: 14px;
  height: 14px;
}

.settings-card__meta-text {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.settings-card__form {
  display: grid;
  gap: 12px;
  max-width: 520px;
}

.settings-card__field {
  display: grid;
  gap: 6px;
}

.settings-card__label {
  font-size: 14px;
}

.settings-card__select {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.settings-card__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-card__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 10px 12px;
}

.settings-card__notice p {
  margin: 0;
}

.settings-card__notice-icon {
  width: 16px;
  height: 16px;
}

.settings-card__notice--success {
  border: 1px solid hsl(146 44% 79%);
  background: hsl(145 58% 93%);
  color: hsl(145 64% 27%);
}

.settings-card__notice--error {
  border: 1px solid hsl(0 75% 83%);
  background: hsl(0 88% 95%);
  color: hsl(0 71% 34%);
}

@media (max-width: 760px) {
  .settings-page__title {
    font-size: 26px;
  }

  .settings-card {
    padding: 14px;
  }
}
</style>
