<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLearningStore } from '@/stores/learning'

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const lessonId = computed(() => String(route.params.lessonId ?? ''))
const topicIdQuery = computed(() => {
  const value = route.query.topicId
  return typeof value === 'string' ? value : ''
})

const currentLessonProgress = computed(() => {
  for (const topic of learning.topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId.value)
    if (lesson) return lesson.user_progress
  }
  return null
})

const canMarkCompleted = computed(() => {
  return currentLessonProgress.value?.status !== 'completed'
})

function toBlockText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''

  const payload = value as Record<string, unknown>
  const parts: string[] = []

  if (typeof payload.title === 'string' && payload.title.trim()) {
    parts.push(payload.title.trim())
  }
  if (typeof payload.body === 'string' && payload.body.trim()) {
    parts.push(payload.body.trim())
  }
  if (typeof payload.text === 'string' && payload.text.trim()) {
    parts.push(payload.text.trim())
  }

  return parts.join(' - ')
}

async function loadCurrentLesson() {
  if (!lessonId.value) return
  try {
    await learning.loadLesson(lessonId.value)
  } catch {}
}

function openQuiz(quizId: string) {
  const query = topicIdQuery.value ? { topicId: topicIdQuery.value } : {}
  void router.push({ name: 'quiz', params: { quizId }, query })
}

function goBack() {
  if (topicIdQuery.value) {
    void router.push({ name: 'topic', params: { topicId: topicIdQuery.value } })
    return
  }
  void router.push({ name: 'learning' })
}

async function completeLesson() {
  if (!lessonId.value) return
  try {
    await learning.markLessonCompleted(lessonId.value)
  } catch {}
}

watch(lessonId, () => {
  void loadCurrentLesson()
})

onMounted(async () => {
  await loadCurrentLesson()
})
</script>

<template>
  <section class="lesson-view">
    <header class="lesson-view__header">
      <Button variant="outline" size="sm" @click="goBack">
        Назад к темам
      </Button>
      <Button
        v-if="canMarkCompleted"
        size="sm"
        :disabled="learning.isSubmitting"
        @click="completeLesson"
      >
        {{ learning.isSubmitting ? 'Сохранение...' : 'Отметить завершенным' }}
      </Button>
    </header>

    <p v-if="learning.isLoading" class="lesson-view__state">Загрузка...</p>
    <p v-else-if="learning.error" class="lesson-view__state lesson-view__state--error">
      {{ learning.error }}
    </p>

    <template v-else-if="learning.currentLesson">
      <Card class="lesson-view__lesson-card">
        <h1 class="lesson-view__title">{{ learning.currentLesson.title }}</h1>
        <p v-if="learning.currentLesson.summary" class="lesson-view__summary">
          {{ learning.currentLesson.summary }}
        </p>
        <p class="lesson-view__meta">
          Сложность: {{ learning.currentLesson.difficulty }} ·
          {{ learning.currentLesson.estimated_minutes }} мин
        </p>
        <p v-if="currentLessonProgress" class="lesson-view__progress">
          Прогресс: {{ currentLessonProgress.progress_percent }}%
        </p>

        <p class="lesson-view__content">{{ learning.currentLesson.content }}</p>

        <div v-if="learning.currentLesson.lesson_blocks.length > 0" class="lesson-view__blocks">
          <Card
            v-for="block in learning.currentLesson.lesson_blocks"
            :key="block.id"
            class="lesson-view__block-card"
          >
            <p class="lesson-view__block-type">{{ block.block_type }}</p>
            <p class="lesson-view__block-text">{{ toBlockText(block.block_content) }}</p>
          </Card>
        </div>
      </Card>

      <Card class="lesson-view__quizzes-card">
        <h2 class="lesson-view__heading">Тесты по уроку</h2>

        <p v-if="learning.currentLessonQuizzes.length === 0" class="lesson-view__state">
          Для этого урока тесты пока не добавлены.
        </p>

        <div v-else class="lesson-view__quizzes-list">
          <Card
            v-for="quiz in learning.currentLessonQuizzes"
            :key="quiz.id"
            class="lesson-view__quiz-card"
          >
            <div class="lesson-view__quiz-main">
              <h3 class="lesson-view__quiz-title">{{ quiz.title }}</h3>
              <p v-if="quiz.description" class="lesson-view__quiz-description">
                {{ quiz.description }}
              </p>
              <p class="lesson-view__quiz-meta">Вопросов: {{ quiz._count.questions }}</p>
            </div>
            <Button size="sm" @click="openQuiz(quiz.id)">Пройти тест</Button>
          </Card>
        </div>
      </Card>
    </template>
  </section>
</template>

<style scoped>
.lesson-view {
  display: grid;
  gap: 12px;
}

.lesson-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.lesson-view__state {
  margin: 0;
  font-size: 14px;
}

.lesson-view__state--error {
  color: hsl(var(--destructive));
}

.lesson-view__lesson-card,
.lesson-view__quizzes-card {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 14px;
}

.lesson-view__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
}

.lesson-view__summary {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.lesson-view__meta {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__progress {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__content {
  margin: 0;
  white-space: pre-line;
}

.lesson-view__blocks {
  display: grid;
  gap: 8px;
}

.lesson-view__block-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
}

.lesson-view__block-type {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

.lesson-view__block-text {
  margin: 0;
}

.lesson-view__heading {
  margin: 0;
  font-size: 21px;
  line-height: 1.2;
}

.lesson-view__quizzes-list {
  display: grid;
  gap: 10px;
}

.lesson-view__quiz-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
}

.lesson-view__quiz-main {
  min-width: 0;
}

.lesson-view__quiz-title {
  margin: 0 0 4px;
  font-size: 16px;
  line-height: 1.25;
}

.lesson-view__quiz-description {
  margin: 0 0 4px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__quiz-meta {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 900px) {
  .lesson-view__lesson-card,
  .lesson-view__quizzes-card {
    padding: 16px;
  }

  .lesson-view__title {
    font-size: 24px;
  }

  .lesson-view__quiz-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
