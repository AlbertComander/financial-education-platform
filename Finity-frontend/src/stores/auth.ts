import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, httpRequest } from '@/api/http'
import type { AuthTokensResponse, AuthUser } from '@/types/auth'

const ACCESS_TOKEN_KEY = 'finity_access_token'

let initPromise: Promise<void> | null = null

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function setAccessToken(token: string | null) {
    accessToken.value = token
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token)
    else localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  function clearSession() {
    setAccessToken(null)
    user.value = null
  }

  async function fetchMe(): Promise<AuthUser | null> {
    if (!accessToken.value) return null

    try {
      const me = await httpRequest<AuthUser>('/auth/me', {
        accessToken: accessToken.value,
      })
      user.value = me
      return me
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshed = await refresh()
        if (!refreshed || !accessToken.value) {
          clearSession()
          return null
        }

        const meAfterRefresh = await httpRequest<AuthUser>('/auth/me', {
          accessToken: accessToken.value,
        })
        user.value = meAfterRefresh
        return meAfterRefresh
      }

      throw error
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true
    try {
      const response = await httpRequest<AuthTokensResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      setAccessToken(response.accessToken)
      await fetchMe()
    } finally {
      isLoading.value = false
    }
  }

  async function register(email: string, password: string) {
    isLoading.value = true
    try {
      const response = await httpRequest<AuthTokensResponse>('/auth/register', {
        method: 'POST',
        body: { email, password },
      })
      setAccessToken(response.accessToken)
      await fetchMe()
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<boolean> {
    try {
      const response = await httpRequest<AuthTokensResponse>('/auth/refresh', {
        method: 'POST',
      })
      setAccessToken(response.accessToken)
      return true
    } catch (error) {
      clearSession()
      if (error instanceof ApiError && error.status === 401) return false
      return false
    }
  }

  async function logout() {
    try {
      await httpRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' })
    } finally {
      clearSession()
    }
  }

  async function init() {
    if (isInitialized.value) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      isLoading.value = true
      try {
        if (accessToken.value) {
          await fetchMe()
          return
        }

        const refreshed = await refresh()
        if (refreshed) {
          await fetchMe()
        }
      } finally {
        isInitialized.value = true
        isLoading.value = false
        initPromise = null
      }
    })()

    return initPromise
  }

  return {
    accessToken,
    user,
    isLoading,
    isInitialized,
    isAuthenticated,
    login,
    register,
    refresh,
    fetchMe,
    logout,
    init,
  }
})
