<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, BookOpen, Clock3, Lock, TrendingUp } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLearningStore } from '@/stores/learning'
import { isFinalExamUnlocked, splitTopicLessons } from '@/lib/learning-lessons'

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const topicId = computed(() => String(route.params.topicId ?? ''))

const sortedTopics = computed(() => {
  return [...learning.topics].sort((a, b) => a.order_index - b.order_index)
})

const topic = computed(() => {
  return sortedTopics.value.find((item) => item.id === topicId.value) ?? null
})

const topicRegularLessons = computed(() => {
  if (!topic.value) return []
  return splitTopicLessons(topic.value).regularLessons
})

const topicFinalExamLesson = computed(() => {
  if (!topic.value) return null
  return splitTopicLessons(topic.value).finalExamLesson
})

const isTopicFinalExamUnlocked = computed(() => {
  if (!topic.value) return false
  return isFinalExamUnlocked(topic.value)
})

const lessonsCount = computed(() => topicRegularLessons.value.length)
const nextLessonId = computed(() => {
  if (!topic.value) return ''
  if (topicRegularLessons.value.length === 0 && topicFinalExamLesson.value && isTopicFinalExamUnlocked.value) {
    return topicFinalExamLesson.value.id
  }
  return (
    topicRegularLessons.value.find((lesson) => lesson.user_progress.status === 'in_progress')?.id ??
    topicRegularLessons.value.find((lesson) => lesson.user_progress.status !== 'completed')?.id ??
    topicRegularLessons.value[0]?.id ??
    ''
  )
})
const totalMinutes = computed(() => {
  return topicRegularLessons.value.reduce((sum, lesson) => sum + lesson.estimated_minutes, 0)
})

const avgDifficulty = computed(() => {
  if (topicRegularLessons.value.length === 0) return 0
  const avg =
    topicRegularLessons.value.reduce((sum, lesson) => sum + lesson.difficulty, 0) /
    topicRegularLessons.value.length
  return Number(avg.toFixed(1))
})

const completedLessonsCount = computed(() => {
  return topicRegularLessons.value.filter((lesson) => lesson.user_progress.status === 'completed').length
})

const inProgressLessonsCount = computed(() => {
  return topicRegularLessons.value.filter((lesson) => lesson.user_progress.status === 'in_progress').length
})

const topicProgressPercent = computed(() => {
  const allItems = [
    ...topicRegularLessons.value,
    ...(topicFinalExamLesson.value ? [topicFinalExamLesson.value] : []),
  ]
  if (allItems.length === 0) return 0
  const total = allItems.reduce((sum, lesson) => sum + lesson.user_progress.progress_percent, 0)
  return Math.round(total / allItems.length)
})

const quizzesTotal = computed(() => {
  const allItems = [
    ...topicRegularLessons.value,
    ...(topicFinalExamLesson.value ? [topicFinalExamLesson.value] : []),
  ]
  return allItems.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_total, 0)
})

const quizzesSolved = computed(() => {
  const allItems = [
    ...topicRegularLessons.value,
    ...(topicFinalExamLesson.value ? [topicFinalExamLesson.value] : []),
  ]
  return allItems.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_solved, 0)
})

onMounted(async () => {
  if (learning.topics.length > 0) return
  try {
    await learning.loadTopics()
  } catch {}
})

watch(topicId, async () => {
  if (learning.topics.length > 0) return
  try {
    await learning.loadTopics()
  } catch {}
})

function openLesson(lessonId: string) {
  const lesson =
    topicRegularLessons.value.find((item) => item.id === lessonId) ??
    (topicFinalExamLesson.value?.id === lessonId ? topicFinalExamLesson.value : null)
  if (!lesson) return

  if (topicFinalExamLesson.value?.id === lessonId && !isTopicFinalExamUnlocked.value) {
    return
  }

  void router.push({
    name: 'lesson',
    params: { lessonId },
    query: { topicId: topicId.value },
  })
}

function openFinalExam() {
  if (!topicFinalExamLesson.value || !isTopicFinalExamUnlocked.value) return
  openLesson(topicFinalExamLesson.value.id)
}

function difficultyLabel(value: number) {
  if (value <= 3) return 'Базовый'
  if (value <= 7) return 'Средний'
  return 'Продвинутый'
}

function formatMinutes(value: number) {
  if (value < 60) return `${value} мин`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (minutes === 0) return `${hours} ч`
  return `${hours} ч ${minutes} мин`
}

function lessonStatusLabel(status: 'not_started' | 'in_progress' | 'completed') {
  if (status === 'completed') return 'Завершен'
  if (status === 'in_progress') return 'В процессе'
  return 'Не начат'
}

function lessonStatusClass(status: 'not_started' | 'in_progress' | 'completed') {
  if (status === 'completed') return 'topic-view__lesson-status--completed'
  if (status === 'in_progress') return 'topic-view__lesson-status--progress'
  return 'topic-view__lesson-status--idle'
}

function lessonProgressWidth(value: number) {
  const normalized = Math.max(0, Math.min(100, value))
  return `${normalized}%`
}
</script>

<template>
  <section class="topic-view">
    <header class="topic-view__header">
      <Button variant="ghost" size="sm" @click="router.push({ name: 'learning' })">
        Назад к темам
      </Button>
    </header>

    <p v-if="learning.isLoading" class="topic-view__state">Загрузка...</p>
    <p v-else-if="learning.error" class="topic-view__state topic-view__state--error">{{ learning.error }}</p>

    <Card v-else-if="!topic" class="topic-view__state-card">
      <p class="topic-view__state">Тема не найдена.</p>
      <Button variant="outline" @click="router.push({ name: 'learning' })">Вернуться к темам</Button>
    </Card>

    <template v-else>
      <Card class="topic-view__hero">
        <div class="topic-view__hero-main">
          <h1 class="topic-view__title">{{ topic.title }}</h1>
          <p v-if="topic.description" class="topic-view__subtitle">{{ topic.description }}</p>

          <div class="topic-view__chips">
            <span class="topic-view__chip">{{ lessonsCount }} уроков</span>
            <span class="topic-view__chip">{{ formatMinutes(totalMinutes) }}</span>
            <span class="topic-view__chip">Сложность {{ avgDifficulty }}</span>
          </div>
        </div>

        <Button
          v-if="nextLessonId"
          class="topic-view__start"
          @click="openLesson(nextLessonId)"
        >
          {{
            inProgressLessonsCount > 0
              ? 'Продолжить обучение'
              : completedLessonsCount === lessonsCount && topicFinalExamLesson
                ? 'Перейти к финальному тесту'
                : 'Начать обучение'
          }}
          <ArrowRight />
        </Button>
      </Card>

      <div class="topic-view__layout">
        <section class="topic-view__lessons">
          <Card
            v-for="(lesson, lessonIndex) in topicRegularLessons"
            :key="lesson.id"
            class="topic-view__lesson-card"
            role="button"
            tabindex="0"
            @click="openLesson(lesson.id)"
            @keydown.enter.prevent="openLesson(lesson.id)"
            @keydown.space.prevent="openLesson(lesson.id)"
          >
            <div class="topic-view__lesson-cover">
              <BookOpen />
            </div>

            <div class="topic-view__lesson-main">
              <p class="topic-view__lesson-order">Урок {{ lessonIndex + 1 }}</p>
              <h2 class="topic-view__lesson-title">{{ lesson.title }}</h2>
              <p v-if="lesson.summary" class="topic-view__lesson-summary">{{ lesson.summary }}</p>
              <p class="topic-view__lesson-meta">
                {{ lesson.estimated_minutes }} мин · {{ difficultyLabel(lesson.difficulty) }}
              </p>
              <div class="topic-view__lesson-progress-row">
                <span
                  class="topic-view__lesson-status"
                  :class="lessonStatusClass(lesson.user_progress.status)"
                >
                  {{ lessonStatusLabel(lesson.user_progress.status) }}
                </span>
                <span class="topic-view__lesson-percent">{{ lesson.user_progress.progress_percent }}%</span>
              </div>
              <div class="topic-view__lesson-progress-bar">
                <div
                  class="topic-view__lesson-progress-fill"
                  :class="lessonStatusClass(lesson.user_progress.status)"
                  :style="{ width: lessonProgressWidth(lesson.user_progress.progress_percent) }"
                />
              </div>
            </div>

            <ArrowRight class="topic-view__lesson-arrow" />
          </Card>

          <Card
            v-if="topicFinalExamLesson"
            class="topic-view__lesson-card topic-view__lesson-card--exam"
            :class="{ 'topic-view__lesson-card--locked': !isTopicFinalExamUnlocked }"
            role="button"
            :tabindex="isTopicFinalExamUnlocked ? 0 : -1"
            @click="openFinalExam"
            @keydown.enter.prevent="openFinalExam"
            @keydown.space.prevent="openFinalExam"
          >
            <div class="topic-view__lesson-cover topic-view__lesson-cover--exam">
              <BookOpen />
            </div>

            <div class="topic-view__lesson-main">
              <p class="topic-view__lesson-order">Финальный тест</p>
              <h2 class="topic-view__lesson-title">{{ topicFinalExamLesson.title }}</h2>
              <p v-if="topicFinalExamLesson.summary" class="topic-view__lesson-summary">
                {{ topicFinalExamLesson.summary }}
              </p>
              <p v-else class="topic-view__lesson-summary">
                Итоговая проверка по всей теме.
              </p>
              <p class="topic-view__lesson-meta">
                {{ topicFinalExamLesson.estimated_minutes }} мин · {{ difficultyLabel(topicFinalExamLesson.difficulty) }}
              </p>
              <div class="topic-view__lesson-progress-row">
                <span
                  class="topic-view__lesson-status"
                  :class="isTopicFinalExamUnlocked ? lessonStatusClass(topicFinalExamLesson.user_progress.status) : 'topic-view__lesson-status--locked'"
                >
                  {{ isTopicFinalExamUnlocked ? lessonStatusLabel(topicFinalExamLesson.user_progress.status) : 'Заблокирован' }}
                </span>
                <span class="topic-view__lesson-percent">
                  {{ isTopicFinalExamUnlocked ? `${topicFinalExamLesson.user_progress.progress_percent}%` : '🔒' }}
                </span>
              </div>
              <div class="topic-view__lesson-progress-bar">
                <div
                  class="topic-view__lesson-progress-fill"
                  :class="isTopicFinalExamUnlocked ? lessonStatusClass(topicFinalExamLesson.user_progress.status) : 'topic-view__lesson-status--locked'"
                  :style="{ width: isTopicFinalExamUnlocked ? lessonProgressWidth(topicFinalExamLesson.user_progress.progress_percent) : '0%' }"
                />
              </div>
            </div>

            <Lock v-if="!isTopicFinalExamUnlocked" class="topic-view__lesson-lock" />
            <ArrowRight v-else class="topic-view__lesson-arrow" />
          </Card>
        </section>

        <Card class="topic-view__side">
          <h2 class="topic-view__side-title">Прогресс курса</h2>
          <div class="topic-view__side-item">
            <BookOpen />
            <span>Уроки</span>
            <strong>{{ completedLessonsCount }} из {{ lessonsCount }}</strong>
          </div>
          <div class="topic-view__side-item">
            <Clock3 />
            <span>Тесты</span>
            <strong>{{ quizzesSolved }} из {{ quizzesTotal }}</strong>
          </div>
          <div class="topic-view__side-item">
            <Lock />
            <span>Финальный тест</span>
            <strong>
              {{
                !topicFinalExamLesson
                  ? 'Нет'
                  : isTopicFinalExamUnlocked
                    ? topicFinalExamLesson.user_progress.status === 'completed'
                      ? 'Сдан'
                      : 'Доступен'
                    : 'Закрыт'
              }}
            </strong>
          </div>
          <div class="topic-view__side-item">
            <TrendingUp />
            <span>Общий прогресс</span>
            <strong>{{ topicProgressPercent }}%</strong>
          </div>
          <div class="topic-view__side-item">
            <Clock3 />
            <span>В процессе</span>
            <strong>{{ inProgressLessonsCount }}</strong>
          </div>
        </Card>
      </div>
    </template>
  </section>
</template>

<style scoped>
.topic-view {
  display: grid;
  gap: 12px;
}

.topic-view__header {
  display: flex;
}

.topic-view__state {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.topic-view__state--error {
  color: hsl(var(--destructive));
}

.topic-view__state-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
}

.topic-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  padding: 18px;
  border-radius: 16px;
  background:
    radial-gradient(400px 120px at 94% -30%, hsl(262 84% 66% / 0.22), transparent 65%),
    linear-gradient(145deg, hsl(var(--card)), hsl(var(--card) / 0.92));
}

.topic-view__hero-main {
  display: grid;
  gap: 8px;
}

.topic-view__title {
  margin: 0;
  font-size: 34px;
  line-height: 1.1;
}

.topic-view__subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
  max-width: 880px;
}

.topic-view__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.topic-view__chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.topic-view__start {
  flex-shrink: 0;
}

.topic-view__layout {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1.75fr) minmax(280px, 1fr);
}

.topic-view__lessons {
  display: grid;
  gap: 10px;
}

.topic-view__lesson-card {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 0;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
}

.topic-view__lesson-card:hover {
  transform: translateY(-2px);
  border-color: hsl(220 80% 56% / 0.52);
  box-shadow: 0 12px 26px hsl(220 80% 56% / 0.12);
}

.topic-view__lesson-card--exam {
  border-style: dashed;
}

.topic-view__lesson-card--locked {
  cursor: not-allowed;
  opacity: 0.76;
  transform: none;
}

.topic-view__lesson-card--locked:hover {
  transform: none;
  border-color: hsl(var(--border));
  box-shadow: none;
}

.topic-view__lesson-card:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.topic-view__lesson-cover {
  align-self: stretch;
  display: grid;
  place-items: center;
  color: hsl(0 0% 100%);
  background:
    radial-gradient(90px 50px at 75% 15%, hsl(340 82% 62% / 0.38), transparent 65%),
    linear-gradient(145deg, hsl(262 84% 66%), hsl(220 80% 56%));
}

.topic-view__lesson-cover :deep(svg) {
  width: 24px;
  height: 24px;
}

.topic-view__lesson-cover--exam {
  background:
    radial-gradient(100px 60px at 85% 18%, hsl(46 100% 58% / 0.42), transparent 65%),
    linear-gradient(145deg, hsl(260 78% 56%), hsl(220 80% 56%));
}

.topic-view__lesson-main {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px 0;
}

.topic-view__lesson-order {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: hsl(var(--muted-foreground));
}

.topic-view__lesson-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.08;
}

.topic-view__lesson-summary {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.topic-view__lesson-meta {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.topic-view__lesson-progress-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.topic-view__lesson-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid transparent;
}

.topic-view__lesson-status--idle {
  color: hsl(var(--muted-foreground));
  border-color: hsl(var(--border));
  background: hsl(var(--background));
}

.topic-view__lesson-status--progress {
  color: hsl(31 78% 32%);
  border-color: hsl(31 58% 74%);
  background: hsl(31 88% 92%);
}

.topic-view__lesson-status--completed {
  color: hsl(151 62% 28%);
  border-color: hsl(151 42% 74%);
  background: hsl(151 72% 92%);
}

.topic-view__lesson-status--locked {
  color: hsl(var(--muted-foreground));
  border-color: hsl(var(--border));
  background: hsl(var(--muted));
}

.topic-view__lesson-percent {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.topic-view__lesson-progress-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: hsl(var(--muted));
  overflow: hidden;
}

.topic-view__lesson-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.24s ease;
}

.topic-view__lesson-progress-fill.topic-view__lesson-status--idle {
  background: hsl(var(--muted-foreground) / 0.35);
}

.topic-view__lesson-progress-fill.topic-view__lesson-status--progress {
  background: linear-gradient(90deg, hsl(31 88% 64%), hsl(31 78% 52%));
}

.topic-view__lesson-progress-fill.topic-view__lesson-status--completed {
  background: linear-gradient(90deg, hsl(151 62% 52%), hsl(151 62% 42%));
}

.topic-view__lesson-progress-fill.topic-view__lesson-status--locked {
  background: hsl(var(--muted-foreground) / 0.25);
}

.topic-view__lesson-arrow {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
  margin-right: 12px;
}

.topic-view__lesson-lock {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
  margin-right: 12px;
}

.topic-view__side {
  height: fit-content;
  position: sticky;
  top: 16px;
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
}

.topic-view__side-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.12;
}

.topic-view__side-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid hsl(var(--border));
}

.topic-view__side-item :deep(svg) {
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
}

.topic-view__side-item span {
  color: hsl(var(--muted-foreground));
}

.topic-view__side-item strong {
  font-weight: 600;
}

@media (max-width: 1100px) {
  .topic-view__layout {
    grid-template-columns: 1fr;
  }

  .topic-view__side {
    position: static;
  }
}

@media (max-width: 900px) {
  .topic-view__hero {
    flex-direction: column;
  }

  .topic-view__title {
    font-size: 28px;
  }
}

@media (max-width: 760px) {
  .topic-view__lesson-card {
    grid-template-columns: 1fr;
  }

  .topic-view__lesson-cover {
    min-height: 70px;
  }

  .topic-view__lesson-main {
    padding: 0 12px 6px;
  }

  .topic-view__lesson-arrow {
    margin: 0 0 12px 12px;
  }
}
</style>
