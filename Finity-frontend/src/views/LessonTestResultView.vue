<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, CircleAlert, RotateCcw, Trophy } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLearningStore } from '@/stores/learning'
import { isFinalExamLesson, isFinalExamUnlocked } from '@/lib/learning-lessons'

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const lessonId = computed(() => String(route.params.lessonId ?? ''))
const topicIdQuery = computed(() => {
  const value = route.query.topicId
  return typeof value === 'string' ? value : ''
})

function parseQueryNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const score = computed(() => parseQueryNumber(route.query.score, 0))
const maxScore = computed(() => parseQueryNumber(route.query.maxScore, 0))
const percent = computed(() => parseQueryNumber(route.query.percent, 0))
const passed = computed(() => percent.value >= 70)

const resultTitle = computed(() => {
  return passed.value ? 'Финальный тест завершен' : 'Финальный тест не пройден'
})

const resultSubtitle = computed(() => {
  if (passed.value) return 'Отличный результат. Тема успешно закрыта.'
  return 'Рекомендуется повторить материал и попробовать еще раз.'
})

const currentTopic = computed(() => {
  if (topicIdQuery.value) {
    return learning.topics.find((topic) => topic.id === topicIdQuery.value) ?? null
  }

  for (const topic of learning.topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId.value)
    if (lesson) return topic
  }

  return null
})

const nextLessonMeta = computed(() => {
  const topic = currentTopic.value
  if (!topic) return null
  const currentIndex = topic.lessons.findIndex((item) => item.id === lessonId.value)
  if (currentIndex < 0) return null
  return topic.lessons[currentIndex + 1] ?? null
})

const nextLessonLocked = computed(() => {
  if (!currentTopic.value || !nextLessonMeta.value) return false
  if (!isFinalExamLesson(nextLessonMeta.value)) return false
  return !isFinalExamUnlocked(currentTopic.value)
})

const canGoNext = computed(() => {
  return !!nextLessonMeta.value && !nextLessonLocked.value
})

const nextButtonLabel = computed(() => {
  if (!nextLessonMeta.value) return 'К теме'
  if (isFinalExamLesson(nextLessonMeta.value)) return 'К финальному тесту'
  return 'Дальше'
})

function repeatFinalTest() {
  const nextTopicId = topicIdQuery.value || currentTopic.value?.id || ''
  void router.push({
    name: 'lesson',
    params: { lessonId: lessonId.value },
    query: {
      ...(nextTopicId ? { topicId: nextTopicId } : {}),
      focus: 'quiz',
    },
  })
}

function continueForward() {
  const nextTopicId = topicIdQuery.value || currentTopic.value?.id || ''

  if (canGoNext.value && nextLessonMeta.value) {
    void router.push({
      name: 'lesson',
      params: { lessonId: nextLessonMeta.value.id },
      query: nextTopicId ? { topicId: nextTopicId } : {},
    })
    return
  }

  if (currentTopic.value) {
    void router.push({
      name: 'topic',
      params: { topicId: currentTopic.value.id },
    })
    return
  }

  void router.push({ name: 'learning' })
}

onMounted(async () => {
  if (learning.topics.length > 0) return
  try {
    await learning.loadTopics()
  } catch {}
})
</script>

<template>
  <section class="lesson-test-result">
    <Card class="lesson-test-result__card">
      <div class="lesson-test-result__hero">
        <div class="lesson-test-result__icon-wrap" :class="{ 'lesson-test-result__icon-wrap--ok': passed }">
          <Trophy v-if="passed" class="lesson-test-result__icon" />
          <CircleAlert v-else class="lesson-test-result__icon" />
        </div>

        <div class="lesson-test-result__hero-text">
          <h1 class="lesson-test-result__title">{{ resultTitle }}</h1>
          <p class="lesson-test-result__subtitle">{{ resultSubtitle }}</p>
        </div>
      </div>

      <div class="lesson-test-result__stats">
        <div class="lesson-test-result__stat">
          <span class="lesson-test-result__stat-label">Финальный тест</span>
          <strong class="lesson-test-result__stat-value">Результат</strong>
        </div>
        <div class="lesson-test-result__stat">
          <span class="lesson-test-result__stat-label">Баллы</span>
          <strong class="lesson-test-result__stat-value">{{ score }} / {{ maxScore }}</strong>
        </div>
        <div class="lesson-test-result__stat">
          <span class="lesson-test-result__stat-label">Процент</span>
          <strong class="lesson-test-result__stat-value">{{ percent }}%</strong>
        </div>
      </div>

      <div class="lesson-test-result__actions">
        <Button variant="outline" @click="repeatFinalTest">
          <RotateCcw />
          Повторить
        </Button>

        <Button :disabled="nextLessonLocked" @click="continueForward">
          {{ nextButtonLabel }}
          <ArrowRight />
        </Button>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.lesson-test-result {
  display: grid;
  gap: 12px;
}

.lesson-test-result__card {
  display: grid;
  gap: 16px;
  padding: 24px;
  border-radius: 20px;
  background:
    radial-gradient(420px 180px at 92% -36%, hsl(210 92% 56% / 0.16), transparent 70%),
    radial-gradient(360px 180px at -10% 106%, hsl(262 84% 66% / 0.12), transparent 74%),
    hsl(var(--card));
}

.lesson-test-result__hero {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lesson-test-result__icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: hsl(0 72% 42%);
  background: hsl(0 84% 94%);
  border: 1px solid hsl(0 60% 80%);
  flex-shrink: 0;
}

.lesson-test-result__icon-wrap--ok {
  color: hsl(151 62% 28%);
  background: hsl(151 72% 92%);
  border-color: hsl(151 42% 74%);
}

.lesson-test-result__icon {
  width: 24px;
  height: 24px;
}

.lesson-test-result__hero-text {
  display: grid;
  gap: 4px;
}

.lesson-test-result__title {
  margin: 0;
  font-size: 34px;
  line-height: 1.08;
}

.lesson-test-result__subtitle {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.lesson-test-result__stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lesson-test-result__stat {
  display: grid;
  gap: 3px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background) / 0.72);
}

.lesson-test-result__stat-label {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lesson-test-result__stat-value {
  font-size: 20px;
  line-height: 1.2;
}

.lesson-test-result__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 860px) {
  .lesson-test-result__card {
    padding: 18px;
  }

  .lesson-test-result__title {
    font-size: 28px;
  }

  .lesson-test-result__stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .lesson-test-result__hero {
    align-items: flex-start;
  }

  .lesson-test-result__actions {
    flex-direction: column;
  }

  .lesson-test-result__actions :deep(button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
