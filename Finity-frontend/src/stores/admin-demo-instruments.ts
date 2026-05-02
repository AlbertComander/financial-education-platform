import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError, httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { AuthenticatedRequestOptions } from '@/types/api'
import type {
  AdminDemoInstrument,
  AdminDemoInstrumentPayload,
} from '@/types/admin-demo-instruments'

export const useAdminDemoInstrumentsStore = defineStore('admin-demo-instruments', () => {
  const auth = useAuthStore()
  const instruments = ref<AdminDemoInstrument[]>([])
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

  function replaceInstrument(updated: AdminDemoInstrument) {
    instruments.value = instruments.value.map((instrument) =>
      instrument.id === updated.id ? updated : instrument,
    )
  }

  async function loadInstruments() {
    isLoading.value = true
    error.value = ''
    try {
      instruments.value = await requestWithAuth<AdminDemoInstrument[]>('/admin/demo-instruments')
      return instruments.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить активы'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateInstrument(instrumentId: string, payload: AdminDemoInstrumentPayload) {
    isSaving.value = true
    error.value = ''
    try {
      const updated = await requestWithAuth<AdminDemoInstrument>(`/admin/demo-instruments/${instrumentId}`, {
        method: 'PATCH',
        body: payload,
      })
      replaceInstrument(updated)
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить актив'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function uploadLogo(instrumentId: string, file: File) {
    isSaving.value = true
    error.value = ''

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const result = await requestWithAuth<{
        logoUrl: string
        instrument: AdminDemoInstrument
      }>(`/admin/demo-instruments/${instrumentId}/logo`, {
        method: 'POST',
        body: formData,
      })

      replaceInstrument(result.instrument)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить логотип'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function importMarketData() {
    isSaving.value = true
    error.value = ''
    try {
      const result = await requestWithAuth<{
        instruments: number
        metrics: number
        dividends: number
        failed: Array<{ symbol: string; reason: string }>
      }>('/admin/demo-instruments/market-data/import', {
        method: 'POST',
      })
      await loadInstruments()
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить рыночные данные'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    instruments,
    isLoading,
    isSaving,
    error,
    loadInstruments,
    updateInstrument,
    uploadLogo,
    importMarketData,
  }
})
