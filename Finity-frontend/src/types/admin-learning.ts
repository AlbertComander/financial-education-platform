export type AdminTopicLessonSummary = {
  id: string
  order_index: number
  lesson_type: 'lesson' | 'final_exam'
  title: string
  summary: string | null
  difficulty: number
  estimated_minutes: number
  created_at: string
  quizzes: Array<{
    id: string
    title: string
  }>
  _count: {
    lesson_quick_questions: number
    quizzes: number
  }
}

export type AdminTopicSummary = {
  id: string
  title: string
  description: string | null
  difficulty: number
  order_index: number
  lessons: AdminTopicLessonSummary[]
}

export type AdminTopicPayload = {
  title: string
  description?: string
  orderIndex?: number
  difficulty?: number
}

export type AdminQuickAnswer = {
  id: string
  text: string
  is_correct: boolean
  feedback_text: string
}

export type AdminQuickQuestion = {
  id: string
  lesson_id: string
  text: string
  order_index: number
  lesson_quick_answers: AdminQuickAnswer[]
}

export type AdminLessonQuizSummary = {
  id: string
  title: string
  description: string | null
  _count: {
    questions: number
  }
}

export type AdminLessonEditor = {
  id: string
  topic_id: string
  order_index: number
  lesson_type: 'lesson' | 'final_exam'
  title: string
  summary: string | null
  content: string
  difficulty: number
  estimated_minutes: number
  created_at: string
  lesson_blocks: Array<{
    id: string
    block_type: string
    block_content: unknown
    order_index: number
  }>
  lesson_quick_questions: AdminQuickQuestion[]
  quizzes: AdminLessonQuizSummary[]
}

export type AdminFinalQuizAnswer = {
  id: string
  text: string
  is_correct: boolean
}

export type AdminFinalQuizQuestion = {
  id: string
  quiz_id: string
  text: string
  q_type: 'single' | 'multiple' | 'open' | 'sequence' | 'matching'
  config_json: Record<string, unknown>
  order_index: number
  answers: AdminFinalQuizAnswer[]
}

export type AdminFinalQuizEditor = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  questions: AdminFinalQuizQuestion[]
}

export type AdminLessonPayload = {
  orderIndex?: number
  lessonType: 'lesson' | 'final_exam'
  title: string
  summary?: string
  content: string
  difficulty: number
  estimatedMinutes: number
}

export type AdminQuickQuestionPayload = {
  text: string
  orderIndex: number
  answers: Array<{
    text: string
    isCorrect: boolean
    feedbackText?: string
  }>
}

export type AdminFinalQuizPayload = {
  title: string
  description?: string
}

export type AdminFinalQuizQuestionPayload = {
  text: string
  qType: 'single' | 'multiple' | 'open' | 'sequence' | 'matching'
  orderIndex: number
  answers?: Array<{
    text: string
    isCorrect: boolean
  }>
  config?: Record<string, unknown>
}
