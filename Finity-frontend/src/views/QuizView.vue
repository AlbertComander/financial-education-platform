<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRoute, useRouter } from 'vue-router'
import { useLearningStore } from '@/stores/learning'
import type {
  FinalQuizAttempt,
  FinalQuizAttemptSubmitAnswer,
  FinalQuizQuestion,
} from '@/types/learning'

type SequenceItem = {
  id: string
  text: string
}

type MatchingItem = {
  id: string
  text: string
}

type MatchingPair = {
  leftId: string
  rightId: string
}

type SequenceConfig = {
  items: SequenceItem[]
  correctOrder: string[]
}

type MatchingConfig = {
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
  correctPairs: MatchingPair[]
}

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const quizId = computed(() => String(route.params.quizId ?? ''))
const topicIdQuery = computed(() => {
  const value = route.query.topicId
  return typeof value === 'string' ? value : ''
})

const selectedChoiceAnswers = ref<Record<string, string[]>>({})
const openTextAnswers = ref<Record<string, string>>({})
const sequenceOrders = ref<Record<string, string[]>>({})
const matchingSelections = ref<Record<string, Record<string, string>>>({})
const sequenceDragState = ref<{
  questionId: string
  fromIndex: number
} | null>(null)

const incompleteQuestionNumbers = computed(() => {
  const quiz = learning.currentFinalQuiz
  if (!quiz) return []
  return quiz.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !isQuestionAnswered(question))
    .map(({ index }) => index + 1)
})

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => toString(item)).filter((item) => item.length > 0)
}

function shuffleArray<T>(items: T[]) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[randomIndex] as T
    next[randomIndex] = current as T
  }
  return next
}

function parseSequenceConfig(question: FinalQuizQuestion): SequenceConfig | null {
  if (question.q_type !== 'sequence') return null
  const config = toObject(question.config_json)

  const itemsRaw = config.items
  const correctOrderRaw = config.correctOrder
  if (!Array.isArray(itemsRaw)) return null

  const items = itemsRaw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const source = item as Record<string, unknown>
      const id = toString(source.id)
      const text = toString(source.text)
      if (!id || !text) return null
      return { id, text }
    })
    .filter((item): item is SequenceItem => item !== null)

  const correctOrder = toStringArray(correctOrderRaw)
  if (items.length < 2 || correctOrder.length !== items.length) {
    return null
  }

  const itemIds = items.map((item) => item.id)
  if (new Set(itemIds).size !== itemIds.length) return null
  if (new Set(correctOrder).size !== correctOrder.length) return null
  if (!itemIds.every((id) => correctOrder.includes(id))) return null
  if (!correctOrder.every((id) => itemIds.includes(id))) return null

  return {
    items,
    correctOrder,
  }
}

function parseMatchingConfig(question: FinalQuizQuestion): MatchingConfig | null {
  if (question.q_type !== 'matching') return null
  const config = toObject(question.config_json)
  const leftRaw = config.leftItems
  const rightRaw = config.rightItems
  const pairsRaw = config.correctPairs
  if (!Array.isArray(leftRaw) || !Array.isArray(rightRaw) || !Array.isArray(pairsRaw)) {
    return null
  }

  const parseItems = (value: unknown[]): MatchingItem[] =>
    value
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null
        const source = item as Record<string, unknown>
        const id = toString(source.id)
        const text = toString(source.text)
        if (!id || !text) return null
        return { id, text }
      })
      .filter((item): item is MatchingItem => item !== null)

  const leftItems = parseItems(leftRaw)
  const rightItems = parseItems(rightRaw)

  const correctPairs = pairsRaw
    .map((pair) => {
      if (!pair || typeof pair !== 'object' || Array.isArray(pair)) return null
      const source = pair as Record<string, unknown>
      const leftId = toString(source.leftId)
      const rightId = toString(source.rightId)
      if (!leftId || !rightId) return null
      return { leftId, rightId }
    })
    .filter((pair): pair is MatchingPair => pair !== null)

  if (leftItems.length < 2 || rightItems.length < 2) return null
  if (new Set(leftItems.map((item) => item.id)).size !== leftItems.length) return null
  if (new Set(rightItems.map((item) => item.id)).size !== rightItems.length) return null
  if (correctPairs.length !== leftItems.length) return null
  if (new Set(correctPairs.map((pair) => pair.leftId)).size !== correctPairs.length) return null
  if (new Set(correctPairs.map((pair) => pair.rightId)).size !== correctPairs.length) return null

  const leftSet = new Set(leftItems.map((item) => item.id))
  const rightSet = new Set(rightItems.map((item) => item.id))
  if (!correctPairs.every((pair) => leftSet.has(pair.leftId))) return null
  if (!correctPairs.every((pair) => rightSet.has(pair.rightId))) return null

  return {
    leftItems,
    rightItems,
    correctPairs,
  }
}

function normalizeSelections() {
  const quiz = learning.currentFinalQuiz
  if (!quiz) return

  const nextChoices: Record<string, string[]> = {}
  const nextOpen: Record<string, string> = {}
  const nextSequence: Record<string, string[]> = {}
  const nextMatching: Record<string, Record<string, string>> = {}

  for (const question of quiz.questions) {
    if (question.q_type === 'single' || question.q_type === 'multiple') {
      nextChoices[question.id] = []
      continue
    }

    if (question.q_type === 'open') {
      nextOpen[question.id] = ''
      continue
    }

    if (question.q_type === 'sequence') {
      const sequenceConfig = parseSequenceConfig(question)
      nextSequence[question.id] = sequenceConfig
        ? shuffleArray(sequenceConfig.items.map((item) => item.id))
        : []
      continue
    }

    const matchingConfig = parseMatchingConfig(question)
    const pairs: Record<string, string> = {}
    for (const leftItem of matchingConfig?.leftItems ?? []) {
      pairs[leftItem.id] = ''
    }
    nextMatching[question.id] = pairs
  }

  selectedChoiceAnswers.value = nextChoices
  openTextAnswers.value = nextOpen
  sequenceOrders.value = nextSequence
  matchingSelections.value = nextMatching
  sequenceDragState.value = null
}

function isChoiceSelected(questionId: string, answerId: string) {
  return selectedChoiceAnswers.value[questionId]?.includes(answerId) ?? false
}

function selectSingle(questionId: string, answerId: string) {
  selectedChoiceAnswers.value[questionId] = [answerId]
}

function setMultipleChecked(
  questionId: string,
  answerId: string,
  checked: boolean | 'indeterminate',
) {
  if (checked === true) {
    const current = selectedChoiceAnswers.value[questionId] ?? []
    if (!current.includes(answerId)) {
      selectedChoiceAnswers.value[questionId] = [...current, answerId]
    }
    return
  }
  selectedChoiceAnswers.value[questionId] = (
    selectedChoiceAnswers.value[questionId] ?? []
  ).filter((id) => id !== answerId)
}

function setOpenAnswer(questionId: string, value: string) {
  openTextAnswers.value[questionId] = value
}

function getSequenceItems(question: FinalQuizQuestion): SequenceItem[] {
  const config = parseSequenceConfig(question)
  if (!config) return []
  const order = sequenceOrders.value[question.id] ?? []
  const itemMap = new Map(config.items.map((item) => [item.id, item]))

  if (order.length !== config.items.length) {
    return [...config.items]
  }

  const ordered = order
    .map((id) => itemMap.get(id))
    .filter((item): item is SequenceItem => item !== undefined)

  if (ordered.length !== config.items.length) {
    return [...config.items]
  }
  return ordered
}

function isSequenceItemDragging(questionId: string, index: number): boolean {
  return (
    sequenceDragState.value?.questionId === questionId &&
    sequenceDragState.value?.fromIndex === index
  )
}

function startSequenceDrag(question: FinalQuizQuestion, index: number, event: DragEvent) {
  sequenceDragState.value = {
    questionId: question.id,
    fromIndex: index,
  }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${question.id}:${index}`)
  }
}

function endSequenceDrag() {
  sequenceDragState.value = null
}

function allowSequenceDrop(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function reorderSequenceWhileDragging(
  question: FinalQuizQuestion,
  toIndex: number,
  event: DragEvent,
) {
  const config = parseSequenceConfig(question)
  if (!config) return

  const order = [...(sequenceOrders.value[question.id] ?? config.items.map((item) => item.id))]
  const dragState = sequenceDragState.value
  if (!dragState || dragState.questionId !== question.id) return
  if (dragState.fromIndex < 0 || dragState.fromIndex >= order.length) return
  if (toIndex < 0 || toIndex >= order.length) return
  if (dragState.fromIndex === toIndex) return

  const target = event.currentTarget as HTMLElement | null
  if (target) {
    const rect = target.getBoundingClientRect()
    const middleY = rect.top + rect.height / 2
    const isMovingDown = dragState.fromIndex < toIndex
    const isMovingUp = dragState.fromIndex > toIndex

    if (isMovingDown && event.clientY < middleY) return
    if (isMovingUp && event.clientY > middleY) return
  }

  const [movedId] = order.splice(dragState.fromIndex, 1)
  if (!movedId) return
  order.splice(toIndex, 0, movedId)
  sequenceOrders.value[question.id] = order
  sequenceDragState.value = {
    questionId: question.id,
    fromIndex: toIndex,
  }
}

function dragOverSequenceItem(question: FinalQuizQuestion, toIndex: number, event: DragEvent) {
  allowSequenceDrop(event)
  reorderSequenceWhileDragging(question, toIndex, event)
}

function dropSequenceItem(event: DragEvent) {
  event.preventDefault()
  sequenceDragState.value = null
}

function getMatchingConfig(question: FinalQuizQuestion): MatchingConfig | null {
  return parseMatchingConfig(question)
}

function getMatchingValue(questionId: string, leftId: string): string {
  return matchingSelections.value[questionId]?.[leftId] ?? ''
}

function setMatchingPair(questionId: string, leftId: string, rightId: string) {
  const current = matchingSelections.value[questionId] ?? {}
  matchingSelections.value[questionId] = {
    ...current,
    [leftId]: rightId,
  }
}

function isQuestionAnswered(question: FinalQuizQuestion): boolean {
  if (question.q_type === 'single' || question.q_type === 'multiple') {
    return (selectedChoiceAnswers.value[question.id]?.length ?? 0) > 0
  }

  if (question.q_type === 'open') {
    return (openTextAnswers.value[question.id] ?? '').trim().length > 0
  }

  if (question.q_type === 'sequence') {
    const config = parseSequenceConfig(question)
    if (!config) return false
    const order = sequenceOrders.value[question.id] ?? []
    return (
      order.length === config.items.length &&
      new Set(order).size === order.length &&
      order.every((id) => config.items.some((item) => item.id === id))
    )
  }

  const config = parseMatchingConfig(question)
  if (!config) return false
  const selectedByLeft = matchingSelections.value[question.id] ?? {}
  const rightValues = config.leftItems.map((item) => selectedByLeft[item.id] ?? '')

  return rightValues.every((value) => value.length > 0)
}

function questionTypeLabel(question: FinalQuizQuestion) {
  if (question.q_type === 'single') return 'один ответ'
  if (question.q_type === 'multiple') return 'несколько ответов'
  if (question.q_type === 'open') return 'открытый ответ'
  if (question.q_type === 'sequence') return 'на последовательность'
  return 'на соответствие'
}

function buildSubmitPayload(): FinalQuizAttemptSubmitAnswer[] {
  const quiz = learning.currentFinalQuiz
  if (!quiz) return []

  return quiz.questions.map((question) => {
    if (question.q_type === 'single' || question.q_type === 'multiple') {
      return {
        questionId: question.id,
        selectedAnswerIds: selectedChoiceAnswers.value[question.id] ?? [],
      }
    }

    if (question.q_type === 'open') {
      return {
        questionId: question.id,
        textAnswer: openTextAnswers.value[question.id] ?? '',
      }
    }

    if (question.q_type === 'sequence') {
      return {
        questionId: question.id,
        orderedItemIds: sequenceOrders.value[question.id] ?? [],
      }
    }

    const map = matchingSelections.value[question.id] ?? {}
    const matchingPairs = Object.entries(map)
      .filter(([, rightId]) => rightId.length > 0)
      .map(([leftId, rightId]) => ({ leftId, rightId }))

    return {
      questionId: question.id,
      matchingPairs,
    }
  })
}

function attemptDisplayNumber(index: number) {
  return learning.myFinalQuizAttempts.length - index
}

function attemptCorrectSummary(attempt: FinalQuizAttempt): string {
  const total = attempt.user_answers.length
  if (total === 0) return '- / -'
  const correct = attempt.user_answers.filter((answer) => answer.is_correct === true).length
  return `${correct} / ${total}`
}

async function loadFinalQuiz() {
  if (!quizId.value) return
  try {
    await learning.loadFinalQuiz(quizId.value)
    normalizeSelections()
    learning.resetTransient()
  } catch {}
}

async function submitFinalQuiz() {
  if (!learning.currentFinalQuiz) return
  try {
    await learning.submitFinalQuizAttempt(learning.currentFinalQuiz.id, buildSubmitPayload())
  } catch {}
}

function backToLesson() {
  if (!learning.currentFinalQuiz) return
  const query = topicIdQuery.value ? { topicId: topicIdQuery.value } : {}
  void router.push({
    name: 'lesson',
    params: { lessonId: learning.currentFinalQuiz.lesson_id },
    query,
  })
}

watch(quizId, () => {
  void loadFinalQuiz()
})

watch(
  () => learning.currentFinalQuiz?.id,
  () => {
    normalizeSelections()
  },
)

onMounted(async () => {
  await loadFinalQuiz()
})
</script>

<template>
  <section class="quiz-view">
    <header class="quiz-view__header">
      <Button
        v-if="learning.currentFinalQuiz"
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

    <template v-else-if="learning.currentFinalQuiz">
      <Card class="quiz-view__quiz-card">
        <h1 class="quiz-view__title">{{ learning.currentFinalQuiz.title }}</h1>
        <p v-if="learning.currentFinalQuiz.description" class="quiz-view__description">
          {{ learning.currentFinalQuiz.description }}
        </p>

        <div class="quiz-view__questions">
          <Card
            v-for="(question, questionIndex) in learning.currentFinalQuiz.questions"
            :key="question.id"
            class="quiz-view__question-card"
          >
            <h2 class="quiz-view__question-title">
              {{ questionIndex + 1 }}. {{ question.text }}
            </h2>
            <p class="quiz-view__question-meta">
              Тип: {{ questionTypeLabel(question) }}
            </p>

            <div v-if="question.q_type === 'single'" class="quiz-view__answers">
              <RadioGroup
                :model-value="selectedChoiceAnswers[question.id]?.[0] ?? ''"
                class="quiz-view__radio-group"
                @update:model-value="(value) => selectSingle(question.id, String(value ?? ''))"
              >
                <div
                  v-for="answer in question.answers"
                  :key="answer.id"
                  class="quiz-view__answer"
                >
                  <RadioGroupItem
                    :id="`quiz-${question.id}-${answer.id}`"
                    :value="answer.id"
                  />
                  <Label
                    :for="`quiz-${question.id}-${answer.id}`"
                    class="quiz-view__choice-label"
                  >
                    {{ answer.text }}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div v-else-if="question.q_type === 'multiple'" class="quiz-view__answers">
              <div
                v-for="answer in question.answers"
                :key="answer.id"
                class="quiz-view__answer"
              >
                <Checkbox
                  :id="`quiz-${question.id}-${answer.id}`"
                  :model-value="isChoiceSelected(question.id, answer.id)"
                  @update:model-value="setMultipleChecked(question.id, answer.id, $event)"
                />
                <Label
                  :for="`quiz-${question.id}-${answer.id}`"
                  class="quiz-view__choice-label"
                >
                  {{ answer.text }}
                </Label>
              </div>
            </div>

            <div v-else-if="question.q_type === 'open'" class="quiz-view__open-answer">
              <Textarea
                class="quiz-view__textarea"
                :model-value="openTextAnswers[question.id] ?? ''"
                rows="4"
                placeholder="Введите ответ в свободной форме"
                @update:model-value="setOpenAnswer(question.id, String($event ?? ''))"
              />
            </div>

            <div v-else-if="question.q_type === 'sequence'" class="quiz-view__sequence">
              <p class="quiz-view__sequence-hint">
                Перетаскивайте пункты мышкой, чтобы выставить порядок.
              </p>
              <p v-if="getSequenceItems(question).length === 0" class="quiz-view__invalid-config">
                Вопрос настроен некорректно. Обратитесь к администратору.
              </p>
              <TransitionGroup
                v-else
                tag="div"
                name="quiz-view__sequence"
                class="quiz-view__sequence-list"
              >
                <div
                  v-for="(item, index) in getSequenceItems(question)"
                  :key="item.id"
                  class="quiz-view__sequence-item"
                  :class="{
                    'quiz-view__sequence-item--dragging': isSequenceItemDragging(question.id, index),
                  }"
                  draggable="true"
                  @dragstart="startSequenceDrag(question, index, $event)"
                  @dragend="endSequenceDrag"
                  @dragover="dragOverSequenceItem(question, index, $event)"
                  @dragenter.prevent
                  @drop="dropSequenceItem($event)"
                >
                  <span class="quiz-view__sequence-number">{{ index + 1 }}</span>
                  <span class="quiz-view__sequence-text">{{ item.text }}</span>
                  <span class="quiz-view__sequence-drag-handle">::</span>
                </div>
              </TransitionGroup>
            </div>

            <div v-else class="quiz-view__matching">
              <p v-if="!getMatchingConfig(question)" class="quiz-view__invalid-config">
                Вопрос настроен некорректно. Обратитесь к администратору.
              </p>
              <div v-else class="quiz-view__matching-list">
                <div
                  v-for="left in getMatchingConfig(question)?.leftItems ?? []"
                  :key="left.id"
                  class="quiz-view__matching-row"
                >
                  <span class="quiz-view__matching-left">{{ left.text }}</span>
                  <Select
                    :model-value="getMatchingValue(question.id, left.id)"
                    @update:model-value="(value) => setMatchingPair(question.id, left.id, String(value ?? ''))"
                  >
                    <SelectTrigger class="quiz-view__matching-select">
                      <SelectValue placeholder="Выберите вариант" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="right in getMatchingConfig(question)?.rightItems ?? []"
                        :key="right.id"
                        :value="right.id"
                      >
                        {{ right.text }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <p v-if="incompleteQuestionNumbers.length > 0" class="quiz-view__submit-hint">
          Не все вопросы заполнены. Их всё равно можно отправить, но пустые ответы будут
          засчитаны как неверные.
        </p>

        <Button :disabled="learning.isSubmitting" @click="submitFinalQuiz">
          {{ learning.isSubmitting ? 'Отправка...' : 'Отправить ответы' }}
        </Button>
      </Card>

      <Card v-if="learning.latestFinalQuizAttempt" class="quiz-view__result-card">
        <h2 class="quiz-view__result-title">Результат попытки</h2>
        <p class="quiz-view__result-line">
          Балл: {{ learning.latestFinalQuizAttempt.score }} / {{ learning.latestFinalQuizAttempt.maxScore }}
        </p>
        <p class="quiz-view__result-line">
          Процент: {{ learning.latestFinalQuizAttempt.percent }}%
        </p>
      </Card>

      <Card class="quiz-view__history-card">
        <h2 class="quiz-view__history-title">Мои попытки</h2>
        <p v-if="learning.myFinalQuizAttempts.length === 0" class="quiz-view__state">
          Попыток пока нет.
        </p>
        <ul v-else class="quiz-view__history-list">
          <li
            v-for="(attempt, index) in learning.myFinalQuizAttempts"
            :key="attempt.id"
            class="quiz-view__history-item"
          >
            <span>Попытка №{{ attemptDisplayNumber(index) }}</span>
            <span>{{ attemptCorrectSummary(attempt) }}</span>
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
  gap: 10px;
  padding: 14px;
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
  width: 100%;
  text-align: left;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 8px 10px;
  background: hsl(var(--background));
  font-size: 14px;
  line-height: 1.35;
}

.quiz-view__radio-group {
  display: grid;
  gap: 6px;
}

.quiz-view__choice-label {
  cursor: pointer;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 400;
}

.quiz-view__open-answer {
  display: grid;
}

.quiz-view__textarea {
  min-height: 88px;
  line-height: 1.4;
}

.quiz-view__sequence-list {
  display: grid;
  gap: 8px;
}

.quiz-view__sequence-move {
  transition: transform 0.18s ease;
}

.quiz-view__sequence-hint {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.quiz-view__sequence-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  cursor: grab;
}

.quiz-view__sequence-item:active {
  cursor: grabbing;
}

.quiz-view__sequence-item--dragging {
  opacity: 0.5;
  border-color: hsl(var(--ring));
  background: hsl(var(--muted));
}

.quiz-view__sequence-number {
  min-width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: hsl(var(--muted));
  font-size: 12px;
}

.quiz-view__sequence-text {
  font-size: 14px;
}

.quiz-view__sequence-drag-handle {
  font-size: 18px;
  color: hsl(var(--muted-foreground));
  line-height: 1;
  user-select: none;
}

.quiz-view__matching-list {
  display: grid;
  gap: 8px;
}

.quiz-view__matching-row {
  display: grid;
  grid-template-columns: 1fr minmax(200px, 280px);
  gap: 10px;
  align-items: center;
}

.quiz-view__matching-left {
  font-size: 14px;
  line-height: 1.35;
}

.quiz-view__matching-select {
  height: 36px;
}

.quiz-view__invalid-config {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--destructive));
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

  .quiz-view__matching-row {
    grid-template-columns: 1fr;
  }
}
</style>
