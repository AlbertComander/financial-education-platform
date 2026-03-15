import type { HttpRequestOptions } from '@/types/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  const data = text.length > 0 ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`

    throw new ApiError(response.status, message)
  }

  return data as T
}
