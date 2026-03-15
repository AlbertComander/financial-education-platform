<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Clock3, FileText, ListChecks } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLearningStore } from '@/stores/learning'
import { isFinalExamLesson, isFinalExamUnlocked } from '@/lib/learning-lessons'
import type { AttemptSubmitAnswer, LessonBlock, Quiz } from '@/types/learning'
import iconCheckCircle from '@/assets/icons/lessons/check-circle.svg'

const route = useRoute()
const router = useRouter()
const learning = useLearningStore()

const lessonId = computed(() => String(route.params.lessonId ?? ''))
const topicIdQuery = computed(() => {
  const value = route.query.topicId
  return typeof value === 'string' ? value : ''
})

const articleRef = ref<HTMLElement | null>(null)
const finalQuizCardRef = ref<HTMLElement | null>(null)
const readPercent = ref(0)
const syncStepPercent = 5
let rafId = 0
let lastSyncedPercent = 0
const finalExamLocked = ref(false)
const finalQuizLoading = ref(false)
const finalQuizSubmitting = ref(false)
const finalQuizError = ref('')
const finalQuiz = ref<Quiz | null>(null)
const finalQuizSelectedAnswers = ref<Record<string, string[]>>({})

const quickCheckLoading = ref(false)
const quickCheckSubmitting = ref(false)
const quickCheckError = ref('')
const quickCheckQuestions = ref<
  Array<{
    id: string
    text: string
    order_index: number
    answers: Array<{ id: string; text: string }>
  }>
>([])
const quickCheckCurrentIndex = ref(0)
const quickCheckStates = ref<
  Record<
    string,
    {
      selectedAnswerId: string
      isCorrect: boolean
      correctAnswerId: string | null
      feedback: string
    }
  >
>({})

type ArticleSection = {
  id: string
  title: string
  text: string
  points: string[]
  kind: string
}

type SectionBlock =
  | {
      id: string
      type: 'paragraph'
      text: string
    }
  | {
      id: string
      type: 'unordered_list' | 'ordered_list'
      items: string[]
    }

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  return ''
}

function normalizePoints(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

function blockToSection(block: LessonBlock, index: number): ArticleSection {
  const fallbackTitle = `Раздел ${index + 1}`

  if (typeof block.block_content === 'string') {
    return {
      id: block.id,
      title: fallbackTitle,
      text: block.block_content,
      points: [],
      kind: block.block_type,
    }
  }

  if (!block.block_content || typeof block.block_content !== 'object') {
    return {
      id: block.id,
      title: fallbackTitle,
      text: '',
      points: [],
      kind: block.block_type,
    }
  }

  const payload = block.block_content as Record<string, unknown>
  const title = normalizeText(payload.title) || fallbackTitle
  const text = [normalizeText(payload.body), normalizeText(payload.text)]
    .filter((part) => part.length > 0)
    .join('\n\n')
  const points =
    normalizePoints(payload.items).length > 0
      ? normalizePoints(payload.items)
      : normalizePoints(payload.list)

  return {
    id: block.id,
    title,
    text,
    points,
    kind: block.block_type,
  }
}

function parseSectionTextToBlocks(section: ArticleSection): SectionBlock[] {
  const lines = section.text.split('\n')
  const blocks: SectionBlock[] = []

  let paragraphBuffer: string[] = []
  let listType: 'unordered_list' | 'ordered_list' | null = null
  let listItems: string[] = []
  let blockIndex = 0

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(' ').replace(/\s+/g, ' ').trim()
    if (text.length > 0) {
      blocks.push({
        id: `${section.id}-p-${blockIndex}`,
        type: 'paragraph',
        text,
      })
      blockIndex += 1
    }
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    blocks.push({
      id: `${section.id}-l-${blockIndex}`,
      type: listType,
      items: [...listItems],
    })
    blockIndex += 1
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType !== 'unordered_list') {
        flushList()
        listType = 'unordered_list'
      }
      const item = unorderedMatch[1]?.trim()
      if (item) listItems.push(item)
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== 'ordered_list') {
        flushList()
        listType = 'ordered_list'
      }
      const item = orderedMatch[1]?.trim()
      if (item) listItems.push(item)
      continue
    }

    flushList()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()

  if (section.points.length > 0) {
    blocks.push({
      id: `${section.id}-points`,
      type: 'unordered_list',
      items: section.points,
    })
  }

  return blocks
}

function sectionBlocks(section: ArticleSection): SectionBlock[] {
  return parseSectionTextToBlocks(section)
}

const articleSections = computed<ArticleSection[]>(() => {
  const lesson = learning.currentLesson
  if (!lesson) return []

  if (lesson.lesson_blocks.length > 0) {
    return lesson.lesson_blocks
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((block, index) => blockToSection(block, index))
      .filter((section) => section.text.length > 0 || section.points.length > 0)
  }

  const parts = lesson.content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  return parts.map((text, index) => ({
    id: `${lesson.id}-${index}`,
    title: index === 0 ? 'Основной материал' : `Раздел ${index + 1}`,
    text,
    points: [],
    kind: 'text',
  }))
})

const lessonOverview = computed(() => {
  const lesson = learning.currentLesson
  if (!lesson) return []

  const values = [
    lesson.summary ?? '',
    ...articleSections.value.slice(0, 3).map((section) => section.title),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (values.length > 0) return values.slice(0, 4)

  return [
    'Ключевые принципы по теме урока',
    'Структурированный разбор практических действий',
    'Что проверяется в итоговом тесте',
  ]
})

const lessonSkills = computed(() => {
  const values = articleSections.value
    .filter((section) => section.kind.toLowerCase().includes('tip') || section.points.length > 0)
    .flatMap((section) => {
      if (section.points.length > 0) return section.points
      return section.text
        .split(/[.!?]\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    })

  if (values.length > 0) return values.slice(0, 4)

  return [
    'Применять материал урока на личных финансовых примерах',
    'Избегать типичных ошибок по теме',
    'Подготовиться к прохождению теста без подсказок',
  ]
})

const currentLessonProgress = computed(() => {
  for (const topic of learning.topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId.value)
    if (lesson) return lesson.user_progress
  }
  return null
})

const displayReadPercent = computed(() => {
  const savedPercent = currentLessonProgress.value?.progress_percent ?? 0
  const combined = Math.round(Math.max(readPercent.value, savedPercent))
  if (hasUnsolvedQuiz.value) return Math.min(combined, 90)
  return combined
})

const readingBannerHint = computed(() => {
  if (!hasUnsolvedQuiz.value) return ''
  return 'Оставшиеся 10% начисляются после мини-теста'
})

const progressFillStyle = computed(() => {
  return { width: `${displayReadPercent.value}%` }
})

const hasFinalQuiz = computed(() => learning.currentLessonQuizzes.length > 0)
const firstQuizId = computed(() => learning.currentLessonQuizzes[0]?.id ?? '')

const currentTopic = computed(() => {
  for (const topic of learning.topics) {
    const lesson = topic.lessons.find((item) => item.id === lessonId.value)
    if (lesson) {
      return topic
    }
  }
  return null
})

const currentTopicLessonMeta = computed(() => {
  if (!currentTopic.value) return null
  return currentTopic.value.lessons.find((item) => item.id === lessonId.value) ?? null
})

const nextLessonMeta = computed(() => {
  const topic = currentTopic.value
  if (!topic) return null
  const currentIndex = topic.lessons.findIndex((item) => item.id === lessonId.value)
  if (currentIndex < 0) return null
  return topic.lessons[currentIndex + 1] ?? null
})

const isCurrentLessonFinalExam = computed(() => {
  if (learning.currentLesson) {
    return learning.currentLesson.lesson_type === 'final_exam'
  }
  if (!currentTopicLessonMeta.value) return false
  return isFinalExamLesson(currentTopicLessonMeta.value)
})

const isCurrentFinalExamUnlocked = computed(() => {
  if (!currentTopic.value) return true
  if (!isCurrentLessonFinalExam.value) return true
  return isFinalExamUnlocked(currentTopic.value)
})

const isNextLessonLocked = computed(() => {
  if (!currentTopic.value || !nextLessonMeta.value) return false
  if (!isFinalExamLesson(nextLessonMeta.value)) return false
  return !isFinalExamUnlocked(currentTopic.value)
})

const nextLessonLabel = computed(() => {
  if (!nextLessonMeta.value) return ''
  if (isFinalExamLesson(nextLessonMeta.value)) return 'К финальному тесту'
  return 'К следующему уроку'
})

const hasUnsolvedQuiz = computed(() => {
  if (isCurrentLessonFinalExam.value) return false
  const progress = currentLessonProgress.value
  if (!progress) return false
  if (progress.quizzes_total <= 0) return false
  return progress.quizzes_solved < progress.quizzes_total
})

const currentQuickQuestion = computed(() => {
  return quickCheckQuestions.value[quickCheckCurrentIndex.value] ?? null
})

const isQuickFirstQuestion = computed(() => quickCheckCurrentIndex.value <= 0)
const isQuickLastQuestion = computed(
  () => quickCheckCurrentIndex.value >= quickCheckQuestions.value.length - 1,
)

const canMoveNextQuick = computed(() => {
  const question = currentQuickQuestion.value
  if (!question) return false
  return !!quickCheckStates.value[question.id]
})

const quickAnsweredCount = computed(() => Object.keys(quickCheckStates.value).length)
const quickCorrectCount = computed(
  () => Object.values(quickCheckStates.value).filter((item) => item.isCorrect).length,
)
const isQuickCompleted = computed(() => {
  if (quickCheckQuestions.value.length === 0) return false
  return quickCorrectCount.value >= quickCheckQuestions.value.length
})

const canSubmitFinalQuiz = computed(() => {
  if (!finalQuiz.value) return false
  return finalQuiz.value.questions.every(
    (question) => (finalQuizSelectedAnswers.value[question.id]?.length ?? 0) > 0,
  )
})

function resetQuickCheckState() {
  quickCheckLoading.value = false
  quickCheckSubmitting.value = false
  quickCheckError.value = ''
  quickCheckQuestions.value = []
  quickCheckCurrentIndex.value = 0
  quickCheckStates.value = {}
}

function resetFinalQuizState() {
  finalQuizLoading.value = false
  finalQuizSubmitting.value = false
  finalQuizError.value = ''
  finalQuiz.value = null
  finalQuizSelectedAnswers.value = {}
}

function quickAnswerState(questionId: string) {
  return quickCheckStates.value[questionId] ?? null
}

function quickAnswerClass(questionId: string, answerId: string) {
  const state = quickAnswerState(questionId)
  if (!state) return ''
  if (state.selectedAnswerId === answerId) {
    return state.isCorrect
      ? 'lesson-view__quick-answer--correct'
      : 'lesson-view__quick-answer--wrong'
  }
  return ''
}

async function chooseQuickAnswer(questionId: string, answerId: string) {
  if (!lessonId.value || quickCheckSubmitting.value) return
  quickCheckSubmitting.value = true
  quickCheckError.value = ''
  try {
    const result = await learning.submitLessonQuickAnswer(lessonId.value, questionId, answerId)
    quickCheckStates.value[questionId] = {
      selectedAnswerId: result.selectedAnswerId,
      isCorrect: result.isCorrect,
      correctAnswerId: result.correctAnswerId,
      feedback: result.feedback,
    }

  } catch (error) {
    quickCheckError.value = error instanceof Error ? error.message : 'Не удалось проверить ответ'
  } finally {
    quickCheckSubmitting.value = false
  }
}

function prevQuickQuestion() {
  if (isQuickFirstQuestion.value) return
  quickCheckCurrentIndex.value -= 1
}

function nextQuickQuestion() {
  if (!canMoveNextQuick.value || isQuickLastQuestion.value) return
  quickCheckCurrentIndex.value += 1
}

function isFinalAnswerSelected(questionId: string, answerId: string) {
  return finalQuizSelectedAnswers.value[questionId]?.includes(answerId) ?? false
}

function selectFinalSingle(questionId: string, answerId: string) {
  finalQuizSelectedAnswers.value[questionId] = [answerId]
}

function toggleFinalMulti(questionId: string, answerId: string) {
  const selected = finalQuizSelectedAnswers.value[questionId] ?? []
  if (selected.includes(answerId)) {
    finalQuizSelectedAnswers.value[questionId] = selected.filter((item) => item !== answerId)
    return
  }
  finalQuizSelectedAnswers.value[questionId] = [...selected, answerId]
}

async function loadQuickCheck(lessonIdValue: string) {
  quickCheckLoading.value = true
  quickCheckError.value = ''
  quickCheckStates.value = {}
  quickCheckCurrentIndex.value = 0
  try {
    const quickCheck = await learning.getLessonQuickCheck(lessonIdValue)
    quickCheckQuestions.value = quickCheck.questions.map((question) => ({
      id: question.id,
      text: question.text,
      order_index: question.order_index,
      answers: question.answers,
    }))

    for (const question of quickCheck.questions) {
      if (!question.selected_answer_id || question.selected_is_correct === null) continue
      quickCheckStates.value[question.id] = {
        selectedAnswerId: question.selected_answer_id,
        isCorrect: question.selected_is_correct,
        correctAnswerId: null,
        feedback: question.selected_is_correct
          ? 'Верно. Этот вариант выбран правильно.'
          : 'Ранее выбран неверный вариант. Попробуйте снова.',
      }
    }
  } catch (error) {
    resetQuickCheckState()
    quickCheckError.value =
      error instanceof Error ? error.message : 'Не удалось загрузить мини-тест'
  } finally {
    quickCheckLoading.value = false
  }
}

async function loadFinalQuiz(quizId: string) {
  finalQuizLoading.value = true
  finalQuizError.value = ''
  try {
    const quiz = await learning.getQuizById(quizId)
    finalQuiz.value = quiz
    const state: Record<string, string[]> = {}
    for (const question of quiz.questions) {
      state[question.id] = []
    }
    finalQuizSelectedAnswers.value = state
  } catch (error) {
    resetFinalQuizState()
    finalQuizError.value =
      error instanceof Error ? error.message : 'Не удалось загрузить финальный тест'
  } finally {
    finalQuizLoading.value = false
  }
}

async function submitFinalQuiz() {
  if (!finalQuiz.value || !canSubmitFinalQuiz.value) return
  const payload: AttemptSubmitAnswer[] = finalQuiz.value.questions.map((question) => ({
    questionId: question.id,
    selectedAnswerIds: finalQuizSelectedAnswers.value[question.id] ?? [],
  }))

  finalQuizSubmitting.value = true
  finalQuizError.value = ''
  try {
    const result = await learning.submitQuizAttempt(finalQuiz.value.id, payload)
    await learning.refreshTopicsSilently()
    openTestResultPage({
      score: Number(result?.score ?? 0),
      maxScore: Number(result?.maxScore ?? 0),
      percent: Number(result?.percent ?? 0),
    })
  } catch (error) {
    finalQuizError.value = error instanceof Error ? error.message : 'Не удалось отправить ответы'
  } finally {
    finalQuizSubmitting.value = false
  }
}

function calculateReadPercent(): number {
  const element = articleRef.value
  if (!element) return 0

  const scrollTop = window.scrollY || window.pageYOffset || 0
  const viewportBottom = scrollTop + window.innerHeight
  const elementTop = element.offsetTop
  const elementHeight = element.offsetHeight

  if (elementHeight <= 0) return 0

  const readHeight = viewportBottom - elementTop
  const percent = (readHeight / elementHeight) * 100

  return Math.max(0, Math.min(100, percent))
}

function syncReadProgress() {
  if (isCurrentLessonFinalExam.value) return
  const percent = calculateReadPercent()
  if (percent > readPercent.value) {
    readPercent.value = percent
  }

  const roundedPercent = Math.round(readPercent.value)
  if (!lessonId.value) return

  if (
    roundedPercent >= lastSyncedPercent + syncStepPercent ||
    (roundedPercent === 100 && lastSyncedPercent < 100)
  ) {
    lastSyncedPercent = roundedPercent
    void learning.updateLessonReadProgress(lessonId.value, roundedPercent)
  }
}

function handleScroll() {
  if (rafId !== 0) return

  rafId = window.requestAnimationFrame(() => {
    rafId = 0
    syncReadProgress()
  })
}

function attachTracking() {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleScroll)
}

function detachTracking() {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleScroll)

  if (rafId !== 0) {
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }
}

async function loadCurrentLesson() {
  if (!lessonId.value) return
  if (learning.topics.length === 0) {
    try {
      await learning.loadTopics()
    } catch {}
  }

  const lessonMeta = currentTopicLessonMeta.value
  if (lessonMeta && isFinalExamLesson(lessonMeta) && !isCurrentFinalExamUnlocked.value) {
    finalExamLocked.value = true
    resetQuickCheckState()
    resetFinalQuizState()
    return
  }

  finalExamLocked.value = false
  try {
    await learning.loadLesson(lessonId.value)
    const savedPercent = currentLessonProgress.value?.progress_percent ?? 0
    readPercent.value = savedPercent
    lastSyncedPercent = Math.round(savedPercent)

    if (isCurrentLessonFinalExam.value) {
      resetQuickCheckState()
      if (firstQuizId.value) {
        await loadFinalQuiz(firstQuizId.value)
      } else {
        resetFinalQuizState()
      }
    } else {
      resetFinalQuizState()
      await loadQuickCheck(lessonId.value)
    }
    await nextTick()
    focusQuizFromQuery()
    if (!isCurrentLessonFinalExam.value) {
      syncReadProgress()
    }
  } catch {}
}

function goBack() {
  if (topicIdQuery.value) {
    void router.push({ name: 'topic', params: { topicId: topicIdQuery.value } })
    return
  }
  void router.push({ name: 'learning' })
}

function openTestResultPage(params: {
  score: number
  maxScore: number
  percent: number
}) {
  if (!lessonId.value) return

  const nextTopicId = topicIdQuery.value || currentTopic.value?.id || ''
  void router.push({
    name: 'lesson-test-result',
    params: { lessonId: lessonId.value },
    query: {
      ...(nextTopicId ? { topicId: nextTopicId } : {}),
      score: String(params.score),
      maxScore: String(params.maxScore),
      percent: String(params.percent),
    },
  })
}

function focusQuizFromQuery() {
  if (route.query.focus !== 'quiz') return
  finalQuizCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToNextLesson() {
  if (!nextLessonMeta.value || isNextLessonLocked.value) return
  const nextTopicId = topicIdQuery.value || currentTopic.value?.id || ''
  void router.push({
    name: 'lesson',
    params: { lessonId: nextLessonMeta.value.id },
    query: nextTopicId ? { topicId: nextTopicId } : {},
  })
}

watch(lessonId, () => {
  readPercent.value = 0
  lastSyncedPercent = 0
  finalExamLocked.value = false
  resetQuickCheckState()
  resetFinalQuizState()
  void loadCurrentLesson()
})

onMounted(async () => {
  attachTracking()
  await loadCurrentLesson()
})

onBeforeUnmount(() => {
  detachTracking()
})
</script>

<template>
  <section class="lesson-view">
    <header class="lesson-view__header">
      <Button variant="outline" size="sm" @click="goBack"> Назад к теме </Button>
    </header>

    <div v-if="!isCurrentLessonFinalExam" class="lesson-view__reading-banner">
      <div class="lesson-view__progress-track">
        <div class="lesson-view__progress-fill" :style="progressFillStyle" />
      </div>
      <div class="lesson-view__reading-meta">
        <strong class="lesson-view__reading-text">Прогресс урока {{ displayReadPercent }}%</strong>
        <p v-if="readingBannerHint" class="lesson-view__reading-hint">{{ readingBannerHint }}</p>
      </div>
    </div>

    <p v-if="learning.isLoading" class="lesson-view__state">Загрузка урока...</p>
    <p v-else-if="learning.error" class="lesson-view__state lesson-view__state--error">
      {{ learning.error }}
    </p>

    <Card v-else-if="finalExamLocked" class="lesson-view__locked-card">
      <h2 class="lesson-view__locked-title">Финальный тест пока недоступен</h2>
      <p class="lesson-view__locked-text">
        Сначала завершите все уроки этой темы. После этого итоговый тест откроется автоматически.
      </p>
      <Button variant="outline" class="lesson-view__locked-button" @click="goBack">
        Вернуться к теме
      </Button>
    </Card>

    <template v-else-if="learning.currentLesson">
      <Card class="lesson-view__hero-card">
        <h1 class="lesson-view__title">{{ learning.currentLesson.title }}</h1>
        <p v-if="learning.currentLesson.summary" class="lesson-view__summary">
          {{ learning.currentLesson.summary }}
        </p>

        <div class="lesson-view__meta-chips">
          <span class="lesson-view__meta-chip">
            <Clock3 class="lesson-view__meta-chip-icon" />
            {{ learning.currentLesson.estimated_minutes }} мин
          </span>
          <span class="lesson-view__meta-chip">
            <FileText class="lesson-view__meta-chip-icon" />
            Сложность {{ learning.currentLesson.difficulty }}
          </span>
          <span class="lesson-view__meta-chip">
            <ListChecks class="lesson-view__meta-chip-icon" />
            Тестов: {{ learning.currentLessonQuizzes.length }}
          </span>
        </div>
      </Card>

      <div v-if="!isCurrentLessonFinalExam" class="lesson-view__intro-grid">
        <Card class="lesson-view__intro-card">
          <h2 class="lesson-view__intro-title">Что вы узнаете</h2>
          <ul class="lesson-view__intro-list">
            <li v-for="item in lessonOverview" :key="item" class="lesson-view__intro-item">
              <img :src="iconCheckCircle" alt="" class="lesson-view__intro-item-icon" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </Card>

        <Card class="lesson-view__intro-card">
          <h2 class="lesson-view__intro-title">Чему научитесь</h2>
          <ul class="lesson-view__intro-list">
            <li v-for="item in lessonSkills" :key="item" class="lesson-view__intro-item">
              <img :src="iconCheckCircle" alt="" class="lesson-view__intro-item-icon" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card v-if="!isCurrentLessonFinalExam" class="lesson-view__article-card">
        <article ref="articleRef" class="lesson-view__article">
          <section
            v-for="section in articleSections"
            :key="section.id"
            class="lesson-view__section"
          >
            <h2 class="lesson-view__section-title">{{ section.title }}</h2>
            <template v-for="block in sectionBlocks(section)" :key="block.id">
              <p v-if="block.type === 'paragraph'" class="lesson-view__section-text">
                {{ block.text }}
              </p>

              <ul v-else-if="block.type === 'unordered_list'" class="lesson-view__section-list">
                <li
                  v-for="(item, itemIndex) in block.items"
                  :key="`${block.id}-u-${itemIndex}`"
                  class="lesson-view__section-item"
                >
                  {{ item }}
                </li>
              </ul>

              <ol v-else class="lesson-view__section-list lesson-view__section-list--ordered">
                <li
                  v-for="(item, itemIndex) in block.items"
                  :key="`${block.id}-o-${itemIndex}`"
                  class="lesson-view__section-item"
                >
                  {{ item }}
                </li>
              </ol>
            </template>
          </section>
        </article>

        <footer class="lesson-view__article-footer">
          <div class="lesson-view__article-footer-content">
            <p class="lesson-view__article-footer-text">
              Материал изучен. Ниже расположен проверочный тест к уроку.
            </p>
            <Button
              v-if="nextLessonMeta"
              variant="outline"
              :disabled="isNextLessonLocked"
              @click="goToNextLesson"
            >
              {{ nextLessonLabel }}
            </Button>
          </div>
        </footer>
      </Card>

      <Card v-if="!isCurrentLessonFinalExam" class="lesson-view__quiz-card">
        <div class="lesson-view__quiz-header">
          <h2 class="lesson-view__quiz-title">Проверочный мини-тест</h2>
          <span class="lesson-view__quiz-counter">
            Вопрос {{ quickCheckCurrentIndex + 1 }} из {{ quickCheckQuestions.length }}
          </span>
        </div>

        <p v-if="quickCheckError" class="lesson-view__state lesson-view__state--error">
          {{ quickCheckError }}
        </p>

        <p v-else-if="quickCheckLoading" class="lesson-view__state">Загрузка мини-теста...</p>

        <template v-else-if="currentQuickQuestion">
          <div class="lesson-view__inline-question">
            <h3 class="lesson-view__inline-question-title">{{ currentQuickQuestion.text }}</h3>
            <p class="lesson-view__inline-question-meta">
              Выберите один вариант. Ответ проверяется сразу после нажатия.
            </p>

            <div class="lesson-view__inline-answers">
              <button
                v-for="answer in currentQuickQuestion.answers"
                :key="answer.id"
                type="button"
                class="lesson-view__inline-answer"
                :class="quickAnswerClass(currentQuickQuestion.id, answer.id)"
                :disabled="quickCheckSubmitting"
                @click="chooseQuickAnswer(currentQuickQuestion.id, answer.id)"
              >
                <span>{{ answer.text }}</span>
              </button>
            </div>

            <p
              v-if="quickAnswerState(currentQuickQuestion.id)"
              class="lesson-view__quick-feedback"
              :class="{
                'lesson-view__quick-feedback--ok': quickAnswerState(currentQuickQuestion.id)
                  ?.isCorrect,
                'lesson-view__quick-feedback--bad': !quickAnswerState(currentQuickQuestion.id)
                  ?.isCorrect,
              }"
            >
              {{ quickAnswerState(currentQuickQuestion.id)?.feedback }}
            </p>

            <div class="lesson-view__inline-actions">
              <Button
                variant="outline"
                :disabled="isQuickFirstQuestion || quickCheckSubmitting"
                @click="prevQuickQuestion"
              >
                <ChevronLeft />
                Назад
              </Button>

              <Button
                :disabled="!canMoveNextQuick || isQuickLastQuestion || quickCheckSubmitting"
                @click="nextQuickQuestion"
              >
                Далее
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div class="lesson-view__inline-result">
            <p class="lesson-view__inline-result-text">
              Отвечено: {{ quickAnsweredCount }} / {{ quickCheckQuestions.length }}, верно:
              {{ quickCorrectCount }} / {{ quickCheckQuestions.length }}
            </p>
            <p v-if="isQuickCompleted" class="lesson-view__quick-complete">
              Мини-тест пройден. Урок завершён.
            </p>
            <Button
              v-if="isQuickCompleted && nextLessonMeta"
              class="lesson-view__next-lesson-button"
              :disabled="isNextLessonLocked"
              @click="goToNextLesson"
            >
              {{ nextLessonLabel }}
            </Button>
          </div>
        </template>

        <p v-else class="lesson-view__state">Мини-тест для этого урока пока не заполнен.</p>
      </Card>

      <Card
        v-if="isCurrentLessonFinalExam && hasFinalQuiz"
        ref="finalQuizCardRef"
        class="lesson-view__quiz-card lesson-view__quiz-card--final"
      >
        <div class="lesson-view__quiz-header">
          <h2 class="lesson-view__quiz-title">Финальный тест темы</h2>
          <span v-if="finalQuiz" class="lesson-view__quiz-counter">
            Вопросов: {{ finalQuiz.questions.length }}
          </span>
        </div>

        <p v-if="finalQuizError" class="lesson-view__state lesson-view__state--error">
          {{ finalQuizError }}
        </p>

        <p v-else-if="finalQuizLoading" class="lesson-view__state">Загрузка финального теста...</p>

        <template v-else-if="finalQuiz">
          <div class="lesson-view__final-questions">
            <Card
              v-for="(question, questionIndex) in finalQuiz.questions"
              :key="question.id"
              class="lesson-view__final-question-card"
            >
              <h3 class="lesson-view__final-question-title">
                {{ questionIndex + 1 }}. {{ question.text }}
              </h3>
              <p class="lesson-view__inline-question-meta">
                {{
                  question.q_type === 'multiple'
                    ? 'Выберите несколько вариантов'
                    : 'Выберите один вариант'
                }}
              </p>

              <div class="lesson-view__inline-answers">
                <label
                  v-for="answer in question.answers"
                  :key="answer.id"
                  class="lesson-view__inline-answer lesson-view__inline-answer--final"
                >
                  <input
                    v-if="question.q_type === 'single'"
                    :name="`final-${question.id}`"
                    type="radio"
                    :checked="isFinalAnswerSelected(question.id, answer.id)"
                    @change="selectFinalSingle(question.id, answer.id)"
                  />
                  <input
                    v-else
                    type="checkbox"
                    :checked="isFinalAnswerSelected(question.id, answer.id)"
                    @change="toggleFinalMulti(question.id, answer.id)"
                  />
                  <span>{{ answer.text }}</span>
                </label>
              </div>
            </Card>
          </div>

          <div class="lesson-view__final-actions">
            <Button :disabled="!canSubmitFinalQuiz || finalQuizSubmitting" @click="submitFinalQuiz">
              {{ finalQuizSubmitting ? 'Отправка...' : 'Завершить финальный тест' }}
            </Button>
          </div>
        </template>

        <p v-else class="lesson-view__state">Финальный тест недоступен.</p>
      </Card>
    </template>
  </section>
</template>

<style scoped>
.lesson-view {
  display: grid;
  gap: 14px;
}

.lesson-view__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.lesson-view__reading-banner {
  position: sticky;
  top: 10px;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  padding: 10px 14px;
  background: hsl(var(--background) / 0.95);
  backdrop-filter: blur(6px);
}

.lesson-view__progress-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: hsl(var(--muted));
  overflow: hidden;
}

.lesson-view__progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, hsl(205 86% 55%), hsl(262 84% 66%));
  transition: width 0.18s ease;
}

.lesson-view__reading-text {
  font-size: 14px;
  white-space: nowrap;
}

.lesson-view__reading-meta {
  display: grid;
  justify-items: end;
  gap: 2px;
}

.lesson-view__reading-hint {
  margin: 0;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.lesson-view__state {
  margin: 0;
  font-size: 14px;
}

.lesson-view__state--error {
  color: hsl(var(--destructive));
}

.lesson-view__hero-card,
.lesson-view__intro-card,
.lesson-view__article-card,
.lesson-view__quiz-card {
  border-radius: 16px;
  padding: 20px;
}

.lesson-view__hero-card {
  display: grid;
  gap: 10px;
}

.lesson-view__title {
  margin: 0;
  font-size: 34px;
  line-height: 1.08;
}

.lesson-view__summary {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.lesson-view__meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lesson-view__meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__meta-chip-icon {
  width: 14px;
  height: 14px;
}

.lesson-view__intro-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lesson-view__intro-card {
  display: grid;
  gap: 10px;
}

.lesson-view__intro-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.15;
}

.lesson-view__intro-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.lesson-view__intro-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 8px;
}

.lesson-view__intro-item-icon {
  width: 16px;
  height: 16px;
  color: hsl(151 62% 42%);
  margin-top: 4px;
}

.lesson-view__article-card {
  display: grid;
  gap: 18px;
}

.lesson-view__article {
  display: grid;
  gap: 20px;
}

.lesson-view__section {
  display: grid;
  gap: 10px;
}

.lesson-view__section-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
}

.lesson-view__section-text {
  margin: 0;
  color: hsl(var(--foreground));
  line-height: 1.8;
  text-indent: 1.5em;
  text-wrap: pretty;
}

.lesson-view__section-list {
  margin: 0;
  padding-left: 24px;
  list-style: disc;
}

.lesson-view__section-list--ordered {
  list-style: decimal;
}

.lesson-view__section-item {
  line-height: 1.7;
  margin: 4px 0;
}

.lesson-view__article-footer {
  display: grid;
  padding-top: 6px;
  border-top: 1px solid hsl(var(--border));
}

.lesson-view__article-footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.lesson-view__article-footer-text {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__quiz-card {
  display: grid;
  gap: 12px;
}

.lesson-view__quiz-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.lesson-view__quiz-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.15;
}

.lesson-view__quiz-counter {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__inline-question {
  display: grid;
  gap: 10px;
}

.lesson-view__inline-question-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

.lesson-view__inline-question-meta {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.lesson-view__inline-answers {
  display: grid;
  gap: 8px;
}

.lesson-view__inline-answer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 8px 10px;
  background: hsl(var(--background));
  cursor: pointer;
}

.lesson-view__inline-answer--final {
  cursor: default;
}

.lesson-view__quick-answer--correct {
  border-color: hsl(151 55% 45%);
  background: hsl(151 72% 94%);
}

.lesson-view__quick-answer--wrong {
  border-color: hsl(0 72% 48%);
  background: hsl(0 86% 95%);
}

.lesson-view__inline-answer input {
  margin: 0;
  flex-shrink: 0;
}

.lesson-view__quick-feedback {
  margin: 0;
  font-size: 14px;
  padding: 8px 10px;
  border-radius: 10px;
}

.lesson-view__quick-feedback--ok {
  color: hsl(151 62% 28%);
  background: hsl(151 72% 92%);
  border: 1px solid hsl(151 42% 74%);
}

.lesson-view__quick-feedback--bad {
  color: hsl(0 72% 32%);
  background: hsl(0 84% 93%);
  border: 1px solid hsl(0 54% 78%);
}

.lesson-view__inline-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.lesson-view__inline-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-top: 1px solid hsl(var(--border));
  padding-top: 12px;
}

.lesson-view__inline-result-text {
  margin: 0;
  font-size: 14px;
}

.lesson-view__quick-complete {
  margin: 0;
  font-size: 14px;
  color: hsl(151 62% 28%);
  font-weight: 600;
}

.lesson-view__next-lesson-button {
  margin-left: auto;
}

.lesson-view__final-questions {
  display: grid;
  gap: 10px;
}

.lesson-view__final-question-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
}

.lesson-view__final-question-title {
  margin: 0;
  font-size: 17px;
  line-height: 1.3;
}

.lesson-view__final-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lesson-view__quiz-card--final {
  gap: 14px;
}

.lesson-view__locked-card {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 16px;
}

.lesson-view__locked-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
}

.lesson-view__locked-text {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.lesson-view__locked-button {
  width: fit-content;
}

@media (max-width: 1024px) {
  .lesson-view__title {
    font-size: 30px;
  }

  .lesson-view__intro-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .lesson-view__hero-card,
  .lesson-view__intro-card,
  .lesson-view__article-card,
  .lesson-view__quiz-card {
    padding: 16px;
  }

  .lesson-view__title {
    font-size: 26px;
  }

  .lesson-view__section-title {
    font-size: 21px;
  }

  .lesson-view__reading-banner {
    grid-template-columns: 1fr;
    gap: 8px;
    border-radius: 14px;
  }

  .lesson-view__reading-meta {
    justify-items: start;
  }

  .lesson-view__inline-actions {
    flex-direction: column;
  }

  .lesson-view__inline-actions :deep(button) {
    width: 100%;
    justify-content: center;
  }

  .lesson-view__final-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .lesson-view__final-actions :deep(button) {
    width: 100%;
    justify-content: center;
  }
}
</style>
