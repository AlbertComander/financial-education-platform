<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ChevronDown,
  Eye,
  FolderKanban,
  GraduationCap,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAdminLearningStore } from '@/stores/admin-learning'
import AdminQuickQuestionEditor from '@/components/admin/AdminQuickQuestionEditor.vue'
import AdminFinalQuestionEditor from '@/components/admin/AdminFinalQuestionEditor.vue'
import AdminFinalQuizPreview from '@/components/admin/AdminFinalQuizPreview.vue'
import LessonRichEditor from '@/components/admin/LessonRichEditor.vue'
import {
  buildFinalQuestionPayload,
  buildQuickQuestionPayload,
  createEmptyFinalQuestionDraft,
  createEmptyQuickQuestionDraft,
  finalQuestionDraftFromEntity,
  quickQuestionDraftFromEntity,
  validateFinalQuestionDraft,
  validateQuickQuestionDraft,
  type FinalQuestionDraft,
  type QuickQuestionDraft,
} from '@/lib/admin-learning-builder'
import type { AdminTopicSummary } from '@/types/admin-learning'

type TopicFormState = {
  title: string
  description: string
  difficulty: string
}

type LessonFormState = {
  lessonType: 'lesson' | 'final_exam'
  title: string
  summary: string
  content: string
  difficulty: string
  estimatedMinutes: string
}

type WorkspaceTab = 'topic' | 'lesson' | 'quick' | 'exam'
type ExamPanelMode = 'edit' | 'preview'
type DragEntityKind = 'topic' | 'lesson' | 'quick' | 'final'
type DragState = {
  kind: DragEntityKind
  itemId: string
  parentId?: string
}

const adminLearning = useAdminLearningStore()

const selectedTopicId = ref('')
const selectedLessonId = ref('')
const structureSearchInput = ref('')
const structureSearch = ref('')
const workspaceTab = ref<WorkspaceTab>('topic')
const expandedQuickDraftKey = ref('')
const expandedFinalDraftKey = ref('')
const expandedTopicIds = ref<string[]>([])
const noticeText = ref('')
const noticeTone = ref<'success' | 'error'>('success')
const quickQuestionDrafts = ref<QuickQuestionDraft[]>([])
const finalQuestionDrafts = ref<FinalQuestionDraft[]>([])
const examPanelMode = ref<ExamPanelMode>('edit')
const dragState = ref<DragState | null>(null)
const dropTargetKey = ref('')
let dragPreviewChanged = false
let isCommittingDragOrder = false
let structureSearchTimeout: ReturnType<typeof setTimeout> | undefined

const topicForm = reactive<TopicFormState>({
  title: '',
  description: '',
  difficulty: '1',
})

const lessonForm = reactive<LessonFormState>({
  lessonType: 'lesson',
  title: '',
  summary: '',
  content: '',
  difficulty: '1',
  estimatedMinutes: '10',
})

const topics = computed(() => {
  return [...adminLearning.topics].sort((left, right) => left.order_index - right.order_index)
})

const normalizedStructureSearch = computed(() =>
  structureSearch.value.trim().toLocaleLowerCase('ru-RU'),
)

const filteredTopics = computed(() => {
  const query = normalizedStructureSearch.value

  if (!query) {
    return topics.value
  }

  return topics.value
    .map((topic) => {
      if (topicMatchesSearch(topic, query)) {
        return topic
      }

      const lessons = topic.lessons.filter((lesson) => lessonMatchesSearch(lesson, query))

      if (lessons.length === 0) {
        return null
      }

      return {
        ...topic,
        lessons,
      }
    })
    .filter((topic): topic is AdminTopicSummary => topic !== null)
})

const selectedTopic = computed(() => {
  return topics.value.find((topic) => topic.id === selectedTopicId.value) ?? null
})

const selectedLessonSummary = computed(() => {
  return selectedTopic.value?.lessons.find((lesson) => lesson.id === selectedLessonId.value) ?? null
})

const selectedLesson = computed(() => adminLearning.selectedLesson)
const selectedFinalQuiz = computed(() => adminLearning.selectedFinalQuiz)
const isRegularLesson = computed(() => selectedLesson.value?.lesson_type === 'lesson')
const isFinalExamLesson = computed(() => selectedLesson.value?.lesson_type === 'final_exam')
const hasLessonSelected = computed(() => !!selectedLesson.value)
const isStructureDragDisabled = computed(
  () => normalizedStructureSearch.value.length > 0 || adminLearning.isSaving,
)

function showNotice(message: string, tone: 'success' | 'error' = 'success') {
  noticeText.value = message
  noticeTone.value = tone
}

function containsSearchValue(value: string | null | undefined, query: string) {
  if (!value) return false
  return value.toLocaleLowerCase('ru-RU').includes(query)
}

function topicMatchesSearch(topic: AdminTopicSummary, query: string) {
  return containsSearchValue(topic.title, query) || containsSearchValue(topic.description, query)
}

function lessonMatchesSearch(lesson: AdminTopicSummary['lessons'][number], query: string) {
  return (
    containsSearchValue(lesson.title, query) ||
    containsSearchValue(lesson.summary, query) ||
    lesson.quizzes.some((quiz) => containsSearchValue(quiz.title, query))
  )
}

function resetTopicForm() {
  topicForm.title = ''
  topicForm.description = ''
  topicForm.difficulty = '1'
}

function resetLessonForm() {
  lessonForm.lessonType = 'lesson'
  lessonForm.title = ''
  lessonForm.summary = ''
  lessonForm.content = ''
  lessonForm.difficulty = '1'
  lessonForm.estimatedMinutes = '10'
}

function syncTopicForm() {
  if (!selectedTopic.value) {
    resetTopicForm()
    return
  }

  topicForm.title = selectedTopic.value.title
  topicForm.description = selectedTopic.value.description ?? ''
  topicForm.difficulty = String(selectedTopic.value.difficulty)
}

function syncLessonForm() {
  if (!selectedLesson.value) {
    resetLessonForm()
    return
  }

  lessonForm.lessonType = selectedLesson.value.lesson_type
  lessonForm.title = selectedLesson.value.title
  lessonForm.summary = selectedLesson.value.summary ?? ''
  lessonForm.content = selectedLesson.value.content
  lessonForm.difficulty = String(selectedLesson.value.difficulty)
  lessonForm.estimatedMinutes = String(selectedLesson.value.estimated_minutes)
}

watch(selectedTopic, syncTopicForm, { immediate: true })
watch(
  structureSearchInput,
  (value) => {
    if (structureSearchTimeout) {
      clearTimeout(structureSearchTimeout)
    }

    structureSearchTimeout = setTimeout(() => {
      structureSearch.value = value
    }, 280)
  },
  { immediate: true },
)
watch(
  selectedLesson,
  () => {
    syncLessonForm()
    quickQuestionDrafts.value = selectedLesson.value
      ? selectedLesson.value.lesson_quick_questions
          .map(quickQuestionDraftFromEntity)
          .sort((left, right) => left.orderIndex - right.orderIndex)
      : []
    if (!selectedLesson.value) {
      workspaceTab.value = 'topic'
      examPanelMode.value = 'edit'
      expandedQuickDraftKey.value = ''
      expandedFinalDraftKey.value = ''
      return
    }
    workspaceTab.value = selectedLesson.value.lesson_type === 'final_exam' ? 'exam' : 'lesson'
    examPanelMode.value = 'edit'
    expandedQuickDraftKey.value = ''
    expandedFinalDraftKey.value = ''
  },
  { immediate: true },
)
watch(
  selectedFinalQuiz,
  () => {
    finalQuestionDrafts.value = selectedFinalQuiz.value
      ? selectedFinalQuiz.value.questions
          .map(finalQuestionDraftFromEntity)
          .sort((left, right) => left.orderIndex - right.orderIndex)
      : []
    expandedFinalDraftKey.value = ''
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (structureSearchTimeout) {
    clearTimeout(structureSearchTimeout)
  }
})

function clearLessonSelection() {
  selectedLessonId.value = ''
  adminLearning.selectedLesson = null
  adminLearning.selectedFinalQuiz = null
  quickQuestionDrafts.value = []
  finalQuestionDrafts.value = []
  expandedQuickDraftKey.value = ''
  expandedFinalDraftKey.value = ''
  workspaceTab.value = 'topic'
  resetLessonForm()
}

function setTopicExpanded(topicId: string, expanded: boolean) {
  if (expanded) {
    if (!expandedTopicIds.value.includes(topicId)) {
      expandedTopicIds.value = [...expandedTopicIds.value, topicId]
    }
    return
  }

  expandedTopicIds.value = expandedTopicIds.value.filter((id) => id !== topicId)
}

function toggleTopicExpansion(topicId: string) {
  setTopicExpanded(topicId, !expandedTopicIds.value.includes(topicId))
}

function isTopicExpanded(topicId: string) {
  return normalizedStructureSearch.value.length > 0 || expandedTopicIds.value.includes(topicId)
}

function nextQuickQuestionOrder() {
  if (quickQuestionDrafts.value.length === 0) return 1
  return Math.max(...quickQuestionDrafts.value.map((draft) => Number(draft.orderIndex) || 0)) + 1
}

function nextFinalQuestionOrder() {
  if (finalQuestionDrafts.value.length === 0) return 1
  return Math.max(...finalQuestionDrafts.value.map((draft) => Number(draft.orderIndex) || 0)) + 1
}

function setWorkspaceTab(nextTab: WorkspaceTab) {
  if (nextTab === 'quick' && !isRegularLesson.value) return
  if (nextTab === 'exam' && !isFinalExamLesson.value) return
  if (nextTab === 'lesson' && !hasLessonSelected.value) return
  workspaceTab.value = nextTab
  if (nextTab !== 'exam') {
    examPanelMode.value = 'edit'
  }
}

function toggleQuickDraft(draftKey: string) {
  expandedQuickDraftKey.value = expandedQuickDraftKey.value === draftKey ? '' : draftKey
}

function toggleFinalDraft(draftKey: string) {
  expandedFinalDraftKey.value = expandedFinalDraftKey.value === draftKey ? '' : draftKey
}

function questionPreview(text: string) {
  const value = text.trim()
  if (!value) return 'Новый вопрос'
  if (value.length <= 96) return value
  return `${value.slice(0, 96)}...`
}

function finalQuestionTypeLabel(type: FinalQuestionDraft['qType']) {
  if (type === 'single') return 'Один ответ'
  if (type === 'multiple') return 'Несколько ответов'
  if (type === 'open') return 'Открытый'
  if (type === 'sequence') return 'Последовательность'
  return 'Соответствие'
}

function createDropTargetKey(kind: DragEntityKind, itemId: string, parentId = '') {
  return `${kind}:${parentId}:${itemId}`
}

function startDrag(kind: DragEntityKind, itemId: string, parentId?: string) {
  if (kind === 'topic' || kind === 'lesson') {
    if (isStructureDragDisabled.value) return
  }

  dragPreviewChanged = false
  dropTargetKey.value = ''
  dragState.value = {
    kind,
    itemId,
    parentId,
  }
}

function finishDrag() {
  dragState.value = null
  dropTargetKey.value = ''
}

function isDragDropTarget(kind: DragEntityKind, itemId: string, parentId?: string) {
  return dropTargetKey.value === createDropTargetKey(kind, itemId, parentId)
}

function reorderItemsByPointer<T extends { id?: string; draftKey?: string }>(
  items: T[],
  draggedId: string,
  targetId: string,
  key: 'id' | 'draftKey',
  event: DragEvent,
) {
  const currentIndex = items.findIndex((item) => item[key] === draggedId)
  const targetIndex = items.findIndex((item) => item[key] === targetId)

  if (currentIndex === -1 || targetIndex === -1) {
    return items
  }

  const row = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!row) {
    return items
  }

  const rowRect = row.getBoundingClientRect()
  const shouldInsertAfter = event.clientY > rowRect.top + rowRect.height / 2

  if (currentIndex < targetIndex && !shouldInsertAfter) {
    return items
  }

  if (currentIndex > targetIndex && shouldInsertAfter) {
    return items
  }

  let nextIndex = shouldInsertAfter ? targetIndex + 1 : targetIndex
  if (currentIndex < nextIndex) {
    nextIndex -= 1
  }

  if (nextIndex === currentIndex) {
    return items
  }

  const next = [...items]
  const [draggedItem] = next.splice(currentIndex, 1)
  if (!draggedItem) {
    return items
  }

  next.splice(nextIndex, 0, draggedItem)
  return next
}

function handleDragOver(kind: DragEntityKind, itemId: string, event: DragEvent, parentId?: string) {
  if (!dragState.value) return
  if (dragState.value.kind !== kind) return
  if ((dragState.value.parentId ?? '') !== (parentId ?? '')) return

  dropTargetKey.value = createDropTargetKey(kind, itemId, parentId)

  if (kind === 'topic') {
    const reordered = reorderItemsByPointer(topics.value, dragState.value.itemId, itemId, 'id', event)
    if (reordered !== topics.value) {
      applyTopicOrder(reordered)
      dragPreviewChanged = true
    }
    return
  }

  if (kind === 'lesson') {
    const topic = topics.value.find((item) => item.id === parentId)
    if (!topic) return
    const reordered = reorderItemsByPointer(
      topic.lessons,
      dragState.value.itemId,
      itemId,
      'id',
      event,
    )
    if (reordered !== topic.lessons) {
      applyLessonOrder(
        topic.id,
        reordered.map((lesson) => lesson.id),
      )
      dragPreviewChanged = true
    }
    return
  }

  if (kind === 'quick') {
    const reordered = reorderItemsByPointer(
      quickQuestionDrafts.value,
      dragState.value.itemId,
      itemId,
      'draftKey',
      event,
    )
    if (reordered !== quickQuestionDrafts.value) {
      applyQuickQuestionOrder(reordered)
      dragPreviewChanged = true
    }
    return
  }

  const reordered = reorderItemsByPointer(
    finalQuestionDrafts.value,
    dragState.value.itemId,
    itemId,
    'draftKey',
    event,
  )
  if (reordered !== finalQuestionDrafts.value) {
    applyFinalQuestionOrder(reordered)
    dragPreviewChanged = true
  }
}

function applyTopicOrder(nextTopics: AdminTopicSummary[]) {
  adminLearning.topics = nextTopics.map((topic, index) => ({
    ...topic,
    order_index: index + 1,
  }))
}

function applyLessonOrder(topicId: string, lessonIds: string[]) {
  adminLearning.topics = topics.value.map((topic) => {
    if (topic.id !== topicId) return topic

    const lessonMap = new Map(topic.lessons.map((lesson) => [lesson.id, lesson]))
    const lessons = lessonIds
      .map((lessonId, index) => {
        const lesson = lessonMap.get(lessonId)
        if (!lesson) return null
        return {
          ...lesson,
          order_index: index + 1,
        }
      })
      .filter((lesson): lesson is AdminTopicSummary['lessons'][number] => lesson !== null)

    return {
      ...topic,
      lessons,
    }
  })
}

function applyQuickQuestionOrder(nextDrafts: QuickQuestionDraft[]) {
  quickQuestionDrafts.value = nextDrafts.map((draft, index) => ({
    ...draft,
    orderIndex: index + 1,
  }))
}

function applyFinalQuestionOrder(nextDrafts: FinalQuestionDraft[]) {
  finalQuestionDrafts.value = nextDrafts.map((draft, index) => ({
    ...draft,
    orderIndex: index + 1,
  }))
}

async function reloadTopics(preferredTopicId = selectedTopicId.value) {
  await adminLearning.loadTopics()
  expandedTopicIds.value = expandedTopicIds.value.filter((id) =>
    topics.value.some((topic) => topic.id === id),
  )

  if (topics.value.length === 0) {
    selectedTopicId.value = ''
    clearLessonSelection()
    return
  }

  const nextTopic = topics.value.find((topic) => topic.id === preferredTopicId) ?? topics.value[0]
  if (!nextTopic) {
    selectedTopicId.value = ''
    clearLessonSelection()
    return
  }

  selectedTopicId.value = nextTopic.id

  const hasSelectedLesson = nextTopic.lessons.some((lesson) => lesson.id === selectedLessonId.value)
  if (!hasSelectedLesson) {
    clearLessonSelection()
  }
}

async function loadQuizForCurrentLesson() {
  if (!selectedLesson.value || selectedLesson.value.lesson_type !== 'final_exam') {
    adminLearning.selectedFinalQuiz = null
    finalQuestionDrafts.value = []
    return
  }

  const quizSummary = selectedLesson.value.quizzes[0]
  if (!quizSummary) {
    const createdQuiz = await adminLearning.createFinalQuiz(selectedLesson.value.id, {
      title: selectedLesson.value.title,
      description: selectedLesson.value.summary ?? '',
    })
    adminLearning.selectedFinalQuiz = createdQuiz
    finalQuestionDrafts.value = createdQuiz.questions
      .map(finalQuestionDraftFromEntity)
      .sort((left, right) => left.orderIndex - right.orderIndex)
    return
  }

  await adminLearning.loadFinalQuizEditor(quizSummary.id)
}

async function reloadLessonEditor() {
  if (!selectedLessonId.value) return
  await adminLearning.loadLessonEditor(selectedLessonId.value)
  await loadQuizForCurrentLesson()
}

async function selectTopic(topicId: string) {
  selectedTopicId.value = topicId
  clearLessonSelection()
  noticeText.value = ''
}

async function selectLesson(topicId: string, lessonId: string) {
  selectedTopicId.value = topicId
  selectedLessonId.value = lessonId
  setTopicExpanded(topicId, true)
  noticeText.value = ''
  await adminLearning.loadLessonEditor(lessonId)
  await loadQuizForCurrentLesson()
}

async function commitDragOrder() {
  if (!dragState.value || isCommittingDragOrder) {
    return
  }

  const activeDrag = { ...dragState.value }

  if (!dragPreviewChanged) {
    finishDrag()
    return
  }

  isCommittingDragOrder = true
  dragPreviewChanged = false

  try {
    if (activeDrag.kind === 'topic') {
      await adminLearning.reorderTopics(topics.value.map((topic) => topic.id))
      await reloadTopics(selectedTopicId.value)
      showNotice('Порядок тем обновлён.')
      return
    }

    if (activeDrag.kind === 'lesson') {
      const topic = topics.value.find((item) => item.id === activeDrag.parentId)
      if (!topic) {
        return
      }

      await adminLearning.reorderLessons(topic.lessons.map((lesson) => lesson.id))
      await reloadTopics(topic.id)
      showNotice('Порядок уроков обновлён.')
      return
    }

    if (activeDrag.kind === 'quick') {
      const hasUnsavedDrafts = quickQuestionDrafts.value.some((draft) => !draft.id)
      if (hasUnsavedDrafts) {
        workspaceTab.value = 'quick'
        showNotice(
          'Порядок мини-тестов изменён локально. Сначала сохраните новые вопросы, чтобы закрепить его на сервере.',
        )
        return
      }

      const persistedIds = quickQuestionDrafts.value
        .filter((draft): draft is QuickQuestionDraft & { id: string } => Boolean(draft.id))
        .map((draft) => draft.id)

      if (persistedIds.length > 0) {
        await adminLearning.reorderQuickQuestions(persistedIds)
        await reloadLessonEditor()
      }

      workspaceTab.value = 'quick'
      showNotice('Порядок мини-тестов обновлён.')
      return
    }

    const hasUnsavedDrafts = finalQuestionDrafts.value.some((draft) => !draft.id)
    if (hasUnsavedDrafts) {
      workspaceTab.value = 'exam'
      showNotice(
        'Порядок вопросов изменён локально. Сначала сохраните новые вопросы, чтобы закрепить его на сервере.',
      )
      return
    }

    const persistedIds = finalQuestionDrafts.value
      .filter((draft): draft is FinalQuestionDraft & { id: string } => Boolean(draft.id))
      .map((draft) => draft.id)

    if (persistedIds.length > 0) {
      await adminLearning.reorderFinalQuizQuestions(persistedIds)
      await reloadLessonEditor()
    }

    workspaceTab.value = 'exam'
    showNotice('Порядок вопросов обновлён.')
  } catch (error) {
    if (activeDrag.kind === 'topic' || activeDrag.kind === 'lesson') {
      await reloadTopics(activeDrag.parentId ?? selectedTopicId.value)
    } else {
      await reloadLessonEditor()
      workspaceTab.value = activeDrag.kind === 'quick' ? 'quick' : 'exam'
    }

    if (activeDrag.kind === 'topic') {
      showNotice(error instanceof Error ? error.message : 'Не удалось изменить порядок тем.', 'error')
      return
    }

    if (activeDrag.kind === 'lesson') {
      showNotice(
        error instanceof Error ? error.message : 'Не удалось изменить порядок уроков.',
        'error',
      )
      return
    }

    if (activeDrag.kind === 'quick') {
      showNotice(
        error instanceof Error ? error.message : 'Не удалось изменить порядок мини-тестов.',
        'error',
      )
      return
    }

    showNotice(
      error instanceof Error ? error.message : 'Не удалось изменить порядок вопросов.',
      'error',
    )
  } finally {
    isCommittingDragOrder = false
    finishDrag()
  }
}

async function createTopic() {
  try {
    const created = await adminLearning.createTopic({
      title: `Новая тема ${topics.value.length + 1}`,
      description: 'Краткое описание темы.',
      orderIndex: topics.value.length + 1,
      difficulty: 1,
    })
    await reloadTopics(created.id)
    showNotice('Тема создана.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось создать тему.', 'error')
  }
}

async function saveTopic() {
  if (!selectedTopic.value) return
  if (!topicForm.title.trim()) {
    showNotice('Заполните название темы.', 'error')
    return
  }

  try {
    await adminLearning.updateTopic(selectedTopic.value.id, {
      title: topicForm.title.trim(),
      description: topicForm.description.trim(),
      difficulty: Number(topicForm.difficulty || selectedTopic.value.difficulty),
    })
    await reloadTopics(selectedTopic.value.id)
    showNotice('Тема сохранена.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось сохранить тему.', 'error')
  }
}

async function removeTopic() {
  if (!selectedTopic.value) return
  if (!window.confirm(`Удалить тему «${selectedTopic.value.title}» вместе с уроками?`)) {
    return
  }

  const currentTopicId = selectedTopic.value.id

  try {
    await adminLearning.deleteTopic(currentTopicId)
    await reloadTopics(topics.value.find((topic) => topic.id !== currentTopicId)?.id ?? '')
    showNotice('Тема удалена.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось удалить тему.', 'error')
  }
}

async function createLesson(lessonType: 'lesson' | 'final_exam') {
  if (!selectedTopic.value) {
    showNotice('Сначала выберите тему.', 'error')
    return
  }

  const lessonCount =
    selectedTopic.value.lessons.filter((lesson) => lesson.lesson_type === lessonType).length + 1
  const title =
    lessonType === 'lesson' ? `Новый урок ${lessonCount}` : `Финальный тест ${lessonCount}`

  try {
    const createdLesson = await adminLearning.createLesson(selectedTopic.value.id, {
      orderIndex: selectedTopic.value.lessons.length + 1,
      lessonType,
      title,
      summary: lessonType === 'lesson' ? 'Краткое описание урока.' : 'Итоговая аттестация по теме.',
      content:
        lessonType === 'lesson'
          ? '<p>Текст нового урока.</p>'
          : '<p>Описание финального теста.</p>',
      difficulty: 1,
      estimatedMinutes: 10,
    })

    selectedLessonId.value = createdLesson.id
    await reloadTopics(selectedTopic.value.id)
    await loadQuizForCurrentLesson()
    workspaceTab.value = lessonType === 'final_exam' ? 'exam' : 'lesson'
    showNotice(lessonType === 'lesson' ? 'Урок создан.' : 'Финальный экзамен создан.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось создать урок.', 'error')
  }
}

async function saveLesson() {
  if (!selectedLesson.value) return
  if (!lessonForm.title.trim()) {
    showNotice('Заполните название урока.', 'error')
    return
  }
  if (!lessonForm.content.trim()) {
    showNotice('Заполните содержимое урока.', 'error')
    return
  }

  try {
    await adminLearning.updateLesson(selectedLesson.value.id, {
      lessonType: lessonForm.lessonType,
      title: lessonForm.title.trim(),
      summary: lessonForm.summary.trim(),
      content: lessonForm.content.trim(),
      difficulty: Number(lessonForm.difficulty || selectedLesson.value.difficulty),
      estimatedMinutes: Number(
        lessonForm.estimatedMinutes || selectedLesson.value.estimated_minutes,
      ),
    })
    await reloadTopics(selectedTopicId.value)
    await loadQuizForCurrentLesson()
    showNotice('Урок сохранён.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось сохранить урок.', 'error')
  }
}

async function removeLesson() {
  if (!selectedLesson.value || !selectedTopic.value) return
  if (!window.confirm(`Удалить урок «${selectedLesson.value.title}»?`)) {
    return
  }

  try {
    await adminLearning.deleteLesson(selectedLesson.value.id)
    clearLessonSelection()
    await reloadTopics(selectedTopic.value.id)
    showNotice('Урок удалён.')
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Не удалось удалить урок.', 'error')
  }
}

function addQuickQuestionDraft() {
  const draft = createEmptyQuickQuestionDraft(nextQuickQuestionOrder())
  quickQuestionDrafts.value.push(draft)
  expandedQuickDraftKey.value = draft.draftKey
  workspaceTab.value = 'quick'
}

async function saveQuickQuestion(draft: QuickQuestionDraft) {
  if (!selectedLesson.value) return

  const validationMessage = validateQuickQuestionDraft(draft)
  if (validationMessage) {
    showNotice(validationMessage, 'error')
    return
  }

  try {
    if (draft.id) {
      await adminLearning.updateQuickQuestion(draft.id, buildQuickQuestionPayload(draft))
    } else {
      await adminLearning.createQuickQuestion(
        selectedLesson.value.id,
        buildQuickQuestionPayload(draft),
      )
    }
    await reloadLessonEditor()
    workspaceTab.value = 'quick'
    showNotice('Вопрос мини-теста сохранён.')
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось сохранить вопрос мини-теста.',
      'error',
    )
  }
}

async function removeQuickQuestion(draft: QuickQuestionDraft) {
  if (!selectedLesson.value) return

  if (!draft.id) {
    quickQuestionDrafts.value = quickQuestionDrafts.value.filter(
      (item) => item.draftKey !== draft.draftKey,
    )
    if (expandedQuickDraftKey.value === draft.draftKey) {
      expandedQuickDraftKey.value = ''
    }
    return
  }

  if (!window.confirm('Удалить вопрос мини-теста?')) {
    return
  }

  try {
    await adminLearning.deleteQuickQuestion(draft.id)
    await reloadLessonEditor()
    workspaceTab.value = 'quick'
    showNotice('Вопрос мини-теста удалён.')
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось удалить вопрос мини-теста.',
      'error',
    )
  }
}

async function saveFinalExam() {
  if (!selectedLesson.value) return
  if (!lessonForm.title.trim()) {
    showNotice('Заполните название финального экзамена.', 'error')
    return
  }

  try {
    await adminLearning.updateLesson(selectedLesson.value.id, {
      lessonType: 'final_exam',
      title: lessonForm.title.trim(),
      summary: lessonForm.summary.trim(),
      difficulty: Number(lessonForm.difficulty || selectedLesson.value.difficulty),
      estimatedMinutes: Number(
        lessonForm.estimatedMinutes || selectedLesson.value.estimated_minutes,
      ),
    })
    await reloadLessonEditor()
    workspaceTab.value = 'exam'
    showNotice('Финальный экзамен сохранён.')
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось сохранить финальный экзамен.',
      'error',
    )
  }
}

function addFinalQuestionDraft() {
  const draft = createEmptyFinalQuestionDraft(nextFinalQuestionOrder())
  finalQuestionDrafts.value.push(draft)
  expandedFinalDraftKey.value = draft.draftKey
  workspaceTab.value = 'exam'
}

async function saveFinalQuestion(draft: FinalQuestionDraft) {
  if (!selectedFinalQuiz.value) return

  const validationMessage = validateFinalQuestionDraft(draft)
  if (validationMessage) {
    showNotice(validationMessage, 'error')
    return
  }

  try {
    if (draft.id) {
      await adminLearning.updateFinalQuizQuestion(draft.id, buildFinalQuestionPayload(draft))
    } else {
      await adminLearning.createFinalQuizQuestion(
        selectedFinalQuiz.value.id,
        buildFinalQuestionPayload(draft),
      )
    }
    await reloadLessonEditor()
    workspaceTab.value = 'exam'
    showNotice('Вопрос финального теста сохранён.')
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось сохранить вопрос финального теста.',
      'error',
    )
  }
}

async function removeFinalQuestion(draft: FinalQuestionDraft) {
  if (!selectedFinalQuiz.value) return

  if (!draft.id) {
    finalQuestionDrafts.value = finalQuestionDrafts.value.filter(
      (item) => item.draftKey !== draft.draftKey,
    )
    if (expandedFinalDraftKey.value === draft.draftKey) {
      expandedFinalDraftKey.value = ''
    }
    return
  }

  if (!window.confirm('Удалить вопрос финального теста?')) {
    return
  }

  try {
    await adminLearning.deleteFinalQuizQuestion(draft.id)
    await reloadLessonEditor()
    workspaceTab.value = 'exam'
    showNotice('Вопрос финального теста удалён.')
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось удалить вопрос финального теста.',
      'error',
    )
  }
}

function lessonTypeLabel(value: 'lesson' | 'final_exam') {
  return value === 'lesson' ? 'Урок' : 'Финальный экзамен'
}

function lessonMetaLabel() {
  if (!selectedLessonSummary.value) return ''
  if (selectedLessonSummary.value.lesson_type === 'lesson') {
    return `${selectedLessonSummary.value._count.lesson_quick_questions} мини-тестов`
  }
  return `${selectedLessonSummary.value._count.quizzes} финальных тестов`
}

onMounted(async () => {
  try {
    await reloadTopics()
  } catch (error) {
    showNotice(
      error instanceof Error ? error.message : 'Не удалось загрузить конструктор.',
      'error',
    )
  }
})
</script>

<template>
  <section class="admin-builder">
    <header class="admin-builder__header">
      <div class="admin-builder__header-copy">
        <p class="admin-builder__eyebrow">Finity Admin</p>
        <h1 class="admin-builder__title">Конструктор обучения</h1>
        <p class="admin-builder__subtitle">
          Здесь вы можете управлять структурой курса, уроками, мини-тестами и финальными экзаменами.
        </p>
      </div>

      <Button type="button" class="admin-builder__header-action" @click="createTopic">
        <Plus />
        Новая тема
      </Button>
    </header>

    <div
      v-if="noticeText || adminLearning.error"
      class="admin-builder__notice"
      :class="{
        'admin-builder__notice--error': noticeTone === 'error' || !!adminLearning.error,
        'admin-builder__notice--success': noticeTone === 'success' && !adminLearning.error,
      }"
    >
      {{ adminLearning.error || noticeText }}
    </div>

    <div class="admin-builder__shell">
      <Card class="admin-builder__outline-card">
        <header class="admin-builder__outline-head">
          <div class="admin-builder__section-title-wrap">
            <FolderKanban class="admin-builder__section-icon" />
            <div>
              <h2 class="admin-builder__section-title">Структура</h2>
              <p class="admin-builder__section-note">
                {{
                  normalizedStructureSearch
                    ? `${filteredTopics.length} из ${topics.length} тем`
                    : `${topics.length} тем`
                }}
              </p>
            </div>
          </div>

          <div class="admin-builder__outline-search">
            <Input v-model="structureSearchInput" placeholder="Поиск по темам, урокам и тестам" />
          </div>
        </header>

        <div
          v-if="adminLearning.isLoading && topics.length === 0"
          class="admin-builder__outline-state"
        >
          Загружаю структуру...
        </div>
        <div v-else-if="topics.length === 0" class="admin-builder__outline-state">
          Создайте первую тему.
        </div>
        <div v-else-if="filteredTopics.length === 0" class="admin-builder__outline-state">
          По этому запросу ничего не найдено.
        </div>

        <TransitionGroup v-else name="admin-builder__topic" tag="div" class="admin-builder__outline-list">
          <section
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="admin-builder__topic-block"
            :class="{ 'admin-builder__topic-block--active': selectedTopicId === topic.id }"
            @dragover.prevent="handleDragOver('topic', topic.id, $event)"
            @dragenter.prevent
            @drop.prevent="commitDragOrder"
          >
            <div class="admin-builder__topic-row">
              <button
                type="button"
                class="admin-builder__drag-handle"
                :disabled="isStructureDragDisabled"
                :draggable="!isStructureDragDisabled"
                @dragstart.stop="startDrag('topic', topic.id)"
                @dragend="commitDragOrder"
              >
                <GripVertical />
              </button>

              <button
                type="button"
                class="admin-builder__topic-button"
                :class="{
                  'admin-builder__topic-button--drop-target': isDragDropTarget('topic', topic.id),
                }"
                @click="selectTopic(topic.id)"
              >
                <div class="admin-builder__topic-copy">
                  <strong class="admin-builder__topic-title">{{ topic.title }}</strong>
                </div>
                <span class="admin-builder__topic-count">{{ topic.lessons.length }}</span>
              </button>

              <button
                type="button"
                class="admin-builder__topic-toggle"
                :aria-label="isTopicExpanded(topic.id) ? 'Свернуть тему' : 'Развернуть тему'"
                @click.stop="toggleTopicExpansion(topic.id)"
              >
                <ChevronDown
                  class="admin-builder__topic-toggle-chevron"
                  :class="{
                    'admin-builder__topic-toggle-chevron--open': isTopicExpanded(topic.id),
                  }"
                />
              </button>
            </div>

            <TransitionGroup
              v-if="isTopicExpanded(topic.id)"
              name="admin-builder__lesson"
              tag="div"
              class="admin-builder__lesson-list"
            >
              <div
                v-for="lesson in topic.lessons"
                :key="lesson.id"
                class="admin-builder__lesson-row"
                @dragover.prevent="handleDragOver('lesson', lesson.id, $event, topic.id)"
                @dragenter.prevent
                @drop.prevent="commitDragOrder"
              >
                <button
                  type="button"
                  class="admin-builder__drag-handle admin-builder__drag-handle--lesson"
                  :disabled="isStructureDragDisabled"
                  :draggable="!isStructureDragDisabled"
                  @dragstart.stop="startDrag('lesson', lesson.id, topic.id)"
                  @dragend="commitDragOrder"
                >
                  <GripVertical />
                </button>

                <button
                  type="button"
                  class="admin-builder__lesson-button"
                  :class="{
                    'admin-builder__lesson-button--active': selectedLessonId === lesson.id,
                    'admin-builder__lesson-button--drop-target': isDragDropTarget(
                      'lesson',
                      lesson.id,
                      topic.id,
                    ),
                  }"
                  @click="selectLesson(topic.id, lesson.id)"
                >
                  <span class="admin-builder__lesson-type">{{
                    lessonTypeLabel(lesson.lesson_type)
                  }}</span>
                  <div class="admin-builder__lesson-copy">
                    <strong class="admin-builder__lesson-title">{{ lesson.title }}</strong>
                    <span
                      v-if="lesson.lesson_type === 'final_exam' && lesson.quizzes[0]?.title"
                      class="admin-builder__lesson-meta"
                    >
                      {{ lesson.quizzes[0].title }}
                    </span>
                  </div>
                </button>
              </div>
            </TransitionGroup>
          </section>
        </TransitionGroup>
      </Card>

      <Card class="admin-builder__workspace-card">
        <header class="admin-builder__workspace-head">
          <div class="admin-builder__workspace-copy">
            <p class="admin-builder__workspace-label">
              {{ selectedLesson ? lessonTypeLabel(selectedLesson.lesson_type) : 'Тема' }}
            </p>
            <h2 class="admin-builder__workspace-title">
              {{ selectedLesson?.title ?? selectedTopic?.title ?? 'Выберите тему слева' }}
            </h2>
            <p class="admin-builder__workspace-subtitle">
              {{
                selectedLesson
                  ? lessonMetaLabel()
                  : (selectedTopic?.description ?? 'Справа появится редактор выбранного элемента.')
              }}
            </p>
          </div>

          <div class="admin-builder__workspace-actions">
            <template v-if="workspaceTab === 'topic' && selectedTopic">
              <Button
                type="button"
                variant="outline"
                :disabled="adminLearning.isSaving"
                @click="saveTopic"
              >
                <Save />
                Сохранить тему
              </Button>
              <Button
                type="button"
                variant="destructive"
                :disabled="adminLearning.isSaving"
                @click="removeTopic"
              >
                <Trash2 />
                Удалить
              </Button>
            </template>

            <template v-else-if="workspaceTab === 'lesson' && selectedLesson">
              <Button
                type="button"
                variant="outline"
                :disabled="adminLearning.isSaving"
                @click="saveLesson"
              >
                <Save />
                Сохранить урок
              </Button>
              <Button
                type="button"
                variant="destructive"
                :disabled="adminLearning.isSaving"
                @click="removeLesson"
              >
                <Trash2 />
                Удалить
              </Button>
            </template>

            <template v-else-if="workspaceTab === 'exam' && selectedLesson">
              <Button
                type="button"
                variant="outline"
                :disabled="adminLearning.isSaving"
                @click="saveFinalExam"
              >
                <Save />
                Сохранить экзамен
              </Button>
              <Button
                type="button"
                variant="destructive"
                :disabled="adminLearning.isSaving"
                @click="removeLesson"
              >
                <Trash2 />
                Удалить
              </Button>
            </template>
          </div>
        </header>

        <div class="admin-builder__workspace-tabs" v-if="selectedTopic">
          <button
            type="button"
            class="admin-builder__workspace-tab"
            :class="{ 'admin-builder__workspace-tab--active': workspaceTab === 'topic' }"
            @click="setWorkspaceTab('topic')"
          >
            Тема
          </button>
          <button
            v-if="selectedLesson && !isFinalExamLesson"
            type="button"
            class="admin-builder__workspace-tab"
            :class="{ 'admin-builder__workspace-tab--active': workspaceTab === 'lesson' }"
            @click="setWorkspaceTab('lesson')"
          >
            Материал
          </button>
          <button
            v-if="isRegularLesson"
            type="button"
            class="admin-builder__workspace-tab"
            :class="{ 'admin-builder__workspace-tab--active': workspaceTab === 'quick' }"
            @click="setWorkspaceTab('quick')"
          >
            Мини-тесты
          </button>
          <button
            v-if="isFinalExamLesson"
            type="button"
            class="admin-builder__workspace-tab"
            :class="{ 'admin-builder__workspace-tab--active': workspaceTab === 'exam' }"
            @click="setWorkspaceTab('exam')"
          >
            Финальный тест
          </button>
        </div>

        <div v-if="!selectedTopic" class="admin-builder__empty-state">
          Выберите тему слева или создайте новую, чтобы открыть рабочее пространство.
        </div>

        <div v-else class="admin-builder__panel">
          <section v-if="workspaceTab === 'topic'" class="admin-builder__panel-section">
            <div class="admin-builder__field-grid admin-builder__field-grid--topic">
              <div class="admin-builder__field">
                <Label>Название темы</Label>
                <Input v-model="topicForm.title" />
              </div>
              <div class="admin-builder__field admin-builder__field--small">
                <Label>Сложность темы</Label>
                <Select v-model="topicForm.difficulty">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="admin-builder__field admin-builder__field--full">
                <Label>Описание темы</Label>
                <Textarea v-model="topicForm.description" rows="4" />
              </div>
            </div>

            <div class="admin-builder__panel-actions">
              <Button type="button" variant="outline" @click="createLesson('lesson')">
                <Plus />
                Добавить урок
              </Button>
              <Button type="button" variant="outline" @click="createLesson('final_exam')">
                <GraduationCap />
                Добавить финальный экзамен
              </Button>
            </div>
          </section>

          <section
            v-else-if="workspaceTab === 'lesson' && selectedLesson"
            class="admin-builder__panel-section"
          >
            <div class="admin-builder__field-grid admin-builder__field-grid--lesson">
              <div class="admin-builder__field">
                <Label>Название урока</Label>
                <Input v-model="lessonForm.title" />
              </div>

              <div class="admin-builder__field admin-builder__field--small">
                <Label>Тип</Label>
                <Select v-model="lessonForm.lessonType">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Обычный урок</SelectItem>
                    <SelectItem value="final_exam">Финальный экзамен</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="admin-builder__field admin-builder__field--small">
                <Label>Сложность</Label>
                <Select v-model="lessonForm.difficulty">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="admin-builder__field admin-builder__field--small">
                <Label>Минуты</Label>
                <Input v-model="lessonForm.estimatedMinutes" type="number" min="1" max="600" />
              </div>

              <div class="admin-builder__field admin-builder__field--full">
                <Label>Краткое описание</Label>
                <Textarea v-model="lessonForm.summary" rows="4" />
              </div>

              <div class="admin-builder__field admin-builder__field--full">
                <Label>Содержимое урока</Label>
                <LessonRichEditor
                  v-model="lessonForm.content"
                  :disabled="adminLearning.isSaving"
                  :upload-image="adminLearning.uploadLessonImage"
                />
              </div>
            </div>
          </section>

          <section
            v-else-if="workspaceTab === 'quick' && isRegularLesson"
            class="admin-builder__panel-section"
          >
            <div class="admin-builder__panel-topline">
              <div>
                <h3 class="admin-builder__panel-title">Мини-тесты</h3>
                <p class="admin-builder__panel-note">
                  Каждый вопрос раскрывается только по запросу.
                </p>
              </div>
              <Button type="button" variant="outline" @click="addQuickQuestionDraft">
                <Plus />
                Добавить вопрос
              </Button>
            </div>

            <div
              v-if="quickQuestionDrafts.length === 0"
              class="admin-builder__empty-state admin-builder__empty-state--inner"
            >
              У этого урока пока нет вопросов мини-теста.
            </div>

            <TransitionGroup v-else name="admin-builder__collapse" tag="div" class="admin-builder__collapse-list">
              <article
                v-for="(draft, index) in quickQuestionDrafts"
                :key="draft.draftKey"
                class="admin-builder__collapse-item"
                @dragover.prevent="handleDragOver('quick', draft.draftKey, $event)"
                @dragenter.prevent
                @drop.prevent="commitDragOrder"
              >
                <button
                  type="button"
                  class="admin-builder__collapse-trigger"
                  :class="{
                    'admin-builder__collapse-trigger--drop-target': isDragDropTarget(
                      'quick',
                      draft.draftKey,
                    ),
                  }"
                  @click="toggleQuickDraft(draft.draftKey)"
                >
                  <span
                    class="admin-builder__drag-handle admin-builder__drag-handle--inline"
                    draggable="true"
                    @dragstart.stop="startDrag('quick', draft.draftKey)"
                    @dragend="commitDragOrder"
                  >
                    <GripVertical />
                  </span>
                  <div class="admin-builder__collapse-copy">
                    <span class="admin-builder__collapse-index">Вопрос {{ index + 1 }}</span>
                    <strong class="admin-builder__collapse-title">{{
                      questionPreview(draft.text)
                    }}</strong>
                    <span class="admin-builder__collapse-meta"
                      >{{ draft.answers.length }} вариантов ответа</span
                    >
                  </div>
                  <ChevronDown
                    class="admin-builder__collapse-chevron"
                    :class="{
                      'admin-builder__collapse-chevron--open':
                        expandedQuickDraftKey === draft.draftKey,
                    }"
                  />
                </button>

                <div
                  v-if="expandedQuickDraftKey === draft.draftKey"
                  class="admin-builder__collapse-body"
                >
                  <AdminQuickQuestionEditor
                    :draft="draft"
                    :disabled="adminLearning.isSaving"
                    @save="saveQuickQuestion(draft)"
                    @delete="removeQuickQuestion(draft)"
                  />
                </div>
              </article>
            </TransitionGroup>
          </section>

          <section
            v-else-if="workspaceTab === 'exam' && isFinalExamLesson"
            class="admin-builder__panel-section"
          >
            <div
              v-if="!selectedFinalQuiz"
              class="admin-builder__empty-state admin-builder__empty-state--inner"
            >
              Подготавливаю структуру финального экзамена...
            </div>

            <template v-else-if="examPanelMode === 'edit'">
              <div class="admin-builder__field-grid admin-builder__field-grid--lesson">
                <div class="admin-builder__field">
                  <Label>Название экзамена</Label>
                  <Input v-model="lessonForm.title" />
                </div>

                <div class="admin-builder__field admin-builder__field--small">
                  <Label>Сложность</Label>
                  <Select v-model="lessonForm.difficulty">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="admin-builder__field admin-builder__field--small">
                  <Label>Минуты</Label>
                  <Input v-model="lessonForm.estimatedMinutes" type="number" min="1" max="600" />
                </div>

                <div class="admin-builder__field admin-builder__field--full">
                  <Label>Краткое описание</Label>
                  <Textarea v-model="lessonForm.summary" rows="4" />
                </div>
              </div>

              <div class="admin-builder__panel-topline">
                <div>
                  <h3 class="admin-builder__panel-title">Вопросы финального экзамена</h3>
                  <p class="admin-builder__panel-note">
                    Меняйте порядок перетаскиванием за ручку слева.
                  </p>
                </div>

                <div class="admin-builder__panel-actions">
                  <Button type="button" variant="outline" @click="examPanelMode = 'preview'">
                    <Eye />
                    Предпросмотр
                  </Button>
                  <Button type="button" variant="outline" @click="addFinalQuestionDraft">
                    <Plus />
                    Добавить вопрос
                  </Button>
                </div>
              </div>

              <div
                v-if="finalQuestionDrafts.length === 0"
                class="admin-builder__empty-state admin-builder__empty-state--inner"
              >
                В финальном тесте пока нет вопросов.
              </div>

              <TransitionGroup v-else name="admin-builder__collapse" tag="div" class="admin-builder__collapse-list">
                <article
                  v-for="(draft, index) in finalQuestionDrafts"
                  :key="draft.draftKey"
                  class="admin-builder__collapse-item"
                  @dragover.prevent="handleDragOver('final', draft.draftKey, $event)"
                  @dragenter.prevent
                  @drop.prevent="commitDragOrder"
                >
                  <button
                    type="button"
                    class="admin-builder__collapse-trigger"
                    :class="{
                      'admin-builder__collapse-trigger--drop-target': isDragDropTarget(
                        'final',
                        draft.draftKey,
                      ),
                    }"
                    @click="toggleFinalDraft(draft.draftKey)"
                  >
                    <span
                      class="admin-builder__drag-handle admin-builder__drag-handle--inline"
                      draggable="true"
                      @dragstart.stop="startDrag('final', draft.draftKey)"
                      @dragend="commitDragOrder"
                    >
                      <GripVertical />
                    </span>
                    <div class="admin-builder__collapse-copy">
                      <span class="admin-builder__collapse-index">Вопрос {{ index + 1 }}</span>
                      <strong class="admin-builder__collapse-title">{{
                        questionPreview(draft.text)
                      }}</strong>
                      <span class="admin-builder__collapse-meta">{{
                        finalQuestionTypeLabel(draft.qType)
                      }}</span>
                    </div>
                    <ChevronDown
                      class="admin-builder__collapse-chevron"
                      :class="{
                        'admin-builder__collapse-chevron--open':
                          expandedFinalDraftKey === draft.draftKey,
                      }"
                    />
                  </button>

                  <div
                    v-if="expandedFinalDraftKey === draft.draftKey"
                    class="admin-builder__collapse-body"
                  >
                    <AdminFinalQuestionEditor
                      :draft="draft"
                      :disabled="adminLearning.isSaving"
                      @save="saveFinalQuestion(draft)"
                      @delete="removeFinalQuestion(draft)"
                    />
                  </div>
                </article>
              </TransitionGroup>
            </template>

            <template v-else>
              <div class="admin-builder__panel-topline">
                <div>
                  <h3 class="admin-builder__panel-title">Предпросмотр финального экзамена</h3>
                  <p class="admin-builder__panel-note">
                    Здесь показано, как тест увидит пользователь.
                  </p>
                </div>

                <Button type="button" variant="outline" @click="examPanelMode = 'edit'">
                  Вернуться к редактированию
                </Button>
              </div>

              <AdminFinalQuizPreview
                :title="lessonForm.title.trim() || 'Новый финальный тест'"
                :summary="lessonForm.summary.trim()"
                :estimated-minutes="Number(lessonForm.estimatedMinutes || 10)"
                :difficulty="Number(lessonForm.difficulty || 1)"
                :questions="finalQuestionDrafts"
              />
            </template>
          </section>
        </div>
      </Card>
    </div>
  </section>
</template>

<style scoped>
.admin-builder {
  --admin-surface: hsl(220 33% 99%);
  --admin-border-strong: hsl(214 38% 86%);
  --admin-accent: hsl(214 78% 58%);
  display: grid;
  gap: 16px;
}

.admin-builder__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-builder__header-copy {
  display: grid;
  gap: 4px;
}

.admin-builder__eyebrow {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--muted-foreground));
}

.admin-builder__title {
  margin: 0;
  font-size: clamp(30px, 3.5vw, 40px);
  line-height: 1.05;
}

.admin-builder__subtitle {
  margin: 0;
  max-width: 760px;
  color: hsl(var(--muted-foreground));
}

.admin-builder__header-action {
  flex-shrink: 0;
}

.admin-builder__notice {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid hsl(var(--border));
}

.admin-builder__notice--success {
  background: hsl(151 72% 95%);
  border-color: hsl(151 42% 78%);
  color: hsl(151 62% 25%);
}

.admin-builder__notice--error {
  background: hsl(0 82% 96%);
  border-color: hsl(0 56% 83%);
  color: hsl(0 58% 36%);
}

.admin-builder__shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.admin-builder__outline-card,
.admin-builder__workspace-card {
  padding: 0;
  border-radius: 18px;
  overflow: hidden;
}

.admin-builder__outline-card {
  position: sticky;
  top: 18px;
}

.admin-builder__outline-head,
.admin-builder__workspace-head {
  padding: 18px 18px 14px;
  border-bottom: 1px solid hsl(var(--border));
}

.admin-builder__outline-head {
  display: grid;
  gap: 14px;
}

.admin-builder__section-title-wrap {
  display: inline-flex;
  align-items: flex-start;
  gap: 10px;
}

.admin-builder__section-icon {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}

.admin-builder__section-title,
.admin-builder__workspace-title,
.admin-builder__panel-title {
  margin: 0;
  line-height: 1.1;
}

.admin-builder__section-title {
  font-size: 20px;
}

.admin-builder__section-note,
.admin-builder__workspace-label,
.admin-builder__workspace-subtitle,
.admin-builder__panel-note,
.admin-builder__collapse-index,
.admin-builder__collapse-meta {
  margin: 0;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.admin-builder__outline-list {
  display: grid;
  gap: 10px;
  padding: 14px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.admin-builder__topic-block {
  display: grid;
  gap: 8px;
  padding: 8px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid transparent;
}

.admin-builder__topic-block--active {
  background: hsl(214 100% 98%);
  border-color: hsl(214 72% 86%);
}

.admin-builder__topic-button,
.admin-builder__topic-toggle,
.admin-builder__lesson-button,
.admin-builder__workspace-tab,
.admin-builder__collapse-trigger {
  border: 0;
  background: transparent;
}

.admin-builder__topic-button,
.admin-builder__topic-toggle,
.admin-builder__lesson-button,
.admin-builder__collapse-trigger {
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.admin-builder__outline-search {
  display: grid;
}

.admin-builder__topic-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  gap: 8px;
  align-items: center;
}

.admin-builder__lesson-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.admin-builder__drag-handle {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: grab;
}

.admin-builder__drag-handle:hover {
  background: hsl(var(--accent));
}

.admin-builder__drag-handle:active {
  cursor: grabbing;
}

.admin-builder__drag-handle:disabled {
  cursor: default;
  opacity: 0.5;
}

.admin-builder__drag-handle :deep(svg) {
  width: 16px;
  height: 16px;
}

.admin-builder__topic-button {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 12px;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.admin-builder__topic-button--drop-target,
.admin-builder__lesson-button--drop-target {
  background: hsl(214 100% 97%);
  box-shadow: inset 0 0 0 1px hsl(214 70% 82%);
}

.admin-builder__topic-toggle {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
}

.admin-builder__topic-toggle:hover {
  background: hsl(var(--accent));
}

.admin-builder__topic-toggle-chevron {
  width: 16px;
  height: 16px;
  transition: transform 0.18s ease;
}

.admin-builder__topic-toggle-chevron--open {
  transform: rotate(180deg);
}

.admin-builder__topic-copy,
.admin-builder__lesson-list,
.admin-builder__lesson-copy,
.admin-builder__workspace-copy,
.admin-builder__collapse-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.admin-builder__topic-title,
.admin-builder__lesson-title,
.admin-builder__collapse-title {
  font-size: 15px;
  line-height: 1.2;
}

.admin-builder__topic-count,
.admin-builder__lesson-type {
  min-height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
}

.admin-builder__lesson-button {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.admin-builder__lesson-list {
  padding-left: 0;
  gap: 8px;
}

.admin-builder__lesson-button:hover {
  background: hsl(var(--accent));
}

.admin-builder__lesson-button--active {
  background: hsl(var(--background));
  border-color: hsl(214 70% 82%);
}

.admin-builder__lesson-meta {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.admin-builder__workspace-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-builder__workspace-copy {
  min-width: 0;
  flex: 1;
}

.admin-builder__workspace-label {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.admin-builder__workspace-title {
  font-size: clamp(24px, 3vw, 32px);
}

.admin-builder__workspace-actions,
.admin-builder__panel-actions,
.admin-builder__workspace-tabs,
.admin-builder__panel-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-builder__workspace-tabs {
  padding: 14px 18px 0;
}

.admin-builder__workspace-actions {
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: flex-end;
}

.admin-builder__workspace-tab {
  min-height: 36px;
  border-radius: 999px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
}

.admin-builder__workspace-tab--active {
  background: hsl(214 100% 97%);
  color: hsl(214 62% 36%);
  box-shadow: inset 0 0 0 1px hsl(214 74% 84%);
}

.admin-builder__panel {
  padding: 18px;
}

.admin-builder__panel-section {
  display: grid;
  gap: 18px;
}

.admin-builder__panel-topline {
  align-items: center;
  justify-content: space-between;
}

.admin-builder__field-grid {
  display: grid;
  gap: 14px;
}

.admin-builder__field-grid--topic {
  grid-template-columns: minmax(0, 1fr) 140px;
}

.admin-builder__field-grid--lesson {
  grid-template-columns: minmax(0, 1fr) 180px 140px 140px;
}

.admin-builder__field {
  display: grid;
  gap: 8px;
}

.admin-builder__field--small {
  align-content: start;
}

.admin-builder__field--full {
  grid-column: 1 / -1;
}

.admin-builder__collapse-list {
  display: grid;
  gap: 10px;
}

.admin-builder__collapse-item,
.admin-builder__outline-state,
.admin-builder__empty-state {
  border: 1px solid hsl(var(--border));
  border-radius: 16px;
  background: hsl(var(--background));
}

.admin-builder__collapse-trigger {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.admin-builder__collapse-trigger--drop-target {
  background: hsl(214 100% 97%);
}

.admin-builder__collapse-chevron {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.admin-builder__collapse-chevron--open {
  transform: rotate(180deg);
}

.admin-builder__collapse-body {
  padding: 0 16px 16px;
}

.admin-builder__outline-state,
.admin-builder__empty-state {
  padding: 18px;
  color: hsl(var(--muted-foreground));
}

.admin-builder__empty-state--inner {
  padding: 20px;
  background: var(--admin-surface);
}

.admin-builder__topic-move,
.admin-builder__lesson-move,
.admin-builder__collapse-move {
  transition: transform 0.2s ease;
}

@media (max-width: 1180px) {
  .admin-builder__shell {
    grid-template-columns: 1fr;
  }

  .admin-builder__outline-card {
    position: static;
  }

  .admin-builder__outline-list {
    max-height: none;
  }
}

@media (max-width: 860px) {
  .admin-builder__header,
  .admin-builder__workspace-head,
  .admin-builder__panel-topline {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-builder__field-grid--topic,
  .admin-builder__field-grid--lesson {
    grid-template-columns: 1fr;
  }

  .admin-builder__workspace-tabs {
    overflow-x: auto;
    padding-bottom: 4px;
  }
}
</style>
