import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { httpRequest } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type {
  DemoAccountOverview,
  DemoAccountListItem,
  DemoCashBalance,
  DemoCashTransaction,
  DemoIncomeRule,
  DemoInstrument,
  DemoInstrumentDetails,
  DemoPosition,
  DemoTrade,
} from '@/types/demo-account'

export const useDemoAccountStore = defineStore('demo-account', () => {
  const overview = ref<DemoAccountOverview | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const isDetailsLoading = ref(false)
  const error = ref<string | null>(null)
  const instrumentDetails = ref<DemoInstrumentDetails | null>(null)

  const account = computed(() => overview.value?.account ?? null)
  const accounts = computed<DemoAccountListItem[]>(() => overview.value?.accounts ?? [])
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

  function demoError(caught: unknown, fallback: string) {
    const message = caught instanceof Error ? caught.message : ''
    if (!message) return fallback

    if (message === 'Failed to fetch' || message.includes('NetworkError') || message.includes('Load failed')) {
      return 'Не удалось подключиться к серверу. Проверьте, что бэкенд запущен.'
    }

    if (message.includes('RUB rate is missing')) {
      return 'Не удалось получить курс валюты к рублю. Обновите котировки и попробуйте еще раз.'
    }

    if (message.startsWith('Request failed with status')) {
      return fallback
    }

    return message
  }

  function withAccountQuery(path: string, accountId?: string | null) {
    const id = accountId ?? account.value?.id
    return id ? `${path}${path.includes('?') ? '&' : '?'}accountId=${encodeURIComponent(id)}` : path
  }

  async function fetchOverview(options: { silent?: boolean; accountId?: string | null } = {}) {
    const accessToken = getToken()
    if (!accessToken) return false

    if (!options.silent) {
      isLoading.value = true
      error.value = null
    }
    try {
      overview.value = await httpRequest<DemoAccountOverview>(withAccountQuery('/demo-account', options.accountId), {
        accessToken,
      })
      return true
    } catch (caught) {
      if (!options.silent) {
        error.value = demoError(caught, 'Не удалось загрузить демо-счет')
      }
      return false
    } finally {
      if (!options.silent) {
        isLoading.value = false
      }
    }
  }

  async function createAccount(name: string, initialCash = 0) {
    const accessToken = getToken()
    if (!accessToken) return null

    isMutating.value = true
    error.value = null
    try {
      const created = await httpRequest<{ id: string }>('/demo-account', {
        method: 'POST',
        accessToken,
        body: { name, currency: 'RUB', initialCash },
      })
      await fetchOverview({ accountId: created.id })
      return created
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось создать демо-счет')
      return null
    } finally {
      isMutating.value = false
    }
  }

  async function depositCash(amount: number, description?: string) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest(withAccountQuery('/demo-account/cash/deposit'), {
        method: 'POST',
        accessToken,
        body: { amount, description },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось пополнить демо-счет')
    } finally {
      isMutating.value = false
    }
  }

  async function updateAccount(
    name: string,
    cashBalances: Array<{ currency: string; amount: number }>,
    positions: Array<{ instrumentId: number; quantity: number; avgPrice?: number }>,
  ) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest(withAccountQuery('/demo-account'), {
        method: 'PATCH',
        accessToken,
        body: { name, cashBalances, positions },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось обновить демо-счет')
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
      await httpRequest(withAccountQuery('/demo-account/income-rules'), {
        method: 'POST',
        accessToken,
        body: { title, amount, dayOfMonth, isActive: true },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось создать регулярное пополнение')
    } finally {
      isMutating.value = false
    }
  }

  async function refreshQuotes(options: { silent?: boolean } = {}) {
    const accessToken = getToken()
    if (!accessToken) return false

    if (!options.silent) {
      isMutating.value = true
      error.value = null
    }
    try {
      await httpRequest<DemoInstrument[]>('/demo-account/instruments/quotes/refresh', {
        method: 'POST',
        accessToken,
      })
      return await fetchOverview({ silent: options.silent })
    } catch (caught) {
      if (!options.silent) {
        error.value = demoError(caught, 'Не удалось обновить котировки')
      }
      return false
    } finally {
      if (!options.silent) {
        isMutating.value = false
      }
    }
  }

  async function exchangeCurrency(fromCurrency: string, toCurrency: string, fromAmount: number) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest(withAccountQuery('/demo-account/cash/exchange'), {
        method: 'POST',
        accessToken,
        body: { fromCurrency, toCurrency, fromAmount },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось обменять валюту')
    } finally {
      isMutating.value = false
    }
  }

  async function setFavoriteInstrument(instrumentId: string, isFavorite: boolean) {
    const accessToken = getToken()
    if (!accessToken) return false

    isMutating.value = true
    error.value = null
    try {
      await httpRequest(`/demo-account/instruments/${instrumentId}/favorite`, {
        method: 'POST',
        accessToken,
        body: { isFavorite },
      })
      await fetchOverview({ silent: true })
      return true
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось обновить избранное')
      return false
    } finally {
      isMutating.value = false
    }
  }

  async function fetchInstrumentDetails(instrumentId: string, period = '6m', options: { silent?: boolean } = {}) {
    const accessToken = getToken()
    if (!accessToken) return false

    if (!options.silent) {
      isDetailsLoading.value = true
      error.value = null
    }
    try {
      instrumentDetails.value = await httpRequest<DemoInstrumentDetails>(withAccountQuery(`/demo-account/instruments/${instrumentId}?period=${period}`), {
        accessToken,
      })
      return true
    } catch (caught) {
      if (!options.silent) {
        error.value = demoError(caught, 'Не удалось загрузить данные инструмента')
      }
      return false
    } finally {
      if (!options.silent) {
        isDetailsLoading.value = false
      }
    }
  }

  function clearInstrumentDetails() {
    instrumentDetails.value = null
  }

  async function placeTrade(
    side: 'buy' | 'sell',
    instrumentId: number,
    quantity: number,
    options: { orderType?: 'market' | 'limit'; limitPrice?: number } = {},
  ) {
    const accessToken = getToken()
    if (!accessToken) return

    isMutating.value = true
    error.value = null
    try {
      await httpRequest(withAccountQuery('/demo-account/trades'), {
        method: 'POST',
        accessToken,
        body: { side, instrumentId, quantity, ...options },
      })
      await fetchOverview()
    } catch (caught) {
      error.value = demoError(caught, 'Не удалось выполнить сделку')
    } finally {
      isMutating.value = false
    }
  }

  return {
    overview,
    account,
    accounts,
    cashBalances,
    instruments,
    transactions,
    incomeRules,
    positions,
    trades,
    summary,
    instrumentDetails,
    isLoading,
    isMutating,
    isDetailsLoading,
    error,
    fetchOverview,
    createAccount,
    updateAccount,
    depositCash,
    createIncomeRule,
    refreshQuotes,
    exchangeCurrency,
    setFavoriteInstrument,
    fetchInstrumentDetails,
    clearInstrumentDetails,
    placeTrade,
  }
})
