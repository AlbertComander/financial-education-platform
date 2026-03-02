import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

type UserProfile = {
  user_id: string
  display_name: string | null
  goal: string | null
  experience_lvl: number | null
  base_params: Record<string, unknown>
  updated_at: string
}

type UserSettings = {
  user_id: string
  ui_lang: string
  theme: string
  notifications_enabled: boolean
  personalization_level: number
  updated_at: string
}

type UpdateProfilePayload = {
  display_name?: string
  goal?: string
  experience_lvl?: number
  base_params?: Record<string, unknown>
}

type UpdateSettingsPayload = {
  ui_lang?: string
  theme?: string
  notifications_enabled?: boolean
  personalization_level?: number
}

export const useUserStore = defineStore('user', () => {
  const auth = useAuthStore()

  const profile = ref<UserProfile | null>(null)
  const settings = ref<UserSettings | null>(null)
  const isLoading = ref(false)
  const isSavingProfile = ref(false)
  const isSavingSettings = ref(false)

  const hasData = computed(() => !!profile.value && !!settings.value)

  async function requestWithAuth<T>(
    path: string,
    options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
  ): Promise<T> {
    if (!auth.accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      return await httpRequest<T>(path, {
        ...options,
        accessToken: auth.accessToken,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshed = await auth.refresh()
        if (!refreshed || !auth.accessToken) {
          throw error
        }

        return httpRequest<T>(path, {
          ...options,
          accessToken: auth.accessToken,
        })
      }
      throw error
    }
  }

  async function loadProfile() {
    profile.value = await requestWithAuth<UserProfile | null>('/users/profile')
  }

  async function loadSettings() {
    settings.value = await requestWithAuth<UserSettings | null>('/users/settings')
  }

  async function loadAll() {
    isLoading.value = true
    try {
      await Promise.all([loadProfile(), loadSettings()])
    } finally {
      isLoading.value = false
    }
  }

  async function saveProfile(payload: UpdateProfilePayload) {
    isSavingProfile.value = true
    try {
      profile.value = await requestWithAuth<UserProfile>('/users/profile', {
        method: 'PATCH',
        body: payload,
      })
    } finally {
      isSavingProfile.value = false
    }
  }

  async function saveSettings(payload: UpdateSettingsPayload) {
    isSavingSettings.value = true
    try {
      settings.value = await requestWithAuth<UserSettings>('/users/settings', {
        method: 'PATCH',
        body: payload,
      })
    } finally {
      isSavingSettings.value = false
    }
  }

  function reset() {
    profile.value = null
    settings.value = null
  }

  return {
    profile,
    settings,
    hasData,
    isLoading,
    isSavingProfile,
    isSavingSettings,
    loadProfile,
    loadSettings,
    loadAll,
    saveProfile,
    saveSettings,
    reset,
  }
})
