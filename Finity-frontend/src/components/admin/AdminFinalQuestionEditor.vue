<script setup lang="ts">
import { ref } from 'vue'
import { GripVertical, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import type { FinalQuestionDraft } from '@/lib/admin-learning-builder'

const props = defineProps<{
  draft: FinalQuestionDraft
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'delete'): void
}>()

const draggedSequenceItemId = ref('')
const sequenceDropTargetId = ref('')

function setType(nextType: FinalQuestionDraft['qType']) {
  if (props.draft.qType === nextType) return

  props.draft.qType = nextType

  if (nextType === 'single' || nextType === 'multiple') {
    props.draft.choiceAnswers = [
      { localId: crypto.randomUUID(), text: '', isCorrect: true },
      { localId: crypto.randomUUID(), text: '', isCorrect: false },
    ]
    return
  }

  if (nextType === 'open') {
    props.draft.openAcceptedAnswersText = ''
    props.draft.openCaseSensitive = false
    props.draft.openTrim = true
    props.draft.openCollapseSpaces = true
    return
  }

  if (nextType === 'sequence') {
    props.draft.sequenceItems = [
      { localId: crypto.randomUUID(), text: '' },
      { localId: crypto.randomUUID(), text: '' },
    ]
    return
  }

  props.draft.matchingPairs = [
    { localId: crypto.randomUUID(), leftText: '', rightText: '' },
    { localId: crypto.randomUUID(), leftText: '', rightText: '' },
  ]
}

function addChoiceAnswer() {
  props.draft.choiceAnswers.push({
    localId: crypto.randomUUID(),
    text: '',
    isCorrect: false,
  })
}

function removeChoiceAnswer(index: number) {
  if (props.draft.choiceAnswers.length <= 2) return
  props.draft.choiceAnswers.splice(index, 1)
  if (
    props.draft.qType === 'single' &&
    !props.draft.choiceAnswers.some((answer) => answer.isCorrect)
  ) {
    const firstAnswer = props.draft.choiceAnswers[0]
    if (firstAnswer) {
      firstAnswer.isCorrect = true
    }
  }
}

function setSingleCorrect(localId: string) {
  props.draft.choiceAnswers.forEach((answer) => {
    answer.isCorrect = answer.localId === localId
  })
}

function toggleMultipleCorrect(localId: string, checked: boolean | 'indeterminate') {
  const answer = props.draft.choiceAnswers.find((item) => item.localId === localId)
  if (!answer) return
  answer.isCorrect = checked === true
}

function addSequenceItem() {
  props.draft.sequenceItems.push({
    localId: crypto.randomUUID(),
    text: '',
  })
}

function startSequenceDrag(itemId: string) {
  draggedSequenceItemId.value = itemId
}

function handleSequenceDragOver(targetItemId: string, event: DragEvent) {
  const draggedItemId = draggedSequenceItemId.value
  if (!draggedItemId || draggedItemId === targetItemId) {
    return
  }

  const currentIndex = props.draft.sequenceItems.findIndex((item) => item.localId === draggedItemId)
  const targetIndex = props.draft.sequenceItems.findIndex((item) => item.localId === targetItemId)

  if (currentIndex === -1 || targetIndex === -1) {
    return
  }

  const row = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!row) {
    return
  }

  const rowRect = row.getBoundingClientRect()
  const shouldInsertAfter = event.clientY > rowRect.top + rowRect.height / 2

  if (currentIndex < targetIndex && !shouldInsertAfter) {
    return
  }

  if (currentIndex > targetIndex && shouldInsertAfter) {
    return
  }

  let nextIndex = shouldInsertAfter ? targetIndex + 1 : targetIndex
  if (currentIndex < nextIndex) {
    nextIndex -= 1
  }

  if (nextIndex === currentIndex) {
    return
  }

  const [item] = props.draft.sequenceItems.splice(currentIndex, 1)
  if (!item) {
    return
  }

  props.draft.sequenceItems.splice(nextIndex, 0, item)
  sequenceDropTargetId.value = targetItemId
}

function dropSequenceItem(targetItemId: string) {
  if (draggedSequenceItemId.value && draggedSequenceItemId.value !== targetItemId) {
    sequenceDropTargetId.value = targetItemId
  }
  finishSequenceDrag()
}

function finishSequenceDrag() {
  draggedSequenceItemId.value = ''
  sequenceDropTargetId.value = ''
}

function removeSequenceItem(index: number) {
  if (props.draft.sequenceItems.length <= 2) return
  props.draft.sequenceItems.splice(index, 1)
}

function addMatchingPair() {
  props.draft.matchingPairs.push({
    localId: crypto.randomUUID(),
    leftText: '',
    rightText: '',
  })
}

function removeMatchingPair(index: number) {
  if (props.draft.matchingPairs.length <= 2) return
  props.draft.matchingPairs.splice(index, 1)
}
</script>

<template>
  <article class="admin-final-question-editor">
    <div class="admin-final-question-editor__top">
      <div class="admin-final-question-editor__field">
        <Label>Текст вопроса</Label>
        <Textarea v-model="props.draft.text" rows="3" />
      </div>

      <div class="admin-final-question-editor__field admin-final-question-editor__field--narrow">
        <Label>Тип вопроса</Label>
        <Select
          :model-value="props.draft.qType"
          @update:model-value="setType(String($event ?? 'single') as FinalQuestionDraft['qType'])"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Один ответ</SelectItem>
            <SelectItem value="multiple">Несколько ответов</SelectItem>
            <SelectItem value="open">Открытый ответ</SelectItem>
            <SelectItem value="sequence">Последовательность</SelectItem>
            <SelectItem value="matching">Соответствие</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div
      v-if="props.draft.qType === 'single' || props.draft.qType === 'multiple'"
      class="admin-final-question-editor__body"
    >
      <RadioGroup
        v-if="props.draft.qType === 'single'"
        :model-value="props.draft.choiceAnswers.find((answer) => answer.isCorrect)?.localId ?? ''"
        class="admin-final-question-editor__list"
        @update:model-value="setSingleCorrect(String($event ?? ''))"
      >
        <div
          v-for="(answer, answerIndex) in props.draft.choiceAnswers"
          :key="answer.localId"
          class="admin-final-question-editor__choice"
        >
          <div class="admin-final-question-editor__choice-head">
            <div class="admin-final-question-editor__flag">
              <RadioGroupItem
                :id="`final-${props.draft.draftKey}-${answer.localId}`"
                :value="answer.localId"
              />
              <Label :for="`final-${props.draft.draftKey}-${answer.localId}`">
                Правильный ответ
              </Label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              :disabled="props.draft.choiceAnswers.length <= 2"
              @click="removeChoiceAnswer(answerIndex)"
            >
              Удалить вариант
            </Button>
          </div>

          <div class="admin-final-question-editor__field">
            <Label>Текст ответа</Label>
            <Input v-model="answer.text" />
          </div>
        </div>
      </RadioGroup>

      <div v-else class="admin-final-question-editor__list">
        <div
          v-for="(answer, answerIndex) in props.draft.choiceAnswers"
          :key="answer.localId"
          class="admin-final-question-editor__choice"
        >
          <div class="admin-final-question-editor__choice-head">
            <div class="admin-final-question-editor__flag">
              <Checkbox
                :id="`final-${props.draft.draftKey}-${answer.localId}`"
                :model-value="answer.isCorrect"
                @update:model-value="toggleMultipleCorrect(answer.localId, $event)"
              />
              <Label :for="`final-${props.draft.draftKey}-${answer.localId}`">
                Верный вариант
              </Label>
            </div>

            <Button
              variant="ghost"
              size="sm"
              :disabled="props.draft.choiceAnswers.length <= 2"
              @click="removeChoiceAnswer(answerIndex)"
            >
              Удалить вариант
            </Button>
          </div>

          <div class="admin-final-question-editor__field">
            <Label>Текст ответа</Label>
            <Input v-model="answer.text" />
          </div>
        </div>
      </div>

      <Button variant="outline" size="sm" @click="addChoiceAnswer">
        Добавить вариант
      </Button>
    </div>

    <div v-else-if="props.draft.qType === 'open'" class="admin-final-question-editor__body">
      <div class="admin-final-question-editor__field">
        <Label>Эталонные ответы, по одному на строку</Label>
        <Textarea v-model="props.draft.openAcceptedAnswersText" rows="5" />
      </div>

      <div class="admin-final-question-editor__boolean-list">
        <label class="admin-final-question-editor__flag">
          <Checkbox
            :model-value="props.draft.openCaseSensitive"
            @update:model-value="props.draft.openCaseSensitive = $event === true"
          />
          <span>Учитывать регистр</span>
        </label>

        <label class="admin-final-question-editor__flag">
          <Checkbox
            :model-value="props.draft.openTrim"
            @update:model-value="props.draft.openTrim = $event === true"
          />
          <span>Обрезать пробелы</span>
        </label>

        <label class="admin-final-question-editor__flag">
          <Checkbox
            :model-value="props.draft.openCollapseSpaces"
            @update:model-value="props.draft.openCollapseSpaces = $event === true"
          />
          <span>Схлопывать лишние пробелы</span>
        </label>
      </div>
    </div>

    <div v-else-if="props.draft.qType === 'sequence'" class="admin-final-question-editor__body">
      <div class="admin-final-question-editor__sequence-note">
        Расположите элементы в правильном порядке. Именно этот порядок будет считаться верным, а в самом тесте элементы перемешаются автоматически.
      </div>

      <TransitionGroup
        name="admin-final-question-editor__sequence"
        tag="div"
        class="admin-final-question-editor__sequence-list"
      >
        <div
          v-for="(item, itemIndex) in props.draft.sequenceItems"
          :key="item.localId"
          class="admin-final-question-editor__sequence-row"
          :class="{
            'admin-final-question-editor__sequence-row--drop-target': sequenceDropTargetId === item.localId,
            'admin-final-question-editor__sequence-row--dragging': draggedSequenceItemId === item.localId,
          }"
          @dragover.prevent="handleSequenceDragOver(item.localId, $event)"
          @drop.prevent="dropSequenceItem(item.localId)"
        >
          <span class="admin-final-question-editor__index">{{ itemIndex + 1 }}</span>
          <Input v-model="item.text" />
          <button
            type="button"
            class="admin-final-question-editor__drag-handle"
            draggable="true"
            @dragstart="startSequenceDrag(item.localId)"
            @dragend="finishSequenceDrag"
          >
            <GripVertical />
          </button>
          <Button
            variant="ghost"
            size="icon"
            class="admin-final-question-editor__delete-button"
            :disabled="props.draft.sequenceItems.length <= 2"
            @click="removeSequenceItem(itemIndex)"
          >
            <Trash2 />
            <span class="sr-only">Удалить элемент</span>
          </Button>
        </div>
      </TransitionGroup>

      <Button variant="outline" size="sm" @click="addSequenceItem">
        Добавить элемент
      </Button>
    </div>

    <div v-else class="admin-final-question-editor__body">
      <div class="admin-final-question-editor__matching-note">
        Каждая строка задаёт одну правильную пару. Левая и правая части автоматически будут связаны между собой как эталон.
      </div>

      <div class="admin-final-question-editor__matching-list">
        <div
          v-for="(pair, pairIndex) in props.draft.matchingPairs"
          :key="pair.localId"
          class="admin-final-question-editor__matching-row"
        >
          <div class="admin-final-question-editor__field">
            <Label>Левая часть</Label>
            <Input v-model="pair.leftText" />
          </div>
          <div class="admin-final-question-editor__field">
            <Label>Правая часть</Label>
            <Input v-model="pair.rightText" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            :disabled="props.draft.matchingPairs.length <= 2"
            @click="removeMatchingPair(pairIndex)"
          >
            Удалить
          </Button>
        </div>
      </div>

      <Button variant="outline" size="sm" @click="addMatchingPair">
        Добавить пару
      </Button>
    </div>

    <div class="admin-final-question-editor__actions">
      <Button variant="outline" size="sm" :disabled="props.disabled" @click="emit('save')">
        Сохранить вопрос
      </Button>
      <Button variant="destructive" size="sm" :disabled="props.disabled" @click="emit('delete')">
        Удалить вопрос
      </Button>
    </div>
  </article>
</template>

<style scoped>
.admin-final-question-editor {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--background));
}

.admin-final-question-editor__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 14px;
}

.admin-final-question-editor__field {
  display: grid;
  gap: 8px;
}

.admin-final-question-editor__field--narrow {
  align-content: start;
}

.admin-final-question-editor__body,
.admin-final-question-editor__list,
.admin-final-question-editor__sequence-list,
.admin-final-question-editor__matching-list {
  display: grid;
  gap: 12px;
}

.admin-final-question-editor__choice,
.admin-final-question-editor__sequence-note,
.admin-final-question-editor__matching-note {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--muted) / 0.28);
}

.admin-final-question-editor__choice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-final-question-editor__flag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.admin-final-question-editor__boolean-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.admin-final-question-editor__sequence-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px 34px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.admin-final-question-editor__sequence-row--drop-target {
  border-color: hsl(214 68% 74%);
  background: hsl(214 100% 98%);
  box-shadow: inset 0 0 0 1px hsl(214 68% 84%);
}

.admin-final-question-editor__sequence-row--dragging {
  opacity: 0.72;
}

.admin-final-question-editor__drag-handle {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: grab;
}

.admin-final-question-editor__drag-handle:hover {
  background: hsl(var(--accent));
}

.admin-final-question-editor__drag-handle:active {
  cursor: grabbing;
}

.admin-final-question-editor__drag-handle :deep(svg) {
  width: 16px;
  height: 16px;
}

.admin-final-question-editor__index {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: hsl(214 92% 97%);
  color: hsl(214 55% 40%);
  font-size: 13px;
  font-weight: 700;
}

.admin-final-question-editor__delete-button {
  width: 32px;
  height: 32px;
  padding: 0;
}

.admin-final-question-editor__delete-button :deep(svg) {
  width: 16px;
  height: 16px;
}


.admin-final-question-editor__matching-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.admin-final-question-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.admin-final-question-editor__sequence-move {
  transition: transform 0.2s ease;
}

@media (max-width: 900px) {
  .admin-final-question-editor__top,
  .admin-final-question-editor__matching-row {
    grid-template-columns: 1fr;
  }

  .admin-final-question-editor__choice-head {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-final-question-editor__sequence-row {
    grid-template-columns: 32px minmax(0, 1fr) 32px 32px;
  }
}
</style>
