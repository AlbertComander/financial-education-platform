<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, BookOpen, Clock3, GraduationCap, Sparkles, TrendingUp } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLearningStore } from '@/stores/learning'

const router = useRouter()
const learning = useLearningStore()

const sortedTopics = computed(() => {
  return [...learning.topics].sort((a, b) => a.order_index - b.order_index)
})

const featuredTopic = computed(() => {
  const inProgressTopic =
    sortedTopics.value.find((topic) =>
      topic.lessons.some((lesson) => lesson.user_progress.status === 'in_progress'),
    ) ?? null
  if (inProgressTopic) return inProgressTopic

  const notFinishedTopic =
    sortedTopics.value.find((topic) =>
      topic.lessons.some((lesson) => lesson.user_progress.status !== 'completed'),
    ) ?? null
  if (notFinishedTopic) return notFinishedTopic

  return sortedTopics.value.find((topic) => topic.lessons.length > 0) ?? null
})

const featuredLesson = computed(() => {
  const topic = featuredTopic.value
  if (!topic) return null
  return (
    topic.lessons.find((lesson) => lesson.user_progress.status === 'in_progress') ??
    topic.lessons.find((lesson) => lesson.user_progress.status !== 'completed') ??
    topic.lessons[0] ??
    null
  )
})

const allLessons = computed(() => {
  return sortedTopics.value.flatMap((topic) => topic.lessons)
})

const totalLessons = computed(() => {
  return allLessons.value.length
})

const completedLessons = computed(() => {
  return allLessons.value.filter((lesson) => lesson.user_progress.status === 'completed').length
})

const inProgressLessons = computed(() => {
  return allLessons.value.filter((lesson) => lesson.user_progress.status === 'in_progress').length
})

const totalQuizzes = computed(() => {
  return allLessons.value.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_total, 0)
})

const solvedQuizzes = computed(() => {
  return allLessons.value.reduce((sum, lesson) => sum + lesson.user_progress.quizzes_solved, 0)
})

const overallProgressPercent = computed(() => {
  if (totalLessons.value === 0) return 0
  return Math.round((completedLessons.value / totalLessons.value) * 100)
})

onMounted(async () => {
  if (learning.topics.length > 0) return
  try {
    await learning.loadTopics()
  } catch {}
})

async function reloadTopics() {
  try {
    await learning.loadTopics()
  } catch {}
}

function openTopic(topicId: string) {
  void router.push({ name: 'topic', params: { topicId } })
}

function onTopicKeydown(event: KeyboardEvent, topicId: string) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  openTopic(topicId)
}

function topicMinutes(topicId: string) {
  const topic = sortedTopics.value.find((item) => item.id === topicId)
  if (!topic) return 0
  return topic.lessons.reduce((sum, lesson) => sum + lesson.estimated_minutes, 0)
}

function topicAverage(topicId: string) {
  const topic = sortedTopics.value.find((item) => item.id === topicId)
  if (!topic || topic.lessons.length === 0) return 0
  const avg = topic.lessons.reduce((sum, lesson) => sum + lesson.difficulty, 0) / topic.lessons.length
  return Number(avg.toFixed(1))
}

function topicCompletedLessons(topicId: string) {
  const topic = sortedTopics.value.find((item) => item.id === topicId)
  if (!topic) return 0
  return topic.lessons.filter((lesson) => lesson.user_progress.status === 'completed').length
}

function topicProgressPercent(topicId: string) {
  const topic = sortedTopics.value.find((item) => item.id === topicId)
  if (!topic || topic.lessons.length === 0) return 0
  const sum = topic.lessons.reduce((acc, lesson) => acc + lesson.user_progress.progress_percent, 0)
  return Math.round(sum / topic.lessons.length)
}

function difficultyLabel(value: number) {
  if (value <= 3) return 'Базовый'
  if (value <= 7) return 'Средний'
  return 'Продвинутый'
}

function difficultyClass(value: number) {
  if (value <= 3) return 'learning-page__badge--easy'
  if (value <= 7) return 'learning-page__badge--medium'
  return 'learning-page__badge--hard'
}

function formatMinutes(value: number) {
  if (value < 60) return `${value} мин`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (minutes === 0) return `${hours} ч`
  return `${hours} ч ${minutes} мин`
}

function topicCoverClass(index: number) {
  return `learning-page__topic-cover--${(index % 5) + 1}`
}
</script>

<template>
  <section class="learning-page">
    <header class="learning-page__header">
      <p class="learning-page__eyebrow">Finity Learning</p>
      <h1 class="learning-page__title">Обучение и практика</h1>
      <p class="learning-page__subtitle">
        Выберите тему, откройте уроки внутри карточки и проходите материал последовательно.
      </p>
    </header>

    <div v-if="learning.isLoading" class="learning-page__skeleton-grid">
      <Card v-for="item in 3" :key="item" class="learning-page__skeleton-card">
        <div class="learning-page__skeleton learning-page__skeleton--wide" />
        <div class="learning-page__skeleton learning-page__skeleton--line" />
        <div class="learning-page__skeleton learning-page__skeleton--line learning-page__skeleton--short" />
      </Card>
    </div>

    <Card v-else-if="learning.error" class="learning-page__state-card">
      <p class="learning-page__state-text learning-page__state-text--error">{{ learning.error }}</p>
      <Button variant="outline" @click="reloadTopics">Повторить загрузку</Button>
    </Card>

    <Card v-else-if="sortedTopics.length === 0" class="learning-page__state-card">
      <p class="learning-page__state-text">Темы пока не добавлены.</p>
    </Card>

    <template v-else>
      <section class="learning-page__top-row">
        <Card class="learning-page__continue-card">
          <div class="learning-page__continue-cover">
            <Sparkles class="learning-page__continue-icon" />
          </div>

          <div class="learning-page__continue-content">
            <p class="learning-page__continue-label">Продолжить обучение</p>
            <h2 class="learning-page__continue-title">
              {{ featuredTopic?.title ?? 'Выберите тему' }}
            </h2>
            <p class="learning-page__continue-subtitle">
              {{ featuredLesson?.title ?? 'Тема еще не содержит уроков' }}
            </p>

            <div v-if="featuredLesson" class="learning-page__continue-meta">
              <span class="learning-page__badge" :class="difficultyClass(featuredLesson.difficulty)">
                {{ difficultyLabel(featuredLesson.difficulty) }}
              </span>
              <span class="learning-page__badge learning-page__badge--time">
                {{ featuredLesson.estimated_minutes }} мин
              </span>
              <span class="learning-page__badge learning-page__badge--time">
                {{ featuredLesson.user_progress.progress_percent }}%
              </span>
            </div>

            <Button v-if="featuredTopic" class="learning-page__continue-button" @click="openTopic(featuredTopic.id)">
              {{ featuredLesson?.user_progress.status === 'in_progress' ? 'Продолжить тему' : 'Открыть тему' }}
              <ArrowRight />
            </Button>
          </div>
        </Card>

        <Card class="learning-page__progress-card">
          <h2 class="learning-page__section-title">Прогресс</h2>
          <div class="learning-page__progress-grid">
            <div class="learning-page__progress-item">
              <GraduationCap class="learning-page__progress-icon" />
              <p class="learning-page__progress-label">Уроки пройдено</p>
              <p class="learning-page__progress-value">{{ completedLessons }} / {{ totalLessons }}</p>
            </div>
            <div class="learning-page__progress-item">
              <BookOpen class="learning-page__progress-icon" />
              <p class="learning-page__progress-label">В процессе</p>
              <p class="learning-page__progress-value">{{ inProgressLessons }}</p>
            </div>
            <div class="learning-page__progress-item">
              <Clock3 class="learning-page__progress-icon" />
              <p class="learning-page__progress-label">Тесты решено</p>
              <p class="learning-page__progress-value">{{ solvedQuizzes }} / {{ totalQuizzes }}</p>
            </div>
            <div class="learning-page__progress-item">
              <TrendingUp class="learning-page__progress-icon" />
              <p class="learning-page__progress-label">Общий прогресс</p>
              <p class="learning-page__progress-value">{{ overallProgressPercent }}%</p>
            </div>
          </div>
        </Card>
      </section>

      <section class="learning-page__section">
        <div class="learning-page__section-head">
          <h2 class="learning-page__section-title">Темы и уроки</h2>
        </div>

        <div class="learning-page__topics-stack">
          <Card
            v-for="(topic, topicIndex) in sortedTopics"
            :key="topic.id"
            class="learning-page__topic-card"
            role="button"
            tabindex="0"
            @click="openTopic(topic.id)"
            @keydown="onTopicKeydown($event, topic.id)"
          >
            <div class="learning-page__topic-main">
              <div class="learning-page__topic-cover" :class="topicCoverClass(topicIndex)">
                <span class="learning-page__topic-level">{{ difficultyLabel(topicAverage(topic.id)) }}</span>
              </div>

              <div class="learning-page__topic-info">
                <h3 class="learning-page__topic-title">{{ topic.title }}</h3>
                <p v-if="topic.description" class="learning-page__topic-description">{{ topic.description }}</p>

                <div class="learning-page__topic-meta">
                  <span class="learning-page__topic-chip">{{ topic.lessons.length }} уроков</span>
                  <span class="learning-page__topic-chip">
                    {{ topicCompletedLessons(topic.id) }} из {{ topic.lessons.length }} пройдено
                  </span>
                  <span class="learning-page__topic-chip">Прогресс {{ topicProgressPercent(topic.id) }}%</span>
                  <span class="learning-page__topic-chip">{{ formatMinutes(topicMinutes(topic.id)) }}</span>
                  <span class="learning-page__topic-chip">Сложность {{ topicAverage(topic.id) }}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.learning-page {
  --accent-a: 205 86% 55%;
  --accent-b: 262 84% 66%;
  --accent-c: 147 60% 45%;
  --accent-d: 32 95% 60%;
  --accent-e: 344 82% 63%;
  display: grid;
  gap: 14px;
}

.learning-page__header {
  display: grid;
  gap: 4px;
}

.learning-page__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.learning-page__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
}

.learning-page__subtitle {
  margin: 0;
  max-width: 860px;
  color: hsl(var(--muted-foreground));
}

.learning-page__state-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
}

.learning-page__state-text {
  margin: 0;
}

.learning-page__state-text--error {
  color: hsl(var(--destructive));
}

.learning-page__skeleton-grid {
  display: grid;
  gap: 10px;
}

.learning-page__skeleton-card {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.learning-page__skeleton {
  border-radius: 10px;
  background: hsl(var(--muted));
}

.learning-page__skeleton--wide {
  width: 68%;
  height: 16px;
}

.learning-page__skeleton--line {
  width: 44%;
  height: 12px;
}

.learning-page__skeleton--short {
  width: 28%;
}

.learning-page__top-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

.learning-page__continue-card {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 14px;
  padding: 12px;
  border-radius: 16px;
}

.learning-page__continue-cover {
  border-radius: 14px;
  min-height: 166px;
  display: grid;
  place-items: center;
  color: white;
  background:
    radial-gradient(100px 70px at 20% 20%, hsl(var(--accent-e) / 0.35), transparent 70%),
    radial-gradient(140px 80px at 85% 90%, hsl(var(--accent-d) / 0.28), transparent 72%),
    linear-gradient(145deg, hsl(var(--accent-a)), hsl(var(--accent-b)));
}

.learning-page__continue-icon {
  width: 48px;
  height: 48px;
}

.learning-page__continue-content {
  display: grid;
  gap: 8px;
  align-content: center;
}

.learning-page__continue-label {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: hsl(var(--muted-foreground));
}

.learning-page__continue-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.16;
}

.learning-page__continue-subtitle {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.learning-page__continue-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.learning-page__continue-button {
  width: fit-content;
}

.learning-page__progress-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
}

.learning-page__section {
  display: grid;
  gap: 10px;
}

.learning-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.learning-page__section-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
}

.learning-page__progress-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.learning-page__progress-item {
  display: grid;
  gap: 3px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
}

.learning-page__progress-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--muted-foreground));
}

.learning-page__progress-label {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.learning-page__progress-value {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.learning-page__topics-stack {
  display: grid;
  gap: 12px;
}

.learning-page__topic-card {
  display: grid;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.learning-page__topic-card:hover {
  transform: translateY(-2px);
  border-color: hsl(var(--accent-a) / 0.52);
  box-shadow: 0 14px 32px hsl(var(--accent-a) / 0.11);
}

.learning-page__topic-card:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.learning-page__topic-main {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px;
}

.learning-page__topic-cover {
  min-height: 140px;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: flex-start;
}

.learning-page__topic-cover--1 {
  background:
    radial-gradient(130px 90px at 95% 15%, hsl(var(--accent-d) / 0.34), transparent 64%),
    linear-gradient(145deg, hsl(var(--accent-b)), hsl(var(--accent-a)));
}

.learning-page__topic-cover--2 {
  background:
    radial-gradient(140px 100px at 92% 12%, hsl(var(--accent-a) / 0.34), transparent 66%),
    linear-gradient(145deg, hsl(var(--accent-c)), hsl(var(--accent-a)));
}

.learning-page__topic-cover--3 {
  background:
    radial-gradient(120px 88px at 92% 20%, hsl(var(--accent-e) / 0.28), transparent 66%),
    linear-gradient(145deg, hsl(var(--accent-d)), hsl(var(--accent-e)));
}

.learning-page__topic-cover--4 {
  background:
    radial-gradient(120px 78px at 88% 22%, hsl(var(--accent-c) / 0.25), transparent 66%),
    linear-gradient(145deg, hsl(var(--accent-a)), hsl(var(--accent-c)));
}

.learning-page__topic-cover--5 {
  background:
    radial-gradient(130px 92px at 90% 22%, hsl(var(--accent-b) / 0.3), transparent 66%),
    linear-gradient(145deg, hsl(var(--accent-e)), hsl(var(--accent-b)));
}

.learning-page__topic-level {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  color: #102026;
  background: rgb(255 255 255 / 0.86);
}

.learning-page__topic-info {
  display: grid;
  align-content: center;
  gap: 8px;
  min-width: 0;
}

.learning-page__topic-title {
  margin: 0;
  font-size: 26px;
  line-height: 1.12;
}

.learning-page__topic-description {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.learning-page__topic-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.learning-page__topic-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.learning-page__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  border: 1px solid transparent;
}

.learning-page__badge--easy {
  color: hsl(151 62% 28%);
  border-color: hsl(151 42% 74%);
  background: hsl(151 72% 92%);
}

.learning-page__badge--medium {
  color: hsl(31 78% 32%);
  border-color: hsl(31 58% 74%);
  background: hsl(31 88% 92%);
}

.learning-page__badge--hard {
  color: hsl(355 72% 36%);
  border-color: hsl(355 52% 76%);
  background: hsl(355 84% 93%);
}

.learning-page__badge--time {
  color: hsl(var(--muted-foreground));
  border-color: hsl(var(--border));
  background: hsl(var(--background));
}

@media (max-width: 980px) {
  .learning-page__top-row {
    grid-template-columns: 1fr;
  }

  .learning-page__continue-card {
    grid-template-columns: 132px 1fr;
  }

  .learning-page__continue-cover {
    min-height: 132px;
  }

  .learning-page__section-title {
    font-size: 24px;
  }

  .learning-page__topic-main {
    grid-template-columns: 1fr;
  }

  .learning-page__topic-cover {
    min-height: 116px;
  }
}

@media (max-width: 700px) {
  .learning-page__title {
    font-size: 26px;
  }

  .learning-page__progress-grid {
    grid-template-columns: 1fr;
  }

  .learning-page__continue-card {
    grid-template-columns: 1fr;
  }

  .learning-page__continue-cover {
    min-height: 110px;
  }

  .learning-page__state-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .learning-page__topic-title {
    font-size: 22px;
  }
}
</style>
