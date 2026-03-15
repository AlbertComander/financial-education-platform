export type TopicLesson = {
  id: string
  lesson_type: 'lesson' | 'final_exam'
  title: string
  summary: string | null
  difficulty: number
  estimated_minutes: number
  created_at: string
  user_progress: LessonUserProgress
}

export type LessonUserProgress = {
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percent: number
  last_opened_at: string | null
  completed_at: string | null
  quizzes_total: number
  quizzes_solved: number
  quizzes_passed: number
  best_quiz_percent: number | null
}

export type Topic = {
  id: string
  title: string
  description: string | null
  order_index: number
  lessons: TopicLesson[]
}

export type LessonBlock = {
  id: string
  block_type: string
  block_content: unknown
  order_index: number
}

export type Lesson = {
  id: string
  topic_id: string
  lesson_type: 'lesson' | 'final_exam'
  title: string
  summary: string | null
  content: string
  difficulty: number
  estimated_minutes: number
  created_at: string
  lesson_blocks: LessonBlock[]
}

export type LessonQuickCheckAnswer = {
  id: string
  text: string
}

export type LessonQuickCheckQuestion = {
  id: string
  text: string
  order_index: number
  selected_answer_id: string | null
  selected_is_correct: boolean | null
  answers: LessonQuickCheckAnswer[]
}

export type LessonQuickCheck = {
  lessonId: string
  totalQuestions: number
  answeredQuestions: number
  correctQuestions: number
  completed: boolean
  questions: LessonQuickCheckQuestion[]
}

export type SubmitLessonQuickAnswerResult = {
  lessonId: string
  questionId: string
  selectedAnswerId: string
  isCorrect: boolean
  feedback: string
  correctAnswerId: string | null
  progress: {
    totalQuestions: number
    answeredQuestions: number
    correctQuestions: number
    completed: boolean
    progressPercent: number
  } | null
}

export type LessonQuiz = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  _count: {
    questions: number
  }
}

export type QuizAnswer = {
  id: string
  text: string
}

export type QuizQuestion = {
  id: string
  text: string
  q_type: 'single' | 'multiple'
  order_index: number
  answers: QuizAnswer[]
}

export type Quiz = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  questions: QuizQuestion[]
}

export type AttemptSubmitAnswer = {
  questionId: string
  selectedAnswerIds: string[]
}

export type AttemptSubmitResult = {
  attemptId: string
  quizId: string
  score: number
  maxScore: number
  percent: number
  answers: Array<{
    questionId: string
    selectedAnswerIds: string[]
    isCorrect: boolean
  }>
  finishedAt: string | null
}

export type QuizAttempt = {
  id: string
  quiz_id: string
  started_at: string
  finished_at: string | null
  score: unknown
  max_score: unknown
  user_answers: Array<{
    question_id: string
    selected_answer_ids: string[]
    is_correct: boolean | null
  }>
}
