<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { QuickQuestionDraft } from '@/lib/admin-learning-builder'

const props = defineProps<{
  draft: QuickQuestionDraft
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'delete'): void
}>()

function addAnswer() {
  props.draft.answers.push({
    localId: crypto.randomUUID(),
    text: '',
    isCorrect: false,
    feedbackText: '',
  })
}

function removeAnswer(index: number) {
  if (props.draft.answers.length <= 2) return
  props.draft.answers.splice(index, 1)
  if (!props.draft.answers.some((answer) => answer.isCorrect)) {
    const firstAnswer = props.draft.answers[0]
    if (firstAnswer) {
      firstAnswer.isCorrect = true
    }
  }
}

function setCorrect(localId: string) {
  props.draft.answers.forEach((answer) => {
    answer.isCorrect = answer.localId === localId
  })
}
</script>

<template>
  <article class="admin-quick-question-editor">
    <div class="admin-quick-question-editor__field">
      <Label>Текст вопроса</Label>
      <Textarea v-model="props.draft.text" rows="3" />
    </div>

    <RadioGroup
      :model-value="props.draft.answers.find((answer) => answer.isCorrect)?.localId ?? ''"
      class="admin-quick-question-editor__answers"
      @update:model-value="setCorrect(String($event ?? ''))"
    >
      <div
        v-for="(answer, answerIndex) in props.draft.answers"
        :key="answer.localId"
        class="admin-quick-question-editor__answer"
      >
        <div class="admin-quick-question-editor__answer-head">
          <div class="admin-quick-question-editor__flag">
            <RadioGroupItem
              :id="`quick-${props.draft.draftKey}-${answer.localId}`"
              :value="answer.localId"
            />
            <Label :for="`quick-${props.draft.draftKey}-${answer.localId}`">
              Правильный ответ
            </Label>
          </div>

          <Button
            variant="ghost"
            size="sm"
            :disabled="props.draft.answers.length <= 2"
            @click="removeAnswer(answerIndex)"
          >
            Удалить вариант
          </Button>
        </div>

        <div class="admin-quick-question-editor__field">
          <Label>Текст ответа</Label>
          <Input v-model="answer.text" />
        </div>

        <div class="admin-quick-question-editor__field">
          <Label>Подсказка после ответа</Label>
          <Textarea v-model="answer.feedbackText" rows="2" />
        </div>
      </div>
    </RadioGroup>

    <div class="admin-quick-question-editor__actions">
      <Button variant="outline" size="sm" @click="addAnswer">
        Добавить вариант
      </Button>
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
.admin-quick-question-editor {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  background: hsl(var(--background));
}

.admin-quick-question-editor__field {
  display: grid;
  gap: 8px;
}

.admin-quick-question-editor__answers {
  display: grid;
  gap: 12px;
}

.admin-quick-question-editor__answer {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--muted) / 0.28);
}

.admin-quick-question-editor__answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.admin-quick-question-editor__flag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.admin-quick-question-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 900px) {
  .admin-quick-question-editor__answer-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
