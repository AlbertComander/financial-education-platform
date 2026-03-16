<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { splitTopicLessons } from '@/lib/learning-lessons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, RotateCcw, Trash2 } from 'lucide-vue-next'

type Notice = {
  type: 'success' | 'error'
  text: string
}

const router = useRouter()
const auth = useAuthStore()
const userStore = useUserStore()
const learningStore = useLearningStore()

const profileForm = reactive({
  display_name: '',
  goal: '',
})

const avatarDataUrl = ref('')
const avatarFileName = ref('')
const notice = ref<Notice | null>(null)
const initialProfileState = ref('')

const isBusy = computed(() => {
  return userStore.isLoading || userStore.isSavingProfile
})

const displayName = computed(() => {
  const value = profileForm.display_name.trim()
  return value || auth.user?.email || 'Пользователь'
})

const fallbackInitial = computed(() => {
  const first = displayName.value.charAt(0)
  return first ? first.toUpperCase() : 'П'
})

const allLessons = computed(() => {
  return learningStore.topics.flatMap((topic) => splitTopicLessons(topic).regularLessons)
})

const totalLessons = computed(() => allLessons.value.length)
const completedLessons = computed(() => {
  return allLessons.value.filter((lesson) => lesson.user_progress.status === 'completed').length
})
const totalQuizzes = computed(() => {
  return allLessons.value.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_total, 0)
})
const solvedQuizzes = computed(() => {
  return allLessons.value.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_solved, 0)
})

const autoExperienceScore = computed(() => {
  if (totalLessons.value === 0 && totalQuizzes.value === 0) {
    return Math.min(10, Math.max(0, userStore.profile?.experience_lvl ?? 0))
  }
  const lessonRatio = totalLessons.value > 0 ? completedLessons.value / totalLessons.value : 0
  const quizRatio = totalQuizzes.value > 0 ? solvedQuizzes.value / totalQuizzes.value : lessonRatio
  return Math.round((lessonRatio * 0.7 + quizRatio * 0.3) * 10)
})

const isDirty = computed(() => {
  return JSON.stringify(getProfileState()) !== initialProfileState.value
})

watch(
  () => userStore.profile,
  (profile) => {
    if (!profile) return
    profileForm.display_name = profile.display_name ?? ''
    profileForm.goal = profile.goal ?? ''
    avatarDataUrl.value = getAvatarFromBaseParams(profile.base_params)
    avatarFileName.value = ''
    initialProfileState.value = JSON.stringify(getProfileState())
  },
  { immediate: true },
)

onMounted(async () => {
  if (!userStore.hasData) {
    try {
      await userStore.loadAll()
    } catch (error) {
      notice.value = { type: 'error', text: normalizeMessage(error, 'Не удалось загрузить профиль.') }
    }
  }
  if (learningStore.topics.length === 0) {
    try {
      await learningStore.loadTopics()
    } catch {}
  }
})

function normalizeMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function getAvatarFromBaseParams(baseParams: Record<string, unknown>): string {
  const avatar = baseParams.avatar_data_url
  return typeof avatar === 'string' ? avatar : ''
}

function getProfileState() {
  return {
    display_name: profileForm.display_name.trim(),
    goal: profileForm.goal.trim(),
    avatar_data_url: avatarDataUrl.value.trim(),
  }
}

function buildBaseParams(): Record<string, unknown> {
  const baseParams = { ...(userStore.profile?.base_params ?? {}) }
  if (avatarDataUrl.value.trim().length > 0) {
    baseParams.avatar_data_url = avatarDataUrl.value
  } else {
    delete baseParams.avatar_data_url
  }
  return baseParams
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read file'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  notice.value = null

  if (!file.type.startsWith('image/')) {
    notice.value = { type: 'error', text: 'Выберите файл изображения.' }
    return
  }

  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    notice.value = { type: 'error', text: 'Максимальный размер файла: 2 МБ.' }
    return
  }

  try {
    avatarDataUrl.value = await readAsDataUrl(file)
    avatarFileName.value = file.name
    notice.value = { type: 'success', text: 'Аватар загружен. Сохраните профиль.' }
  } catch {
    notice.value = { type: 'error', text: 'Не удалось обработать файл.' }
  }
}

function onAvatarRemove() {
  avatarDataUrl.value = ''
  avatarFileName.value = ''
  notice.value = { type: 'success', text: 'Аватар удален. Сохраните профиль.' }
}

function onReset() {
  const profile = userStore.profile
  if (!profile) return
  profileForm.display_name = profile.display_name ?? ''
  profileForm.goal = profile.goal ?? ''
  avatarDataUrl.value = getAvatarFromBaseParams(profile.base_params)
  avatarFileName.value = ''
  notice.value = null
}

async function onSave() {
  notice.value = null
  try {
    await userStore.saveProfile({
      display_name: profileForm.display_name.trim(),
      goal: profileForm.goal.trim(),
      experience_lvl: autoExperienceScore.value,
      base_params: buildBaseParams(),
    })
    initialProfileState.value = JSON.stringify(getProfileState())
    notice.value = { type: 'success', text: 'Профиль сохранен.' }
  } catch (error) {
    notice.value = { type: 'error', text: normalizeMessage(error, 'Не удалось сохранить профиль.') }
  }
}

function backToProfile() {
  void router.push({ name: 'profile' })
}
</script>

<template>
  <section class="edit-profile-page">
    <header class="edit-profile-page__header">
      <Button type="button" variant="outline" class="edit-profile-page__back-button" @click="backToProfile">
        <ArrowLeft />
        Профиль
      </Button>
      <div class="edit-profile-page__header-main">
        <p class="edit-profile-page__eyebrow">Редактирование</p>
        <h1 class="edit-profile-page__title">Изменить профиль</h1>
        <p class="edit-profile-page__subtitle">Измените имя, цель обучения и аватар.</p>
      </div>
    </header>

    <Card class="edit-profile-card">
      <div class="edit-profile-card__top">
        <Avatar size="lg" class="edit-profile-card__avatar">
          <AvatarImage v-if="avatarDataUrl" :src="avatarDataUrl" :alt="displayName" />
          <AvatarFallback>{{ fallbackInitial }}</AvatarFallback>
        </Avatar>

        <div class="edit-profile-card__meta">
          <h2 class="edit-profile-card__name">{{ displayName }}</h2>
          <p class="edit-profile-card__email">{{ auth.user?.email }}</p>
          <p class="edit-profile-card__auto-level">Автоуровень опыта: {{ autoExperienceScore }}/10</p>
        </div>
      </div>

      <div class="edit-profile-card__avatar-actions">
        <label class="edit-profile-card__upload-label">
          <input
            type="file"
            class="edit-profile-card__upload-input"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            @change="onAvatarSelected"
          >
          <Camera class="edit-profile-card__upload-icon" />
          Загрузить аватар
        </label>

        <Button type="button" variant="outline" :disabled="!avatarDataUrl || isBusy" @click="onAvatarRemove">
          <Trash2 />
          Удалить
        </Button>
      </div>

      <p v-if="avatarFileName" class="edit-profile-card__file-name">Файл: {{ avatarFileName }}</p>

      <form class="edit-profile-card__form" @submit.prevent="onSave">
        <label class="edit-profile-card__field">
          <span class="edit-profile-card__label">Отображаемое имя</span>
          <Input v-model="profileForm.display_name" :maxlength="100" :disabled="isBusy" />
        </label>

        <label class="edit-profile-card__field">
          <span class="edit-profile-card__label">Цель обучения</span>
          <Textarea v-model="profileForm.goal" :maxlength="500" rows="6" :disabled="isBusy" />
        </label>

        <div class="edit-profile-card__actions">
          <Button type="submit" :disabled="isBusy || !isDirty">
            <CheckCircle2 />
            {{ userStore.isSavingProfile ? 'Сохранение...' : 'Сохранить' }}
          </Button>
          <Button type="button" variant="outline" :disabled="isBusy || !isDirty" @click="onReset">
            <RotateCcw />
            Сбросить
          </Button>
        </div>
      </form>

      <div
        v-if="notice"
        class="edit-profile-card__notice"
        :class="{
          'edit-profile-card__notice--success': notice.type === 'success',
          'edit-profile-card__notice--error': notice.type === 'error',
        }"
      >
        <CheckCircle2 v-if="notice.type === 'success'" class="edit-profile-card__notice-icon" />
        <AlertCircle v-else class="edit-profile-card__notice-icon" />
        <p>{{ notice.text }}</p>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.edit-profile-page {
  display: grid;
  gap: 14px;
}

.edit-profile-page__header {
  display: grid;
  gap: 10px;
}

.edit-profile-page__back-button {
  width: fit-content;
}

.edit-profile-page__header-main {
  display: grid;
  gap: 4px;
}

.edit-profile-page__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.edit-profile-page__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
}

.edit-profile-page__subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.edit-profile-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  max-width: 760px;
}

.edit-profile-card__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edit-profile-card__avatar {
  border: 2px solid hsl(var(--border));
}

.edit-profile-card__meta {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.edit-profile-card__name {
  margin: 0;
  font-size: 22px;
}

.edit-profile-card__email {
  margin: 0;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.edit-profile-card__auto-level {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.edit-profile-card__avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-profile-card__upload-input {
  display: none;
}

.edit-profile-card__upload-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  cursor: pointer;
}

.edit-profile-card__upload-icon {
  width: 16px;
  height: 16px;
}

.edit-profile-card__file-name {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.edit-profile-card__form {
  display: grid;
  gap: 12px;
}

.edit-profile-card__field {
  display: grid;
  gap: 6px;
}

.edit-profile-card__label {
  font-size: 14px;
}

.edit-profile-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.edit-profile-card__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 10px 12px;
}

.edit-profile-card__notice p {
  margin: 0;
}

.edit-profile-card__notice-icon {
  width: 16px;
  height: 16px;
}

.edit-profile-card__notice--success {
  border: 1px solid hsl(146 44% 79%);
  background: hsl(145 58% 93%);
  color: hsl(145 64% 27%);
}

.edit-profile-card__notice--error {
  border: 1px solid hsl(0 75% 83%);
  background: hsl(0 88% 95%);
  color: hsl(0 71% 34%);
}

@media (max-width: 760px) {
  .edit-profile-page__title {
    font-size: 26px;
  }

  .edit-profile-card {
    padding: 14px;
  }

  .edit-profile-card__top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
