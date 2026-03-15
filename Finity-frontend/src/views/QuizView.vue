<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRoute, useRouter } from 'vue-router'
import { useLearningStore } from '@/stores/learning'
import type { QuizAttempt } from '@/types/learning'

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const quizId = computed(() => String(route.params.quizId ?? ''))
const topicIdQuery = computed(() => {
  const value = route.query.topicId
  return typeof value === 'string' ? value : ''
})
const selectedAnswers = ref<Record<string, string[]>>({})
const canSubmit = computed(() => {
  const quiz = learning.currentQuiz
  if (!quiz) return false
  return quiz.questions.every((question) => (selectedAnswers.value[question.id]?.length ?? 0) > 0)
})

function normalizeSelections() {
  const quiz = learning.currentQuiz
  if (!quiz) return

  const state: Record<string, string[]> = {}
  for (const question of quiz.questions) {
    state[question.id] = []
  }
  selectedAnswers.value = state
}

function isSelected(questionId: string, answerId: string) {
  return selectedAnswers.value[questionId]?.includes(answerId) ?? false
}

function selectSingle(questionId: string, answerId: string) {
  selectedAnswers.value[questionId] = [answerId]
}

function toggleMulti(questionId: string, answerId: string) {
  const current = selectedAnswers.value[questionId] ?? []
  if (current.includes(answerId)) {
    selectedAnswers.value[questionId] = current.filter((id) => id !== answerId)
    return
  }
  selectedAnswers.value[questionId] = [...current, answerId]
}

function buildSubmitPayload() {
  const quiz = learning.currentQuiz
  if (!quiz) return []

  return quiz.questions.map((question) => ({
    questionId: question.id,
    selectedAnswerIds: selectedAnswers.value[question.id] ?? [],
  }))
}

function attemptDisplayNumber(index: number) {
  return learning.myAttempts.length - index
}

function attemptCorrectSummary(attempt: QuizAttempt): string {
  const total = attempt.user_answers.length
  if (total === 0) return '- / -'
  const correct = attempt.user_answers.filter((answer) => answer.is_correct === true).length
  return `${correct} / ${total}`
}

async function loadQuiz() {
  if (!quizId.value) return
  try {
    await learning.loadQuiz(quizId.value)
    normalizeSelections()
    learning.resetTransient()
  } catch {}
}

async function submitQuiz() {
  if (!learning.currentQuiz || !canSubmit.value) return
  try {
    await learning.submitQuizAttempt(learning.currentQuiz.id, buildSubmitPayload())
  } catch {}
}

function backToLesson() {
  if (!learning.currentQuiz) return
  const query = topicIdQuery.value ? { topicId: topicIdQuery.value } : {}
  void router.push({ name: 'lesson', params: { lessonId: learning.currentQuiz.lesson_id }, query })
}

watch(quizId, () => {
  void loadQuiz()
})

watch(
  () => learning.currentQuiz?.id,
  () => {
    normalizeSelections()
  },
)

onMounted(async () => {
  await loadQuiz()
})
</script>

<template>
  <section class="quiz-view">
    <header class="quiz-view__header">
      <Button
        v-if="learning.currentQuiz"
        variant="outline"
        size="sm"
        @click="backToLesson"
      >
        Назад к уроку
      </Button>
    </header>

    <p v-if="learning.isLoading" class="quiz-view__state">Загрузка...</p>
    <p v-else-if="learning.error" class="quiz-view__state quiz-view__state--error">
      {{ learning.error }}
    </p>

    <template v-else-if="learning.currentQuiz">
      <Card class="quiz-view__quiz-card">
        <h1 class="quiz-view__title">{{ learning.currentQuiz.title }}</h1>
        <p v-if="learning.currentQuiz.description" class="quiz-view__description">
          {{ learning.currentQuiz.description }}
        </p>

        <div class="quiz-view__questions">
          <Card
            v-for="(question, questionIndex) in learning.currentQuiz.questions"
            :key="question.id"
            class="quiz-view__question-card"
          >
            <h2 class="quiz-view__question-title">
              {{ questionIndex + 1 }}. {{ question.text }}
            </h2>
            <p class="quiz-view__question-meta">
              Тип: {{ question.q_type === 'multiple' ? 'несколько ответов' : 'один ответ' }}
            </p>

            <div class="quiz-view__answers">
              <label
                v-for="answer in question.answers"
                :key="answer.id"
                class="quiz-view__answer"
              >
                <input
                  v-if="question.q_type === 'single'"
                  :name="`q-${question.id}`"
                  type="radio"
                  :checked="isSelected(question.id, answer.id)"
                  @change="selectSingle(question.id, answer.id)"
                >
                <input
                  v-else
                  type="checkbox"
                  :checked="isSelected(question.id, answer.id)"
                  @change="toggleMulti(question.id, answer.id)"
                >
                <span>{{ answer.text }}</span>
              </label>
            </div>
          </Card>
        </div>

        <p v-if="!canSubmit" class="quiz-view__submit-hint">
          Ответьте на все вопросы, чтобы отправить тест.
        </p>

        <Button :disabled="learning.isSubmitting || !canSubmit" @click="submitQuiz">
          {{ learning.isSubmitting ? 'Отправка...' : 'Отправить ответы' }}
        </Button>
      </Card>

      <Card v-if="learning.latestAttempt" class="quiz-view__result-card">
        <h2 class="quiz-view__result-title">Результат попытки</h2>
        <p class="quiz-view__result-line">
          Балл: {{ learning.latestAttempt.score }} / {{ learning.latestAttempt.maxScore }}
        </p>
        <p class="quiz-view__result-line">
          Процент: {{ learning.latestAttempt.percent }}%
        </p>
      </Card>

      <Card class="quiz-view__history-card">
        <h2 class="quiz-view__history-title">Мои попытки</h2>
        <p v-if="learning.myAttempts.length === 0" class="quiz-view__state">
          Попыток пока нет.
        </p>
        <ul v-else class="quiz-view__history-list">
          <li
            v-for="(attempt, index) in learning.myAttempts"
            :key="attempt.id"
            class="quiz-view__history-item"
          >
            <span>Попытка №{{ attemptDisplayNumber(index) }}</span>
            <span>
              {{ attemptCorrectSummary(attempt) }}
            </span>
          </li>
        </ul>
      </Card>
    </template>
  </section>
</template>

<style scoped>
.quiz-view {
  display: grid;
  gap: 12px;
}

.quiz-view__header {
  display: flex;
}

.quiz-view__state {
  margin: 0;
  font-size: 14px;
}

.quiz-view__state--error {
  color: hsl(var(--destructive));
}

.quiz-view__quiz-card,
.quiz-view__result-card,
.quiz-view__history-card {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 14px;
}

.quiz-view__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
}

.quiz-view__description {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.quiz-view__questions {
  display: grid;
  gap: 10px;
}

.quiz-view__question-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
}

.quiz-view__question-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
}

.quiz-view__question-meta {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.quiz-view__answers {
  display: grid;
  gap: 6px;
}

.quiz-view__answer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 1.35;
}

.quiz-view__submit-hint {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.quiz-view__result-title,
.quiz-view__history-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
}

.quiz-view__result-line {
  margin: 0;
}

.quiz-view__history-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.quiz-view__history-item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

@media (max-width: 700px) {
  .quiz-view__quiz-card,
  .quiz-view__result-card,
  .quiz-view__history-card {
    padding: 16px;
  }

  .quiz-view__title {
    font-size: 24px;
  }

  .quiz-view__history-item {
    flex-direction: column;
  }
}
</style>
