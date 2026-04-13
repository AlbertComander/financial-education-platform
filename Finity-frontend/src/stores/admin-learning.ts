import { ref } from 'vue'
import { defineStore } from 'pinia'
import { API_BASE_URL, ApiError, httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedRequestOptions } from '@/types/api'
import type {
  AdminFinalQuizEditor,
  AdminFinalQuizPayload,
  AdminFinalQuizQuestion,
  AdminFinalQuizQuestionPayload,
  AdminLessonEditor,
  AdminLessonPayload,
  AdminQuickQuestion,
  AdminQuickQuestionPayload,
  AdminTopicPayload,
  AdminTopicSummary,
} from '@/types/admin-learning'

export const useAdminLearningStore = defineStore('admin-learning', () => {
  const auth = useAuthStore()

  const topics = ref<AdminTopicSummary[]>([])
  const selectedLesson = ref<AdminLessonEditor | null>(null)
  const selectedFinalQuiz = ref<AdminFinalQuizEditor | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

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

  function resetTransient() {
    error.value = ''
    isLoading.value = false
    isSaving.value = false
  }

  async function loadTopics() {
    isLoading.value = true
    error.value = ''
    try {
      topics.value = await requestWithAuth<AdminTopicSummary[]>('/admin/learning/topics')
      return topics.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить дерево обучения'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createTopic(payload: AdminTopicPayload) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminTopicSummary>('/admin/learning/topics', {
        method: 'POST',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось создать тему'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateTopic(topicId: string, payload: Partial<AdminTopicPayload>) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminTopicSummary>(`/admin/learning/topics/${topicId}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить тему'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteTopic(topicId: string) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<{ deleted: number }>(`/admin/learning/topics/${topicId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить тему'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function reorderTopics(topicIds: string[]) {
    isSaving.value = true
    error.value = ''
    try {
      for (const [index, topicId] of topicIds.entries()) {
        await requestWithAuth(`/admin/learning/topics/${topicId}`, {
          method: 'PATCH',
          body: { orderIndex: index + 1 },
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось изменить порядок тем'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function loadLessonEditor(lessonId: string) {
    isLoading.value = true
    error.value = ''
    selectedLesson.value = null
    try {
      selectedLesson.value = await requestWithAuth<AdminLessonEditor>(`/admin/learning/lessons/${lessonId}`)
      return selectedLesson.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить урок для редактирования'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadFinalQuizEditor(quizId: string) {
    isLoading.value = true
    error.value = ''
    selectedFinalQuiz.value = null
    try {
      selectedFinalQuiz.value = await requestWithAuth<AdminFinalQuizEditor>(`/admin/learning/final-quizzes/${quizId}`)
      return selectedFinalQuiz.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить финальный тест'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createLesson(topicId: string, payload: AdminLessonPayload) {
    isSaving.value = true
    error.value = ''
    try {
      const created = await requestWithAuth<{ id: string }>(`/admin/learning/topics/${topicId}/lessons`, {
        method: 'POST',
        body: payload,
      })
      selectedLesson.value = await requestWithAuth<AdminLessonEditor>(`/admin/learning/lessons/${created.id}`)
      return selectedLesson.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось создать урок'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateLesson(lessonId: string, payload: Partial<AdminLessonPayload>) {
    isSaving.value = true
    error.value = ''
    try {
      await requestWithAuth(`/admin/learning/lessons/${lessonId}`, {
        method: 'PATCH',
        body: payload,
      })
      selectedLesson.value = await requestWithAuth<AdminLessonEditor>(`/admin/learning/lessons/${lessonId}`)
      return selectedLesson.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить урок'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteLesson(lessonId: string) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<{ deleted: number }>(`/admin/learning/lessons/${lessonId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить урок'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function reorderLessons(lessonIds: string[]) {
    isSaving.value = true
    error.value = ''
    try {
      for (const [index, lessonId] of lessonIds.entries()) {
        await requestWithAuth(`/admin/learning/lessons/${lessonId}`, {
          method: 'PATCH',
          body: { orderIndex: index + 1 },
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось изменить порядок уроков'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function createQuickQuestion(lessonId: string, payload: AdminQuickQuestionPayload) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminQuickQuestion>(`/admin/learning/lessons/${lessonId}/quick-questions`, {
        method: 'POST',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось создать вопрос мини-теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateQuickQuestion(questionId: string, payload: Partial<AdminQuickQuestionPayload>) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminQuickQuestion>(`/admin/learning/quick-questions/${questionId}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить вопрос мини-теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteQuickQuestion(questionId: string) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<{ deleted: number }>(`/admin/learning/quick-questions/${questionId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить вопрос мини-теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function reorderQuickQuestions(questionIds: string[]) {
    isSaving.value = true
    error.value = ''
    try {
      for (const [index, questionId] of questionIds.entries()) {
        await requestWithAuth(`/admin/learning/quick-questions/${questionId}`, {
          method: 'PATCH',
          body: { orderIndex: index + 1 },
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось изменить порядок мини-тестов'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function createFinalQuiz(lessonId: string, payload: AdminFinalQuizPayload) {
    isSaving.value = true
    error.value = ''
    try {
      const created = await requestWithAuth<{ id: string }>(`/admin/learning/lessons/${lessonId}/final-quizzes`, {
        method: 'POST',
        body: payload,
      })
      selectedFinalQuiz.value = await requestWithAuth<AdminFinalQuizEditor>(`/admin/learning/final-quizzes/${created.id}`)
      return selectedFinalQuiz.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось создать финальный тест'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateFinalQuiz(quizId: string, payload: Partial<AdminFinalQuizPayload>) {
    isSaving.value = true
    error.value = ''
    try {
      await requestWithAuth(`/admin/learning/final-quizzes/${quizId}`, {
        method: 'PATCH',
        body: payload,
      })
      selectedFinalQuiz.value = await requestWithAuth<AdminFinalQuizEditor>(`/admin/learning/final-quizzes/${quizId}`)
      return selectedFinalQuiz.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить финальный тест'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteFinalQuiz(quizId: string) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<{ deleted: number }>(`/admin/learning/final-quizzes/${quizId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить финальный тест'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function createFinalQuizQuestion(quizId: string, payload: AdminFinalQuizQuestionPayload) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminFinalQuizQuestion>(`/admin/learning/final-quizzes/${quizId}/questions`, {
        method: 'POST',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось создать вопрос финального теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateFinalQuizQuestion(
    questionId: string,
    payload: Partial<AdminFinalQuizQuestionPayload>,
  ) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<AdminFinalQuizQuestion>(`/admin/learning/questions/${questionId}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить вопрос финального теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deleteFinalQuizQuestion(questionId: string) {
    isSaving.value = true
    error.value = ''
    try {
      return await requestWithAuth<{ deleted: number }>(`/admin/learning/questions/${questionId}`, {
        method: 'DELETE',
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить вопрос финального теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function reorderFinalQuizQuestions(questionIds: string[]) {
    isSaving.value = true
    error.value = ''
    try {
      for (const [index, questionId] of questionIds.entries()) {
        await requestWithAuth(`/admin/learning/questions/${questionId}`, {
          method: 'PATCH',
          body: { orderIndex: index + 1 },
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось изменить порядок вопросов финального теста'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function uploadLessonImage(file: File) {
    isSaving.value = true
    error.value = ''

    try {
      const formData = new FormData()
      formData.append('image', file)

      const result = await requestWithAuth<{ url: string }>('/admin/learning/lesson-images', {
        method: 'POST',
        body: formData,
      })

      if (result.url.startsWith('http://') || result.url.startsWith('https://')) {
        return result.url
      }

      return `${API_BASE_URL}${result.url}`
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить изображение'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    topics,
    selectedLesson,
    selectedFinalQuiz,
    isLoading,
    isSaving,
    error,
    resetTransient,
    loadTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    reorderTopics,
    loadLessonEditor,
    loadFinalQuizEditor,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    createQuickQuestion,
    updateQuickQuestion,
    deleteQuickQuestion,
    reorderQuickQuestions,
    createFinalQuiz,
    updateFinalQuiz,
    deleteFinalQuiz,
    createFinalQuizQuestion,
    updateFinalQuizQuestion,
    deleteFinalQuizQuestion,
    reorderFinalQuizQuestions,
    uploadLessonImage,
  }
})
