<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userStore = useUserStore()

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarError = ref('')

const links = computed(() => {
  if (!auth.isAuthenticated) {
    return [
      { name: 'Вход', to: '/login' },
      { name: 'Регистрация', to: '/register' },
    ]
  }

  return [
    { name: 'Кабинет', to: '/dashboard' },
    { name: 'Профиль', to: '/profile' },
  ]
})

const avatarUrl = computed(() => {
  const value = userStore.profile?.base_params?.avatar_data_url
  return typeof value === 'string' ? value : undefined
})

const displayName = computed(() => {
  const name = userStore.profile?.display_name?.trim()
  return name || auth.user?.email || 'User'
})

const fallbackInitial = computed(() => {
  const first = displayName.value.trim().charAt(0)
  return first ? first.toUpperCase() : 'U'
})

function setOpen(value: boolean) {
  emit('update:open', value)
}

async function onLogout() {
  await auth.logout()
  userStore.reset()
  await router.push({ name: 'login' })
}

async function ensureProfileLoaded() {
  if (!auth.isAuthenticated || userStore.profile) return
  try {
    await userStore.loadProfile()
  } catch {
    // noop
  }
}

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function onAvatarSelected(event: Event) {
  avatarError.value = ''
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 1_500_000) {
    avatarError.value = 'Файл слишком большой. Максимум 1.5 MB.'
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : null
    if (!dataUrl) return

    const currentBase =
      userStore.profile?.base_params && typeof userStore.profile.base_params === 'object'
        ? userStore.profile.base_params
        : {}

    try {
      await userStore.saveProfile({
        base_params: { ...currentBase, avatar_data_url: dataUrl },
      })
    } catch {
      avatarError.value = 'Не удалось сохранить аватар.'
    } finally {
      target.value = ''
    }
  }

  reader.readAsDataURL(file)
}

watch(
  () => auth.isAuthenticated,
  () => {
    void ensureProfileLoaded()
  },
  { immediate: true },
)

onMounted(() => {
  void ensureProfileLoaded()
})
</script>

<template>
  <div
    v-if="open"
    class="app-sidebar__backdrop"
    @click="setOpen(false)"
  />

  <aside
    class="app-sidebar"
    :class="{ 'app-sidebar--open': open }"
  >
    <div class="app-sidebar__header">
      <p class="app-sidebar__title">Finity</p>
      <p class="app-sidebar__subtitle">Financial Learning Platform</p>
    </div>

    <nav class="app-sidebar__nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="app-sidebar__link"
        :class="{ 'app-sidebar__link--active': route.path === link.to }"
      >
        {{ link.name }}
      </RouterLink>
    </nav>

    <div v-if="auth.isAuthenticated" class="app-sidebar__footer">
      <div class="app-sidebar__profile">
        <Avatar size="sm">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
          <AvatarFallback>{{ fallbackInitial }}</AvatarFallback>
        </Avatar>
        <div class="app-sidebar__profile-meta">
          <p class="app-sidebar__name">{{ displayName }}</p>
          <p class="app-sidebar__email">{{ auth.user?.email }}</p>
        </div>
      </div>

      <input
        ref="avatarInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="app-sidebar__file-input"
        @change="onAvatarSelected"
      >

      <Button variant="outline" size="sm" class="app-sidebar__button" @click="openAvatarPicker">
        Поставить аватар
      </Button>
      <p v-if="avatarError" class="app-sidebar__error">{{ avatarError }}</p>
      <Button variant="outline" class="app-sidebar__button" @click="onLogout">Выйти</Button>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar__backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.35);
}

.app-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  width: 280px;
  border-right: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  padding: 16px;
  transition: transform 0.2s ease;
  transform: translateX(-100%);
  display: flex;
  flex-direction: column;
}

.app-sidebar--open {
  transform: translateX(0);
}

.app-sidebar__header {
  margin-bottom: 20px;
}

.app-sidebar__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.app-sidebar__subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.app-sidebar__nav {
  display: grid;
  gap: 4px;
}

.app-sidebar__link {
  border-radius: 6px;
  padding: 8px 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  transition: background-color 0.15s ease;
}

.app-sidebar__link:hover {
  background: hsl(var(--accent));
}

.app-sidebar__link--active {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.app-sidebar__footer {
  margin-top: auto;
  padding-top: 24px;
  display: grid;
  gap: 8px;
}

.app-sidebar__profile {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-sidebar__profile-meta {
  min-width: 0;
}

.app-sidebar__name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.app-sidebar__email {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.app-sidebar__file-input {
  display: none;
}

.app-sidebar__button {
  width: 100%;
}

.app-sidebar__error {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--destructive));
}

@media (min-width: 901px) {
  .app-sidebar__backdrop {
    display: none;
  }
}
</style>
