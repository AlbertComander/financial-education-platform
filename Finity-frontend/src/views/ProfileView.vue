<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLearningStore } from '@/stores/learning'
import { useUserStore } from '@/stores/user'
import { buildProfileAnalytics, getLevelRequirement, getLevelTitle } from '@/lib/profile-experience'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowRight,
  Award,
  BookOpenText,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  PencilLine,
  Settings,
  Sparkles,
  Star,
  Target,
} from 'lucide-vue-next'

type LevelPreviewItem = {
  level: number
  title: string
  requirement: number
  isCurrent: boolean
  isPassed: boolean
}

const router = useRouter()
const auth = useAuthStore()
const userStore = useUserStore()
const learningStore = useLearningStore()

const competencyIconMap = {
  'competency-discipline': BookOpenText,
  'competency-knowledge': BrainCircuit,
  'competency-exam': GraduationCap,
  'competency-consistency': ChartNoAxesCombined,
  'competency-mastery': Target,
} as const

const displayName = computed(() => {
  const value = userStore.profile?.display_name?.trim()
  return value || auth.user?.email || 'Пользователь'
})

const fallbackInitial = computed(() => {
  const first = displayName.value.trim().charAt(0)
  return first ? first.toUpperCase() : 'П'
})

const avatarUrl = computed(() => {
  const value = userStore.profile?.base_params?.avatar_data_url
  return typeof value === 'string' ? value : ''
})

const roleLabel = computed(() => {
  return auth.user?.role === 'admin' ? 'Администратор' : 'Пользователь'
})

const goalText = computed(() => {
  const value = userStore.profile?.goal?.trim()
  return (
    value ||
    'Добавьте учебную цель в редактировании профиля, чтобы система точнее подбирала персональную траекторию.'
  )
})

const profileUpdatedAt = computed(() => {
  const value = userStore.profile?.updated_at
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
})

const analytics = computed(() => buildProfileAnalytics(learningStore.topics))

const unlockedAchievements = computed(() => {
  return analytics.value.achievements.filter((item) => item.unlocked).length
})

const xpToNextLevel = computed(() => {
  return Math.max(
    0,
    analytics.value.levelState.nextLevelXp - analytics.value.levelState.currentXpInLevel,
  )
})

const levelProgressStyle = computed(() => {
  return { width: `${analytics.value.levelState.progressPercent}%` }
})

const levelPreview = computed<LevelPreviewItem[]>(() => {
  const currentLevel = analytics.value.levelState.level
  const values = [Math.max(1, currentLevel - 1), currentLevel, currentLevel + 1, currentLevel + 2]
  const uniqueValues = [...new Set(values)]
  return uniqueValues.map((level) => ({
    level,
    title: getLevelTitle(level),
    requirement: getLevelRequirement(level),
    isCurrent: level === currentLevel,
    isPassed: level < currentLevel,
  }))
})

function competencyIcon(id: string) {
  return competencyIconMap[id as keyof typeof competencyIconMap] ?? Star
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value)
}

function openEditProfile() {
  void router.push({ name: 'profile-edit' })
}

function openSettings() {
  void router.push({ name: 'settings' })
}

function openLearning() {
  void router.push({ name: 'learning' })
}

onMounted(async () => {
  if (!userStore.hasData) {
    try {
      await userStore.loadAll()
    } catch {}
  }
  if (learningStore.topics.length === 0) {
    try {
      await learningStore.loadTopics()
    } catch {}
  }
})
</script>

<template>
  <section class="profile-page">
    <header class="profile-page__header">
      <p class="profile-page__eyebrow">Finity Profile</p>
      <h1 class="profile-page__title">Профиль</h1>
      <p class="profile-page__subtitle">
        Личный профиль объединяет вашу динамику обучения, уровень опыта, компетенции и достижения.
      </p>
    </header>

    <Card class="profile-page__hero-card">
      <div class="profile-page__hero-main">
        <div class="profile-page__identity">
          <Avatar size="lg" class="profile-page__avatar">
            <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
            <AvatarFallback>{{ fallbackInitial }}</AvatarFallback>
          </Avatar>

          <div class="profile-page__identity-content">
            <h2 class="profile-page__name">{{ displayName }}</h2>
            <p class="profile-page__email">{{ auth.user?.email }}</p>

            <div class="profile-page__chips">
              <span class="profile-page__chip">{{ roleLabel }}</span>
              <span class="profile-page__chip">Обновлено: {{ profileUpdatedAt }}</span>
              <span class="profile-page__chip">
                Тем закрыто: {{ analytics.stats.completedTopics }}/{{ analytics.stats.totalTopics }}
              </span>
            </div>

            <p class="profile-page__goal">{{ goalText }}</p>
          </div>
        </div>

        <div class="profile-page__xp-card">
          <p class="profile-page__xp-eyebrow">Уровень {{ analytics.levelState.level }}</p>
          <h3 class="profile-page__xp-title">{{ analytics.levelState.levelTitle }}</h3>
          <p class="profile-page__xp-total">{{ formatNumber(analytics.levelState.totalXp) }} XP</p>

          <div class="profile-page__xp-track">
            <div class="profile-page__xp-fill" :style="levelProgressStyle" />
          </div>

          <p class="profile-page__xp-meta">
            Внутри уровня: {{ formatNumber(analytics.levelState.currentXpInLevel) }} /
            {{ formatNumber(analytics.levelState.nextLevelXp) }} XP
          </p>
          <p class="profile-page__xp-meta">
            До следующего уровня: {{ formatNumber(xpToNextLevel) }} XP
          </p>
        </div>
      </div>

      <div class="profile-page__summary-grid">
        <article class="profile-page__summary-item">
          <p class="profile-page__summary-label">Общий прогресс</p>
          <strong class="profile-page__summary-value">{{ analytics.stats.overallProgressPercent }}%</strong>
        </article>
        <article class="profile-page__summary-item">
          <p class="profile-page__summary-label">Уроки</p>
          <strong class="profile-page__summary-value">
            {{ analytics.stats.completedLessons }}/{{ analytics.stats.totalLessons }}
          </strong>
        </article>
        <article class="profile-page__summary-item">
          <p class="profile-page__summary-label">Тесты</p>
          <strong class="profile-page__summary-value">
            {{ analytics.stats.passedQuizzes }}/{{ analytics.stats.totalQuizzes }}
          </strong>
        </article>
        <article class="profile-page__summary-item">
          <p class="profile-page__summary-label">Достижения</p>
          <strong class="profile-page__summary-value">
            {{ unlockedAchievements }}/{{ analytics.achievements.length }}
          </strong>
        </article>
      </div>

      <div class="profile-page__hero-actions">
        <Button type="button" @click="openEditProfile">
          <PencilLine />
          Изменить профиль
        </Button>
        <Button type="button" variant="outline" @click="openSettings">
          <Settings />
          Настройки
        </Button>
        <Button type="button" variant="outline" @click="openLearning">
          <ArrowRight />
          Продолжить обучение
        </Button>
      </div>
    </Card>

    <div class="profile-page__content-grid">
      <Card class="profile-page__section-card">
        <header class="profile-page__section-header">
          <div class="profile-page__section-title-wrap">
            <Sparkles class="profile-page__section-icon" />
            <h2 class="profile-page__section-title">Компетенции</h2>
          </div>
        </header>

        <div class="profile-page__competency-list">
          <article
            v-for="competency in analytics.competencies"
            :key="competency.id"
            class="profile-page__competency-item"
          >
            <div class="profile-page__competency-head">
              <div class="profile-page__competency-title-wrap">
                <component :is="competencyIcon(competency.id)" class="profile-page__competency-icon" />
                <h3 class="profile-page__competency-title">{{ competency.title }}</h3>
              </div>
              <span class="profile-page__competency-level">{{ competency.levelLabel }}</span>
            </div>

            <p class="profile-page__competency-description">{{ competency.description }}</p>

            <div class="profile-page__competency-progress">
              <div class="profile-page__competency-track">
                <div class="profile-page__competency-fill" :style="{ width: `${competency.percent}%` }" />
              </div>
              <strong class="profile-page__competency-value">{{ competency.percent }}%</strong>
            </div>
          </article>
        </div>
      </Card>

      <Card class="profile-page__section-card">
        <header class="profile-page__section-header">
          <div class="profile-page__section-title-wrap">
            <Target class="profile-page__section-icon" />
            <h2 class="profile-page__section-title">Система опыта</h2>
          </div>
        </header>

        <div class="profile-page__experience-sources">
          <article
            v-for="source in analytics.experienceSources"
            :key="source.id"
            class="profile-page__experience-item"
          >
            <p class="profile-page__experience-label">{{ source.title }}</p>
            <strong class="profile-page__experience-value">+{{ formatNumber(source.value) }} XP</strong>
          </article>
        </div>

        <div class="profile-page__level-path">
          <article
            v-for="level in levelPreview"
            :key="level.level"
            class="profile-page__level-step"
            :class="{
              'profile-page__level-step--passed': level.isPassed,
              'profile-page__level-step--current': level.isCurrent,
            }"
          >
            <div class="profile-page__level-step-meta">
              <p class="profile-page__level-step-title">Уровень {{ level.level }} · {{ level.title }}</p>
              <p class="profile-page__level-step-desc">
                Для прохождения: {{ formatNumber(level.requirement) }} XP
              </p>
            </div>
            <CheckCircle2 v-if="level.isPassed" class="profile-page__level-step-icon profile-page__level-step-icon--done" />
            <Star v-else-if="level.isCurrent" class="profile-page__level-step-icon profile-page__level-step-icon--current" />
            <LockKeyhole v-else class="profile-page__level-step-icon" />
          </article>
        </div>
      </Card>
    </div>

    <Card class="profile-page__section-card profile-page__section-card--achievements">
      <header class="profile-page__section-header">
        <div class="profile-page__section-title-wrap">
          <Award class="profile-page__section-icon" />
          <h2 class="profile-page__section-title">Достижения</h2>
        </div>
        <p class="profile-page__section-note">
          Открыто {{ unlockedAchievements }} из {{ analytics.achievements.length }}
        </p>
      </header>

      <div class="profile-page__achievement-grid">
        <article
          v-for="achievement in analytics.achievements"
          :key="achievement.id"
          class="profile-page__achievement-item"
          :class="{ 'profile-page__achievement-item--unlocked': achievement.unlocked }"
        >
          <div class="profile-page__achievement-icon-wrap">
            <Award v-if="achievement.unlocked" class="profile-page__achievement-icon profile-page__achievement-icon--unlocked" />
            <LockKeyhole v-else class="profile-page__achievement-icon" />
          </div>

          <div class="profile-page__achievement-meta">
            <h3 class="profile-page__achievement-title">{{ achievement.title }}</h3>
            <p class="profile-page__achievement-description">{{ achievement.description }}</p>
          </div>

          <span class="profile-page__achievement-progress">{{ achievement.progressText }}</span>
        </article>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 18px;
  --profile-scale-start: hsl(168 74% 39%);
  --profile-scale-end: hsl(210 82% 56%);
  --profile-achievement-unlocked-border: hsl(166 34% 52% / 0.44);
  --profile-achievement-unlocked-bg: hsl(164 46% 96%);
  --profile-achievement-unlocked-icon: hsl(166 70% 31%);
}

.profile-page__header {
  display: grid;
  gap: 6px;
}

.profile-page__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.profile-page__title {
  margin: 0;
  font-size: clamp(30px, 3.5vw, 42px);
  line-height: 1.04;
}

.profile-page__subtitle {
  margin: 0;
  max-width: 880px;
  color: hsl(var(--muted-foreground));
}

.profile-page__hero-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background:
    radial-gradient(640px 280px at 100% -15%, hsl(214 90% 64% / 0.18), transparent 72%),
    radial-gradient(680px 340px at -15% 125%, hsl(45 100% 59% / 0.12), transparent 70%),
    linear-gradient(180deg, hsl(var(--card)), hsl(var(--card)));
}

.profile-page__hero-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
  align-items: stretch;
}

.profile-page__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.profile-page__avatar {
  border: 2px solid hsl(var(--border));
}

.profile-page__identity-content {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.profile-page__name {
  margin: 0;
  font-size: 30px;
  line-height: 1.06;
}

.profile-page__email {
  margin: 0;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.profile-page__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-page__chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  padding: 0 10px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background) / 0.82);
}

.profile-page__goal {
  margin: 4px 0 0;
  color: hsl(var(--foreground));
}

.profile-page__xp-card {
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 14px;
  background: hsl(var(--background) / 0.9);
  display: grid;
  gap: 6px;
}

.profile-page__xp-eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: hsl(var(--muted-foreground));
}

.profile-page__xp-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.08;
}

.profile-page__xp-total {
  margin: 0;
  font-size: 15px;
  color: hsl(var(--muted-foreground));
}

.profile-page__xp-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
}

.profile-page__xp-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--profile-scale-start), var(--profile-scale-end));
  transition: width 0.24s ease;
}

.profile-page__xp-meta {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.profile-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.profile-page__summary-item {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 10px;
  background: hsl(var(--background) / 0.88);
  display: grid;
  gap: 4px;
}

.profile-page__summary-label {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

.profile-page__summary-value {
  font-size: 22px;
}

.profile-page__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-page__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.profile-page__section-card {
  display: grid;
  gap: 14px;
  border-radius: 16px;
  padding: 16px;
}

.profile-page__section-card--achievements {
  padding-top: 14px;
}

.profile-page__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-page__section-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.profile-page__section-icon {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
}

.profile-page__section-title {
  margin: 0;
  font-size: 21px;
}

.profile-page__section-note {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.profile-page__competency-list {
  display: grid;
  gap: 10px;
}

.profile-page__competency-item {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 7px;
  background: hsl(var(--background));
}

.profile-page__competency-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.profile-page__competency-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.profile-page__competency-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.profile-page__competency-title {
  margin: 0;
  font-size: 16px;
  line-height: 1.15;
}

.profile-page__competency-level {
  min-height: 22px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.profile-page__competency-description {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.profile-page__competency-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-page__competency-track {
  height: 9px;
  border-radius: 999px;
  overflow: hidden;
  background: hsl(var(--muted));
  flex: 1;
}

.profile-page__competency-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--profile-scale-start), var(--profile-scale-end));
  transition: width 0.24s ease;
}

.profile-page__competency-value {
  min-width: 40px;
  text-align: right;
  font-size: 13px;
}

.profile-page__experience-sources {
  display: grid;
  gap: 8px;
}

.profile-page__experience-item {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 10px 12px;
  background: hsl(var(--background));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.profile-page__experience-label {
  margin: 0;
  color: hsl(var(--foreground));
}

.profile-page__experience-value {
  color: hsl(45 95% 44%);
  font-size: 14px;
}

.profile-page__level-path {
  display: grid;
  gap: 8px;
}

.profile-page__level-step {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: hsl(var(--background));
}

.profile-page__level-step--passed {
  border-color: hsl(145 45% 62%);
  background: hsl(145 52% 95%);
}

.profile-page__level-step--current {
  box-shadow: inset 0 0 0 1px hsl(45 95% 52%);
}

.profile-page__level-step-meta {
  display: grid;
  gap: 2px;
}

.profile-page__level-step-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.profile-page__level-step-desc {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.profile-page__level-step-icon {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
}

.profile-page__level-step-icon--done {
  color: hsl(145 65% 32%);
}

.profile-page__level-step-icon--current {
  color: hsl(45 96% 45%);
}

.profile-page__achievement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-page__achievement-item {
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--background));
  padding: 10px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.profile-page__achievement-item--unlocked {
  border-color: var(--profile-achievement-unlocked-border);
  background: var(--profile-achievement-unlocked-bg);
}

.profile-page__achievement-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  display: grid;
  place-items: center;
}

.profile-page__achievement-icon {
  width: 14px;
  height: 14px;
  color: hsl(var(--muted-foreground));
}

.profile-page__achievement-icon--unlocked {
  color: var(--profile-achievement-unlocked-icon);
}

.profile-page__achievement-meta {
  display: grid;
  gap: 2px;
}

.profile-page__achievement-title {
  margin: 0;
  font-size: 14px;
  line-height: 1.15;
}

.profile-page__achievement-description {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.profile-page__achievement-progress {
  min-height: 24px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1160px) {
  .profile-page__hero-main {
    grid-template-columns: 1fr;
  }

  .profile-page__content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 820px) {
  .profile-page__summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-page__achievement-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .profile-page__hero-card,
  .profile-page__section-card {
    padding: 14px;
  }

  .profile-page__identity {
    flex-direction: column;
  }

  .profile-page__name {
    font-size: 24px;
  }

  .profile-page__summary-grid {
    grid-template-columns: 1fr;
  }

  .profile-page__achievement-item {
    grid-template-columns: 28px minmax(0, 1fr);
  }

  .profile-page__achievement-progress {
    grid-column: 2 / 3;
    width: fit-content;
  }
}
</style>
