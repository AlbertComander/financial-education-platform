export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type AuthenticatedRequestOptions = {
  method?: ApiMethod
  body?: unknown
}

export type HttpRequestOptions = {
  method?: ApiMethod
  body?: unknown
  accessToken?: string | null
}
