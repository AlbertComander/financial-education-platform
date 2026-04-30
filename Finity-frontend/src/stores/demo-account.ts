import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type {
  DemoAccountOverview,
  DemoCashBalance,
  DemoCashTransaction,
  DemoIncomeRule,
  DemoInstrument,
  DemoPosition,
  DemoTrade,
} from '@/types/demo-account'

export const useDemoAccountStore = defineStore('demo-account', () => {
  const overview = ref<DemoAccountOverview | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref<string | null>(null)

  const account = computed(() => overview.value?.account ?? null)
  const cashBalances = computed<DemoCashBalance[]>(() => overview.value?.cashBalances ?? [])
  const instruments = computed<DemoInstrument[]>(() => overview.value?.instruments ?? [])
  const transactions = computed<DemoCashTransaction[]>(() => overview.value?.transactions ?? [])
  const incomeRules = computed<DemoIncomeRule[]>(() => overview.value?.incomeRules ?? [])
  const positions = computed<DemoPosition[]>(() => overview.value?.positions ?? [])
  const trades = computed<DemoTrade[]>(() => overview.value?.trades ?? [])
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
      await httpRequest<DemoInstrument[]>('/demo-account/instruments/quotes/refresh', {
        method: 'POST',
        accessToken,
      })
      await fetchOverview()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось обновить котировки'
    } finally {
      isMutating.value = false
    }
  }

  async function exchangeCurrency(fromCurrency: string, toCurrency: string, fromAmount: number) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest('/demo-account/cash/exchange', {
        method: 'POST',
        accessToken,
        body: { fromCurrency, toCurrency, fromAmount },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось обменять валюту'
    } finally {
      isMutating.value = false
    }
  }

  async function placeTrade(side: 'buy' | 'sell', instrumentId: number, quantity: number) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest('/demo-account/trades', {
        method: 'POST',
        accessToken,
        body: { side, instrumentId, quantity, commission: 0 },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Не удалось выполнить сделку'
    } finally {
      isMutating.value = false
    }
  }

  return {
    overview,
    account,
    cashBalances,
    instruments,
    transactions,
    incomeRules,
    positions,
    trades,
    summary,
    isLoading,
    isMutating,
    error,
    fetchOverview,
    depositCash,
    createIncomeRule,
    refreshQuotes,
    exchangeCurrency,
    placeTrade,
  }
})
