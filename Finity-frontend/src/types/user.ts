export type UserProfile = {
  user_id: string
  display_name: string | null
  goal: string | null
  experience_lvl: number | null
  base_params: Record<string, unknown>
  updated_at: string
}

export type UserSettings = {
  user_id: string
  ui_lang: string
  theme: string
  notifications_enabled: boolean
  personalization_level: number
  updated_at: string
}

export type UpdateProfilePayload = {
  display_name?: string
  goal?: string
  experience_lvl?: number
  base_params?: Record<string, unknown>
}

export type UpdateSettingsPayload = {
  ui_lang?: string
  theme?: string
  notifications_enabled?: boolean
  personalization_level?: number
}
