import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type {
  DemoAccountOverview,
  DemoCashTransaction,
  DemoIncomeRule,
  DemoInstrument,
} from '@/types/demo-account'

export const useDemoAccountStore = defineStore('demo-account', () => {
  const overview = ref<DemoAccountOverview | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const account = computed(() => overview.value?.account ?? null)
  const instruments = computed<DemoInstrument[]>(() => overview.value?.instruments ?? [])
  const transactions = computed<DemoCashTransaction[]>(() => overview.value?.transactions ?? [])
  const incomeRules = computed<DemoIncomeRule[]>(() => overview.value?.incomeRules ?? [])
  const summary = computed(() => overview.value?.summary ?? null)

  function getToken() {
    const auth = useAuthStore()
    return auth.accessToken
  }

  async function fetchOverview() {
    const accessToken = getToken()
    if (!accessToken) return

    isLoading.value = true
    error.value = null
    try {
      overview.value = await httpRequest<DemoAccountOverview>('/demo-account', {
        accessToken,
      })
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось загрузить демо-счет'
    } finally {
      isLoading.value = false
    }
  }

  async function depositCash(amount: number, description?: string) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest('/demo-account/cash/deposit', {
        method: 'POST',
        accessToken,
        body: { amount, description },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось пополнить демо-счет'
    } finally {
      isMutating.value = false
    }
  }

  async function createIncomeRule(title: string, amount: number, dayOfMonth: number) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest('/demo-account/income-rules', {
        method: 'POST',
        accessToken,
        body: { title, amount, dayOfMonth, isActive: true },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось создать регулярное пополнение'
    } finally {
      isMutating.value = false
    }
  }

  async function refreshQuotes() {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      const updated = await httpRequest<DemoInstrument[]>('/demo-account/instruments/quotes/refresh', {
        method: 'POST',
        accessToken,
      })
      if (overview.value) overview.value.instruments = updated
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось обновить котировки'
    } finally {
      isMutating.value = false
    }
  }

  return {
    overview,
    account,
    instruments,
    transactions,
    incomeRules,
    summary,
    isLoading,
    isMutating,
    error,
    fetchOverview,
    depositCash,
    createIncomeRule,
    refreshQuotes,
  }
})
