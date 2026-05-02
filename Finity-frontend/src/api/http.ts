import type { HttpRequestOptions } from '@/types/api'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function httpRequest<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken } = options

  const headers = new Headers()
  const isFormData = body instanceof FormData

  if (!isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  })

  const text = await response.text()
  let data: unknown = null
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const rawMessage =
      typeof data === 'object' && data !== null && 'message' in data
        ? (data as { message: unknown }).message
        : null
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string' && rawMessage.length > 0
        ? rawMessage
        : `Запрос завершился ошибкой ${response.status}`

    throw new ApiError(response.status, message)
  }

  return data as T
}
