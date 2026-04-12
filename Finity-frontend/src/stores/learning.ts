import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedRequestOptions } from '@/types/api'
import type {
  FinalQuiz,
  FinalQuizAttempt,
  FinalQuizAttemptSubmitAnswer,
  FinalQuizAttemptSubmitResult,
  Lesson,
  LessonFinalQuiz,
  LessonQuickCheck,
  SubmitLessonQuickAnswerResult,
  Topic,
} from '@/types/learning'

export const useLearningStore = defineStore('learning', () => {
  const auth = useAuthStore()

  const topics = ref<Topic[]>([])
  const currentLesson = ref<Lesson | null>(null)
  const currentLessonFinalQuizzes = ref<LessonFinalQuiz[]>([])
  const currentFinalQuiz = ref<FinalQuiz | null>(null)
  const latestFinalQuizAttempt = ref<FinalQuizAttemptSubmitResult | null>(null)
  const myFinalQuizAttempts = ref<FinalQuizAttempt[]>([])

  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref('')

  function resetAll() {
    topics.value = []
    currentLesson.value = null
    currentLessonFinalQuizzes.value = []
    currentFinalQuiz.value = null
    latestFinalQuizAttempt.value = null
    myFinalQuizAttempts.value = []
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

  async function getFinalQuizById(quizId: string) {
    return requestWithAuth<FinalQuiz>(`/learning/final-quizzes/${quizId}`)
  }

  async function getMyFinalQuizAttemptsByQuizId(quizId: string) {
    return requestWithAuth<FinalQuizAttempt[]>(`/learning/final-quizzes/${quizId}/attempts/me`)
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
    currentLessonFinalQuizzes.value = []
    try {
      const [lesson, quizzes] = await Promise.all([
        requestWithAuth<Lesson>(`/learning/lessons/${lessonId}`),
        requestWithAuth<LessonFinalQuiz[]>(`/learning/lessons/${lessonId}/final-quizzes`),
      ])
      currentLesson.value = lesson
      currentLessonFinalQuizzes.value = quizzes
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

  async function loadFinalQuiz(quizId: string) {
    isLoading.value = true
    error.value = ''
    currentFinalQuiz.value = null
    myFinalQuizAttempts.value = []
    latestFinalQuizAttempt.value = null
    try {
      const [quiz, attempts] = await Promise.all([
        getFinalQuizById(quizId),
        getMyFinalQuizAttemptsByQuizId(quizId),
      ])
      currentFinalQuiz.value = quiz
      myFinalQuizAttempts.value = attempts
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить тест'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function submitFinalQuizAttempt(
    quizId: string,
    answers: FinalQuizAttemptSubmitAnswer[],
  ) {
    isSubmitting.value = true
    error.value = ''
    try {
      latestFinalQuizAttempt.value = await requestWithAuth<FinalQuizAttemptSubmitResult>(
        `/learning/final-quizzes/${quizId}/attempts`,
        {
          method: 'POST',
          body: { answers },
        },
      )
      myFinalQuizAttempts.value = await getMyFinalQuizAttemptsByQuizId(quizId)
      await refreshTopicsSilently()
      return latestFinalQuizAttempt.value
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
    latestFinalQuizAttempt.value = null
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
    currentLessonFinalQuizzes,
    currentFinalQuiz,
    latestFinalQuizAttempt,
    myFinalQuizAttempts,
    isLoading,
    isSubmitting,
    error,
    loadTopics,
    loadLesson,
    loadFinalQuiz,
    getFinalQuizById,
    getMyFinalQuizAttemptsByQuizId,
    getLessonQuickCheck,
    submitLessonQuickAnswer,
    submitFinalQuizAttempt,
    markLessonCompleted,
    updateLessonReadProgress,
    refreshTopicsSilently,
    resetAll,
    resetTransient,
  }
})
