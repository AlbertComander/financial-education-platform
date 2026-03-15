<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/http'
import { useUserStore } from '@/stores/user'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const userStore = useUserStore()

const profileForm = reactive({
  display_name: '',
  goal: '',
  experience_lvl: 0,
})

const settingsForm = reactive({
  ui_lang: 'ru',
  theme: 'light',
  notifications_enabled: true,
  personalization_level: 1,
})

const successMessage = ref('')
const errorMessage = ref('')

watch(
  () => userStore.profile,
  (profile) => {
    if (!profile) return
    profileForm.display_name = profile.display_name ?? ''
    profileForm.goal = profile.goal ?? ''
    profileForm.experience_lvl = profile.experience_lvl ?? 0
  },
  { immediate: true },
)

watch(
  () => userStore.settings,
  (settings) => {
    if (!settings) return
    settingsForm.ui_lang = settings.ui_lang
    settingsForm.theme = settings.theme
    settingsForm.notifications_enabled = settings.notifications_enabled
    settingsForm.personalization_level = settings.personalization_level
  },
  { immediate: true },
)

onMounted(async () => {
  if (!userStore.hasData) {
    try {
      await userStore.loadAll()
    } catch (error) {
      errorMessage.value = normalizeMessage(error, 'Не удалось загрузить данные профиля.')
    }
  }
})

function normalizeMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

async function onSaveProfile() {
  successMessage.value = ''
  errorMessage.value = ''
  try {
    await userStore.saveProfile({
      display_name: profileForm.display_name.trim(),
      goal: profileForm.goal.trim(),
      experience_lvl: Number(profileForm.experience_lvl),
      base_params: userStore.profile?.base_params ?? {},
    })
    successMessage.value = 'Профиль успешно обновлен.'
  } catch (error) {
    errorMessage.value = normalizeMessage(error, 'Не удалось обновить профиль.')
  }
}

async function onSaveSettings() {
  successMessage.value = ''
  errorMessage.value = ''
  try {
    await userStore.saveSettings({
      ui_lang: settingsForm.ui_lang.trim(),
      theme: settingsForm.theme.trim(),
      notifications_enabled: settingsForm.notifications_enabled,
      personalization_level: Number(settingsForm.personalization_level),
    })
    successMessage.value = 'Настройки успешно обновлены.'
  } catch (error) {
    errorMessage.value = normalizeMessage(error, 'Не удалось обновить настройки.')
  }
}
</script>

<template>
  <section class="profile-page">
    <header class="profile-page__header">
      <h1 class="profile-page__title">Профиль пользователя</h1>
      <p class="profile-page__subtitle">Настройте данные профиля и параметры персонализации платформы.</p>
    </header>

    <div class="profile-page__grid">
      <Card class="profile-page__card">
        <h2 class="profile-page__heading">Параметры профиля</h2>
        <form class="profile-page__form" @submit.prevent="onSaveProfile">
          <label class="profile-page__field">
            <span class="profile-page__field-label">Отображаемое имя</span>
            <Input v-model="profileForm.display_name" :maxlength="100" />
          </label>

          <label class="profile-page__field">
            <span class="profile-page__field-label">Цель обучения</span>
            <Textarea v-model="profileForm.goal" />
          </label>

          <label class="profile-page__field">
            <span class="profile-page__field-label">Уровень опыта (0..10)</span>
            <Input v-model="profileForm.experience_lvl" type="number" :min="0" :max="10" />
          </label>

          <Button type="submit" :disabled="userStore.isSavingProfile">Сохранить профиль</Button>
        </form>
      </Card>

      <Card class="profile-page__card">
        <h2 class="profile-page__heading">Настройки платформы</h2>
        <form class="profile-page__form" @submit.prevent="onSaveSettings">
          <label class="profile-page__field">
            <span class="profile-page__field-label">Язык интерфейса</span>
            <Input v-model="settingsForm.ui_lang" :maxlength="10" />
          </label>

          <label class="profile-page__field">
            <span class="profile-page__field-label">Тема оформления</span>
            <select v-model="settingsForm.theme" class="profile-page__select">
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>

          <label class="profile-page__field profile-page__field--inline">
            <input v-model="settingsForm.notifications_enabled" type="checkbox" class="profile-page__checkbox">
            <span class="profile-page__field-label">Включить уведомления</span>
          </label>

          <label class="profile-page__field">
            <span class="profile-page__field-label">Уровень персонализации (0..3)</span>
            <Input
              v-model="settingsForm.personalization_level"
              type="number"
              :min="0"
              :max="3"
            />
          </label>

          <Button type="submit" :disabled="userStore.isSavingSettings">Сохранить настройки</Button>
        </form>
      </Card>
    </div>

    <p v-if="successMessage" class="profile-page__message profile-page__message--success">{{ successMessage }}</p>
    <p v-if="errorMessage" class="profile-page__message profile-page__message--error">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 14px;
}

.profile-page__header {
  display: grid;
  gap: 6px;
}

.profile-page__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
}

.profile-page__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-page__card {
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
}

.profile-page__heading {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}

.profile-page__subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.profile-page__form {
  display: grid;
  gap: 12px;
}

.profile-page__field {
  display: grid;
  gap: 6px;
}

.profile-page__field--inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-page__checkbox {
  width: 16px;
  height: 16px;
}

.profile-page__field-label {
  font-size: 14px;
}

.profile-page__select {
  width: 100%;
  height: 36px;
  border: 1px solid hsl(var(--input));
  border-radius: 8px;
  background: transparent;
  padding: 0 12px;
  font-size: 14px;
}

.profile-page__select:focus-visible {
  outline: 1px solid hsl(var(--ring));
}

.profile-page__message {
  margin: 0;
  font-size: 14px;
}

.profile-page__message--success {
  color: #15803d;
}

.profile-page__message--error {
  color: hsl(var(--destructive));
}

@media (max-width: 980px) {
  .profile-page__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-page__card {
    padding: 16px;
  }

  .profile-page__title {
    font-size: 24px;
  }
}
</style>
