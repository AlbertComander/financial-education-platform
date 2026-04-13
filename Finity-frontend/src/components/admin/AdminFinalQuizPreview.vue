<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckSquare, CircleDot, GripVertical, Link2, MessageSquareQuote, Text } from 'lucide-vue-next'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  FinalMatchingPairDraft,
  FinalQuestionDraft,
  FinalSequenceItemDraft,
} from '@/lib/admin-learning-builder'

const props = defineProps<{
  title: string
  summary: string
  estimatedMinutes: number
  difficulty: number
  questions: FinalQuestionDraft[]
}>()

const selectedSingleAnswers = ref<Record<string, string>>({})
const selectedMultipleAnswers = ref<Record<string, string[]>>({})
const openAnswers = ref<Record<string, string>>({})
const sequencePreviewOrders = ref<Record<string, string[]>>({})
const matchingSelections = ref<Record<string, Record<string, string>>>({})
const matchingOptionOrder = ref<Record<string, string[]>>({})

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[randomIndex] as T
    next[randomIndex] = current as T
  }
  return next
}

function initializePreviewState() {
  const nextSingle: Record<string, string> = {}
  const nextMultiple: Record<string, string[]> = {}
  const nextOpen: Record<string, string> = {}
  const nextSequence: Record<string, string[]> = {}
  const nextMatching: Record<string, Record<string, string>> = {}
  const nextMatchingOptions: Record<string, string[]> = {}

  for (const question of props.questions) {
    if (question.qType === 'single') {
      nextSingle[question.draftKey] = ''
      continue
    }

    if (question.qType === 'multiple') {
      nextMultiple[question.draftKey] = []
      continue
    }

    if (question.qType === 'open') {
      nextOpen[question.draftKey] = ''
      continue
    }

    if (question.qType === 'sequence') {
      nextSequence[question.draftKey] = shuffle(question.sequenceItems.map((item) => item.localId))
      continue
    }

    const pairsMap: Record<string, string> = {}
    for (const pair of question.matchingPairs) {
      pairsMap[pair.localId] = ''
    }
    nextMatching[question.draftKey] = pairsMap
    nextMatchingOptions[question.draftKey] = shuffle(question.matchingPairs.map((pair) => pair.localId))
  }

  selectedSingleAnswers.value = nextSingle
  selectedMultipleAnswers.value = nextMultiple
  openAnswers.value = nextOpen
  sequencePreviewOrders.value = nextSequence
  matchingSelections.value = nextMatching
  matchingOptionOrder.value = nextMatchingOptions
}

watch(() => props.questions, initializePreviewState, { deep: true, immediate: true })

function difficultyLabel(value: number) {
  if (value <= 2) return 'Базовый'
  if (value <= 4) return 'Средний'
  return 'Продвинутый'
}

function previewTypeLabel(question: FinalQuestionDraft) {
  if (question.qType === 'single') return 'Один вариант ответа'
  if (question.qType === 'multiple') return 'Несколько вариантов ответа'
  if (question.qType === 'open') return 'Свободный ответ'
  if (question.qType === 'sequence') return 'Расположите элементы по порядку'
  return 'Установите соответствия'
}

function previewTypeIcon(question: FinalQuestionDraft) {
  if (question.qType === 'single') return CircleDot
  if (question.qType === 'multiple') return CheckSquare
  if (question.qType === 'open') return Text
  if (question.qType === 'sequence') return GripVertical
  return Link2
}

function orderedSequenceItems(question: FinalQuestionDraft) {
  const order = sequencePreviewOrders.value[question.draftKey] ?? []
  if (order.length === 0) return question.sequenceItems
  return order
    .map((itemId) => question.sequenceItems.find((item) => item.localId === itemId) ?? null)
    .filter((item): item is FinalSequenceItemDraft => item !== null)
}

function matchingOptions(question: FinalQuestionDraft) {
  const order = matchingOptionOrder.value[question.draftKey] ?? []
  return order
    .map((pairId) => question.matchingPairs.find((pair) => pair.localId === pairId) ?? null)
    .filter((pair): pair is FinalMatchingPairDraft => pair !== null)
}

function isMultipleSelected(questionKey: string, answerId: string) {
  return selectedMultipleAnswers.value[questionKey]?.includes(answerId) ?? false
}

function toggleMultiple(questionKey: string, answerId: string, checked: boolean | 'indeterminate') {
  const current = [...(selectedMultipleAnswers.value[questionKey] ?? [])]
  if (checked === true) {
    if (!current.includes(answerId)) {
      current.push(answerId)
    }
  } else {
    const index = current.indexOf(answerId)
    if (index >= 0) {
      current.splice(index, 1)
    }
  }
  selectedMultipleAnswers.value[questionKey] = current
}

function setMatchingSelection(questionKey: string, pairId: string, value: string) {
  const current = matchingSelections.value[questionKey] ?? {}
  matchingSelections.value[questionKey] = {
    ...current,
    [pairId]: value,
  }
}

const filledQuestionsCount = computed(() => {
  return props.questions.filter((question) => {
    if (question.qType === 'single') {
      return Boolean(selectedSingleAnswers.value[question.draftKey])
    }
    if (question.qType === 'multiple') {
      return (selectedMultipleAnswers.value[question.draftKey] ?? []).length > 0
    }
    if (question.qType === 'open') {
      return (openAnswers.value[question.draftKey] ?? '').trim().length > 0
    }
    if (question.qType === 'sequence') {
      return (sequencePreviewOrders.value[question.draftKey] ?? []).length === question.sequenceItems.length
    }
    const selections = matchingSelections.value[question.draftKey] ?? {}
    return question.matchingPairs.every((pair) => Boolean(selections[pair.localId]))
  }).length
})
</script>

<template>
  <aside class="admin-exam-preview">
    <div class="admin-exam-preview__hero">
      <div class="admin-exam-preview__hero-copy">
        <p class="admin-exam-preview__hero-label">Финальный тест темы</p>
        <h4 class="admin-exam-preview__hero-title">{{ title || 'Новый финальный тест' }}</h4>
        <p class="admin-exam-preview__hero-summary">
          {{ summary || 'Краткое описание экзамена появится здесь после заполнения.' }}
        </p>
      </div>

      <div class="admin-exam-preview__hero-meta">
        <span>{{ estimatedMinutes }} мин</span>
        <span>{{ difficultyLabel(difficulty) }}</span>
        <span>{{ filledQuestionsCount }} / {{ questions.length }} заполнено</span>
      </div>
    </div>

    <div v-if="questions.length === 0" class="admin-exam-preview__empty">
      Добавьте хотя бы один вопрос, чтобы появился предпросмотр экзамена.
    </div>

    <div v-else class="admin-exam-preview__question-list">
      <article
        v-for="(question, index) in questions"
        :key="question.draftKey"
        class="admin-exam-preview__question-card"
      >
        <div class="admin-exam-preview__question-head">
          <div class="admin-exam-preview__question-meta">
            <component :is="previewTypeIcon(question)" class="admin-exam-preview__question-icon" />
            <span>{{ previewTypeLabel(question) }}</span>
          </div>
          <span class="admin-exam-preview__question-number">Вопрос {{ index + 1 }}</span>
        </div>

        <h5 class="admin-exam-preview__question-title">
          {{ question.text || 'Текст вопроса пока не заполнен' }}
        </h5>

        <RadioGroup
          v-if="question.qType === 'single'"
          :model-value="selectedSingleAnswers[question.draftKey] ?? ''"
          class="admin-exam-preview__choice-list"
          @update:model-value="selectedSingleAnswers[question.draftKey] = String($event ?? '')"
        >
          <label
            v-for="answer in question.choiceAnswers"
            :key="answer.localId"
            class="admin-exam-preview__choice-card"
          >
            <RadioGroupItem :value="answer.localId" />
            <span>{{ answer.text || 'Пустой вариант ответа' }}</span>
          </label>
        </RadioGroup>

        <div v-else-if="question.qType === 'multiple'" class="admin-exam-preview__choice-list">
          <label
            v-for="answer in question.choiceAnswers"
            :key="answer.localId"
            class="admin-exam-preview__choice-card"
          >
            <Checkbox
              :model-value="isMultipleSelected(question.draftKey, answer.localId)"
              @update:model-value="toggleMultiple(question.draftKey, answer.localId, $event)"
            />
            <span>{{ answer.text || 'Пустой вариант ответа' }}</span>
          </label>
        </div>

        <div v-else-if="question.qType === 'open'" class="admin-exam-preview__open-answer">
          <Textarea
            :model-value="openAnswers[question.draftKey] ?? ''"
            rows="4"
            placeholder="Пользователь вводит ответ в свободной форме"
            @update:model-value="openAnswers[question.draftKey] = String($event ?? '')"
          />
          <div class="admin-exam-preview__helper">
            <MessageSquareQuote class="admin-exam-preview__helper-icon" />
            <span>Проверка выполняется по эталонным ответам, которые заданы в конструкторе.</span>
          </div>
        </div>

        <div v-else-if="question.qType === 'sequence'" class="admin-exam-preview__sequence-list">
          <div
            v-for="(item, itemIndex) in orderedSequenceItems(question)"
            :key="item.localId"
            class="admin-exam-preview__sequence-item"
          >
            <span class="admin-exam-preview__sequence-number">{{ itemIndex + 1 }}</span>
            <span>{{ item.text || 'Пустой элемент последовательности' }}</span>
            <GripVertical class="admin-exam-preview__sequence-handle" />
          </div>
        </div>

        <div v-else class="admin-exam-preview__matching-list">
          <div
            v-for="pair in question.matchingPairs"
            :key="pair.localId"
            class="admin-exam-preview__matching-row"
          >
            <span class="admin-exam-preview__matching-left">{{ pair.leftText || 'Левая часть пары' }}</span>
            <Select
              :model-value="matchingSelections[question.draftKey]?.[pair.localId] ?? ''"
              @update:model-value="setMatchingSelection(question.draftKey, pair.localId, String($event ?? ''))"
            >
              <SelectTrigger class="admin-exam-preview__matching-select">
                <SelectValue placeholder="Выберите соответствие" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in matchingOptions(question)"
                  :key="option.localId"
                  :value="option.localId"
                >
                  {{ option.rightText || 'Правая часть пары' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </article>
    </div>
  </aside>
</template>

<style scoped>
.admin-exam-preview {
  display: grid;
  gap: 16px;
}

.admin-exam-preview__hero,
.admin-exam-preview__question-card,
.admin-exam-preview__empty {
  padding: 16px;
  border: 1px solid hsl(var(--border));
  border-radius: 18px;
  background: hsl(var(--background));
}

.admin-exam-preview__hero,
.admin-exam-preview__question-list,
.admin-exam-preview__question-card,
.admin-exam-preview__choice-list,
.admin-exam-preview__open-answer,
.admin-exam-preview__sequence-list,
.admin-exam-preview__matching-list {
  display: grid;
  gap: 12px;
}

.admin-exam-preview__hero-label,
.admin-exam-preview__question-meta,
.admin-exam-preview__question-number,
.admin-exam-preview__helper {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.admin-exam-preview__hero-title,
.admin-exam-preview__question-title {
  margin: 0;
}

.admin-exam-preview__hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-exam-preview__hero-meta span,
.admin-exam-preview__question-number {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted) / 0.32);
}

.admin-exam-preview__question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-exam-preview__question-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.admin-exam-preview__question-icon,
.admin-exam-preview__helper-icon,
.admin-exam-preview__sequence-handle {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.admin-exam-preview__choice-card,
.admin-exam-preview__sequence-item,
.admin-exam-preview__matching-row {
  padding: 12px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--muted) / 0.2);
}

.admin-exam-preview__choice-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-exam-preview__sequence-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
}

.admin-exam-preview__sequence-number {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: hsl(214 100% 96%);
  color: hsl(214 48% 42%);
  font-size: 12px;
  font-weight: 700;
}

.admin-exam-preview__matching-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: 12px;
  align-items: center;
}

.admin-exam-preview__matching-left {
  font-size: 14px;
}

.admin-exam-preview__matching-select {
  width: 100%;
}

.admin-exam-preview__helper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 860px) {
  .admin-exam-preview__question-head,
  .admin-exam-preview__matching-row {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
