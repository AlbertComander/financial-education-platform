export type AuthTokensResponse = {
  accessToken: string
}

export type AuthUser = {
  sub: string
  email: string
  role: string
  iat?: number
  exp?: number
}
