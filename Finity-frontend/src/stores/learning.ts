import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedRequestOptions } from '@/types/api'
import type {
  AttemptSubmitAnswer,
  AttemptSubmitResult,
  Lesson,
  LessonQuickCheck,
  LessonQuiz,
  Quiz,
  QuizAttempt,
  SubmitLessonQuickAnswerResult,
  Topic,
} from '@/types/learning'

export const useLearningStore = defineStore('learning', () => {
  const auth = useAuthStore()

  const topics = ref<Topic[]>([])
  const currentLesson = ref<Lesson | null>(null)
  const currentLessonQuizzes = ref<LessonQuiz[]>([])
  const currentQuiz = ref<Quiz | null>(null)
  const latestAttempt = ref<AttemptSubmitResult | null>(null)
  const myAttempts = ref<QuizAttempt[]>([])

  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref('')

  function resetAll() {
    topics.value = []
    currentLesson.value = null
    currentLessonQuizzes.value = []
    currentQuiz.value = null
    latestAttempt.value = null
    myAttempts.value = []
    isLoading.value = false
    isSubmitting.value = false
    error.value = ''
  }

  async function requestWithAuth<T>(
    path: string,
    options: AuthenticatedRequestOptions = {},
  ): Promise<T> {
    if (!auth.accessToken) {
      throw new Error('Требуется авторизация')
    }

    try {
      return await httpRequest<T>(path, {
        ...options,
        accessToken: auth.accessToken,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const refreshed = await auth.refresh()
        if (!refreshed || !auth.accessToken) {
          throw err
        }

        return await httpRequest<T>(path, {
          ...options,
          accessToken: auth.accessToken,
        })
      }

      throw err
    }
  }

  async function loadTopics() {
    isLoading.value = true
    error.value = ''
    try {
      topics.value = await requestWithAuth<Topic[]>('/learning/topics')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить темы'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function refreshTopicsSilently() {
    try {
      topics.value = await requestWithAuth<Topic[]>('/learning/topics')
    } catch {}
  }

  async function getQuizById(quizId: string) {
    return requestWithAuth<Quiz>(`/learning/quizzes/${quizId}`)
  }

  async function getMyQuizAttemptsByQuizId(quizId: string) {
    return requestWithAuth<QuizAttempt[]>(`/learning/quizzes/${quizId}/attempts/me`)
  }

  async function getLessonQuickCheck(lessonId: string) {
    return requestWithAuth<LessonQuickCheck>(`/learning/lessons/${lessonId}/quick-check`)
  }

  async function submitLessonQuickAnswer(
    lessonId: string,
    questionId: string,
    answerId: string,
  ) {
    const result = await requestWithAuth<SubmitLessonQuickAnswerResult>(
      `/learning/lessons/${lessonId}/quick-check/${questionId}/answer`,
      {
        method: 'POST',
        body: { answerId },
      },
    )
    await refreshTopicsSilently()
    return result
  }

  async function loadLesson(lessonId: string) {
    isLoading.value = true
    error.value = ''
    currentLesson.value = null
    currentLessonQuizzes.value = []
    try {
      const [lesson, quizzes] = await Promise.all([
        requestWithAuth<Lesson>(`/learning/lessons/${lessonId}`),
        requestWithAuth<LessonQuiz[]>(`/learning/lessons/${lessonId}/quizzes`),
      ])
      currentLesson.value = lesson
      currentLessonQuizzes.value = quizzes
      try {
        await requestWithAuth(`/learning/lessons/${lessonId}/open`, {
          method: 'POST',
        })
      } catch {}
      await refreshTopicsSilently()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить урок'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadQuiz(quizId: string) {
    isLoading.value = true
    error.value = ''
    currentQuiz.value = null
    myAttempts.value = []
    latestAttempt.value = null
    try {
      const [quiz, attempts] = await Promise.all([
        getQuizById(quizId),
        getMyQuizAttemptsByQuizId(quizId),
      ])
      currentQuiz.value = quiz
      myAttempts.value = attempts
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить тест'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function submitQuizAttempt(quizId: string, answers: AttemptSubmitAnswer[]) {
    isSubmitting.value = true
    error.value = ''
    try {
      latestAttempt.value = await requestWithAuth<AttemptSubmitResult>(
        `/learning/quizzes/${quizId}/attempts`,
        {
          method: 'POST',
          body: { answers },
        },
      )
      myAttempts.value = await getMyQuizAttemptsByQuizId(quizId)
      await refreshTopicsSilently()
      return latestAttempt.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось отправить попытку'
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  async function markLessonCompleted(lessonId: string) {
    isSubmitting.value = true
    error.value = ''
    try {
      await requestWithAuth(`/learning/lessons/${lessonId}/complete`, {
        method: 'POST',
      })
      await refreshTopicsSilently()
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Не удалось отметить урок завершенным'
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateLessonReadProgress(lessonId: string, percent: number) {
    const normalizedPercent = Math.max(0, Math.min(100, Math.round(percent)))

    for (const topic of topics.value) {
      const lesson = topic.lessons.find((item) => item.id === lessonId)
      if (!lesson) continue

      if (lesson.user_progress.status !== 'completed') {
        lesson.user_progress.status =
          normalizedPercent > 0 ? 'in_progress' : lesson.user_progress.status
        lesson.user_progress.progress_percent = Math.max(
          lesson.user_progress.progress_percent,
          normalizedPercent,
        )
      }
      break
    }

    try {
      await requestWithAuth(`/learning/lessons/${lessonId}/read-progress`, {
        method: 'POST',
        body: { percent: normalizedPercent },
      })
    } catch {}
  }

  function resetTransient() {
    latestAttempt.value = null
    error.value = ''
  }

  watch(
    () => auth.user?.sub ?? null,
    (nextUserId, prevUserId) => {
      if (nextUserId !== prevUserId) {
        resetAll()
      }
    },
  )

  return {
    topics,
    currentLesson,
    currentLessonQuizzes,
    currentQuiz,
    latestAttempt,
    myAttempts,
    isLoading,
    isSubmitting,
    error,
    loadTopics,
    loadLesson,
    loadQuiz,
    getQuizById,
    getMyQuizAttemptsByQuizId,
    getLessonQuickCheck,
    submitLessonQuickAnswer,
    submitQuizAttempt,
    markLessonCompleted,
    updateLessonReadProgress,
    refreshTopicsSilently,
    resetAll,
    resetTransient,
  }
})
