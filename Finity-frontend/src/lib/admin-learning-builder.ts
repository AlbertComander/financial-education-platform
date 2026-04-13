import type {
  AdminFinalQuizQuestion,
  AdminFinalQuizQuestionPayload,
  AdminQuickQuestion,
  AdminQuickQuestionPayload,
} from '@/types/admin-learning'

export type QuickAnswerDraft = {
  localId: string
  text: string
  isCorrect: boolean
  feedbackText: string
}

export type QuickQuestionDraft = {
  draftKey: string
  id?: string
  text: string
  orderIndex: number
  answers: QuickAnswerDraft[]
}

export type FinalChoiceAnswerDraft = {
  localId: string
  text: string
  isCorrect: boolean
}

export type FinalSequenceItemDraft = {
  localId: string
  text: string
}

export type FinalMatchingPairDraft = {
  localId: string
  leftText: string
  rightText: string
}

export type FinalQuestionDraft = {
  draftKey: string
  id?: string
  text: string
  qType: 'single' | 'multiple' | 'open' | 'sequence' | 'matching'
  orderIndex: number
  choiceAnswers: FinalChoiceAnswerDraft[]
  openAcceptedAnswersText: string
  openCaseSensitive: boolean
  openTrim: boolean
  openCollapseSpaces: boolean
  sequenceItems: FinalSequenceItemDraft[]
  matchingPairs: FinalMatchingPairDraft[]
}

function makeId() {
  return crypto.randomUUID()
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

export function createEmptyQuickQuestionDraft(orderIndex = 1): QuickQuestionDraft {
  return {
    draftKey: makeId(),
    text: '',
    orderIndex,
    answers: [
      { localId: makeId(), text: '', isCorrect: true, feedbackText: '' },
      { localId: makeId(), text: '', isCorrect: false, feedbackText: '' },
    ],
  }
}

export function quickQuestionDraftFromEntity(question: AdminQuickQuestion): QuickQuestionDraft {
  return {
    draftKey: makeId(),
    id: question.id,
    text: question.text,
    orderIndex: question.order_index,
    answers: question.lesson_quick_answers.map((answer) => ({
      localId: answer.id,
      text: answer.text,
      isCorrect: answer.is_correct,
      feedbackText: answer.feedback_text,
    })),
  }
}

export function buildQuickQuestionPayload(
  draft: QuickQuestionDraft,
): AdminQuickQuestionPayload {
  return {
    text: draft.text.trim(),
    orderIndex: draft.orderIndex,
    answers: draft.answers.map((answer) => ({
      text: answer.text.trim(),
      isCorrect: answer.isCorrect,
      feedbackText: answer.feedbackText.trim(),
    })),
  }
}

export function validateQuickQuestionDraft(draft: QuickQuestionDraft) {
  if (!draft.text.trim()) {
    return 'Заполните текст вопроса мини-теста.'
  }

  if (draft.answers.length < 2) {
    return 'У мини-теста должно быть минимум два варианта ответа.'
  }

  if (draft.answers.some((answer) => !answer.text.trim())) {
    return 'Заполните текст каждого варианта ответа мини-теста.'
  }

  const correctCount = draft.answers.filter((answer) => answer.isCorrect).length
  if (correctCount !== 1) {
    return 'У мини-теста должен быть ровно один правильный ответ.'
  }

  return ''
}

export function createEmptyFinalQuestionDraft(orderIndex = 1): FinalQuestionDraft {
  return {
    draftKey: makeId(),
    text: '',
    qType: 'single',
    orderIndex,
    choiceAnswers: [
      { localId: makeId(), text: '', isCorrect: true },
      { localId: makeId(), text: '', isCorrect: false },
    ],
    openAcceptedAnswersText: '',
    openCaseSensitive: false,
    openTrim: true,
    openCollapseSpaces: true,
    sequenceItems: [
      { localId: makeId(), text: '' },
      { localId: makeId(), text: '' },
    ],
    matchingPairs: [
      { localId: makeId(), leftText: '', rightText: '' },
      { localId: makeId(), leftText: '', rightText: '' },
    ],
  }
}

export function finalQuestionDraftFromEntity(
  question: AdminFinalQuizQuestion,
): FinalQuestionDraft {
  const config = toObject(question.config_json)

  const draft = createEmptyFinalQuestionDraft(question.order_index)
  draft.id = question.id
  draft.text = question.text
  draft.qType = question.q_type

  if (question.q_type === 'single' || question.q_type === 'multiple') {
    draft.choiceAnswers = question.answers.map((answer) => ({
      localId: answer.id,
      text: answer.text,
      isCorrect: answer.is_correct,
    }))
    return draft
  }

  if (question.q_type === 'open') {
    draft.openAcceptedAnswersText = toStringArray(config.acceptedAnswers).join('\n')
    draft.openCaseSensitive = config.caseSensitive === true
    draft.openTrim = config.trim !== false
    draft.openCollapseSpaces = config.collapseSpaces !== false
    return draft
  }

  if (question.q_type === 'sequence') {
    const rawItems = Array.isArray(config.items) ? config.items : []
    draft.sequenceItems = rawItems
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null
        const source = item as Record<string, unknown>
        const id = typeof source.id === 'string' ? source.id : makeId()
        const text = typeof source.text === 'string' ? source.text : ''
        return { localId: id, text }
      })
      .filter((item): item is FinalSequenceItemDraft => item !== null)
    return draft
  }

  const rawLeft = Array.isArray(config.leftItems) ? config.leftItems : []
  const rawPairs = Array.isArray(config.correctPairs) ? config.correctPairs : []
  const rightById = new Map<string, string>()

  if (Array.isArray(config.rightItems)) {
    for (const item of config.rightItems) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const source = item as Record<string, unknown>
      if (typeof source.id === 'string' && typeof source.text === 'string') {
        rightById.set(source.id, source.text)
      }
    }
  }

  draft.matchingPairs = rawLeft
    .map((leftItem) => {
      if (!leftItem || typeof leftItem !== 'object' || Array.isArray(leftItem)) return null
      const source = leftItem as Record<string, unknown>
      const leftId = typeof source.id === 'string' ? source.id : makeId()
      const leftText = typeof source.text === 'string' ? source.text : ''
      const pair = rawPairs.find((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false
        return (entry as Record<string, unknown>).leftId === leftId
      }) as Record<string, unknown> | undefined
      const rightId = typeof pair?.rightId === 'string' ? pair.rightId : ''
      return {
        localId: leftId,
        leftText,
        rightText: rightById.get(rightId) ?? '',
      }
    })
    .filter((item): item is FinalMatchingPairDraft => item !== null)

  return draft
}

export function buildFinalQuestionPayload(
  draft: FinalQuestionDraft,
): AdminFinalQuizQuestionPayload {
  if (draft.qType === 'single' || draft.qType === 'multiple') {
    return {
      text: draft.text.trim(),
      qType: draft.qType,
      orderIndex: draft.orderIndex,
      answers: draft.choiceAnswers.map((answer) => ({
        text: answer.text.trim(),
        isCorrect: answer.isCorrect,
      })),
      config: {},
    }
  }

  if (draft.qType === 'open') {
    return {
      text: draft.text.trim(),
      qType: draft.qType,
      orderIndex: draft.orderIndex,
      config: {
        acceptedAnswers: splitLines(draft.openAcceptedAnswersText),
        caseSensitive: draft.openCaseSensitive,
        trim: draft.openTrim,
        collapseSpaces: draft.openCollapseSpaces,
      },
    }
  }

  if (draft.qType === 'sequence') {
    const items = draft.sequenceItems.map((item) => ({
      id: item.localId,
      text: item.text.trim(),
    }))
    return {
      text: draft.text.trim(),
      qType: draft.qType,
      orderIndex: draft.orderIndex,
      config: {
        items,
        correctOrder: items.map((item) => item.id),
      },
    }
  }

  const leftItems = draft.matchingPairs.map((pair) => ({
    id: `left-${pair.localId}`,
    text: pair.leftText.trim(),
  }))
  const rightItems = draft.matchingPairs.map((pair) => ({
    id: `right-${pair.localId}`,
    text: pair.rightText.trim(),
  }))
  const correctPairs = draft.matchingPairs.map((pair) => ({
    leftId: `left-${pair.localId}`,
    rightId: `right-${pair.localId}`,
  }))

  return {
    text: draft.text.trim(),
    qType: draft.qType,
    orderIndex: draft.orderIndex,
    config: {
      leftItems,
      rightItems,
      correctPairs,
    },
  }
}

export function validateFinalQuestionDraft(draft: FinalQuestionDraft) {
  if (!draft.text.trim()) {
    return 'Заполните текст вопроса финального теста.'
  }

  if (draft.qType === 'single' || draft.qType === 'multiple') {
    if (draft.choiceAnswers.length < 2) {
      return 'У вопроса должно быть минимум два варианта ответа.'
    }

    if (draft.choiceAnswers.some((answer) => !answer.text.trim())) {
      return 'Заполните текст каждого варианта ответа.'
    }

    const correctCount = draft.choiceAnswers.filter((answer) => answer.isCorrect).length
    if (draft.qType === 'single' && correctCount !== 1) {
      return 'У вопроса с одним вариантом должен быть ровно один правильный ответ.'
    }

    if (draft.qType === 'multiple' && correctCount < 1) {
      return 'У вопроса с несколькими вариантами должен быть хотя бы один правильный ответ.'
    }

    return ''
  }

  if (draft.qType === 'open') {
    if (splitLines(draft.openAcceptedAnswersText).length === 0) {
      return 'Добавьте хотя бы один эталонный ответ для открытого вопроса.'
    }
    return ''
  }

  if (draft.qType === 'sequence') {
    if (draft.sequenceItems.length < 2) {
      return 'В вопросе на последовательность должно быть минимум два элемента.'
    }

    if (draft.sequenceItems.some((item) => !item.text.trim())) {
      return 'Заполните все элементы последовательности.'
    }

    return ''
  }

  if (draft.matchingPairs.length < 2) {
    return 'В вопросе на соответствие должно быть минимум две пары.'
  }

  if (draft.matchingPairs.some((pair) => !pair.leftText.trim() || !pair.rightText.trim())) {
    return 'Заполните обе стороны каждой пары соответствия.'
  }

  return ''
}
