<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import iconLogin from '@/assets/icons/sidebar/login.svg'
import iconRegister from '@/assets/icons/sidebar/register.svg'
import iconDashboard from '@/assets/icons/sidebar/dashboard.svg'
import iconLearning from '@/assets/icons/sidebar/learning.svg'
import iconProfile from '@/assets/icons/sidebar/profile.svg'
import iconLogout from '@/assets/icons/sidebar/logout.svg'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userStore = useUserStore()

const sidebarIconMap = {
  login: iconLogin,
  register: iconRegister,
  dashboard: iconDashboard,
  learning: iconLearning,
  profile: iconProfile,
  logout: iconLogout,
} as const

const links = computed(() => {
  if (!auth.isAuthenticated) {
    return [
      { name: 'Вход', to: '/login', iconKey: 'login' },
      { name: 'Регистрация', to: '/register', iconKey: 'register' },
    ]
  }

  return [
    { name: 'Кабинет', to: '/dashboard', iconKey: 'dashboard' },
    { name: 'Обучение', to: '/learning', iconKey: 'learning' },
    { name: 'Профиль', to: '/profile', iconKey: 'profile' },
  ]
})

const avatarUrl = computed(() => {
  const value = userStore.profile?.base_params?.avatar_data_url
  return typeof value === 'string' ? value : undefined
})

const displayName = computed(() => {
  const name = userStore.profile?.display_name?.trim()
  return name || auth.user?.email || 'Пользователь'
})

const fallbackInitial = computed(() => {
  const first = displayName.value.trim().charAt(0)
  return first ? first.toUpperCase() : 'П'
})

function iconMask(iconKey: string) {
  const icon = sidebarIconMap[iconKey as keyof typeof sidebarIconMap] ?? sidebarIconMap.dashboard
  return `url("${icon}")`
}

function toggleSidebar(event: MouseEvent) {
  emit('update:open', !props.open)
  if (event.detail > 0) {
    const button = event.currentTarget as HTMLButtonElement | null
    button?.blur()
  }
}

function isLinkActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
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
  } catch {}
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
  <aside class="app-sidebar" :class="{ 'app-sidebar--open': props.open }">
    <header class="app-sidebar__header">
      <div class="app-sidebar__header-row" :class="{ 'app-sidebar__header-row--compact': !props.open }">
        <div class="app-sidebar__brand" :class="{ 'app-sidebar__brand--hidden': !props.open }">
          <p class="app-sidebar__title">Finity</p>
          <p class="app-sidebar__subtitle">Платформа финансовой грамотности</p>
        </div>

        <Button
          variant="outline"
          size="icon"
          class="app-sidebar__toggle"
          :class="{ 'app-sidebar__toggle--open': props.open }"
          :aria-label="props.open ? 'Свернуть меню' : 'Развернуть меню'"
          @mousedown.prevent
          @click="toggleSidebar"
        >
          <span class="app-sidebar__burger" :class="{ 'app-sidebar__burger--open': props.open }" aria-hidden="true">
            <span class="app-sidebar__burger-line app-sidebar__burger-line--top" />
            <span class="app-sidebar__burger-line app-sidebar__burger-line--middle" />
            <span class="app-sidebar__burger-line app-sidebar__burger-line--bottom" />
          </span>
        </Button>
      </div>
    </header>

    <nav class="app-sidebar__nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="app-sidebar__link"
        :class="{ 'app-sidebar__link--active': isLinkActive(link.to), 'app-sidebar__link--compact': !props.open }"
        :title="!props.open ? link.name : undefined"
      >
        <span
          class="app-sidebar__icon"
          :style="{ '--sidebar-icon': iconMask(link.iconKey) }"
          aria-hidden="true"
        />
        <span class="app-sidebar__label" :class="{ 'app-sidebar__label--hidden': !props.open }">
          {{ link.name }}
        </span>
      </RouterLink>
    </nav>

    <footer
      v-if="auth.isAuthenticated"
      class="app-sidebar__footer"
      :class="{ 'app-sidebar__footer--compact': !props.open }"
    >
      <div class="app-sidebar__profile" :class="{ 'app-sidebar__profile--compact': !props.open }">
        <Avatar size="sm">
          <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
          <AvatarFallback>{{ fallbackInitial }}</AvatarFallback>
        </Avatar>

        <div class="app-sidebar__profile-meta" :class="{ 'app-sidebar__profile-meta--hidden': !props.open }">
          <p class="app-sidebar__name">{{ displayName }}</p>
          <p class="app-sidebar__email">{{ auth.user?.email }}</p>
        </div>
      </div>

      <Button v-if="props.open" variant="outline" class="app-sidebar__button" @click="onLogout">Выйти</Button>
      <Button v-else variant="ghost" size="icon" class="app-sidebar__compact-action" title="Выйти" @click="onLogout">
        <span
          class="app-sidebar__icon"
          :style="{ '--sidebar-icon': iconMask('logout') }"
          aria-hidden="true"
        />
      </Button>
    </footer>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  width: 76px;
  border-right: 1px solid hsl(var(--border));
  background:
    linear-gradient(
      180deg,
      hsl(var(--background)),
      hsl(var(--background) / 0.98)
    );
  padding: 12px 10px 14px;
  transition: width 0.22s ease, padding 0.22s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.app-sidebar--open {
  width: 288px;
  padding: 14px;
}

.app-sidebar__header {
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 10px;
}

.app-sidebar__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 36px;
}

.app-sidebar__header-row--compact {
  justify-content: center;
  gap: 0;
}

.app-sidebar__brand {
  min-width: 0;
  overflow: hidden;
  max-width: 210px;
  opacity: 1;
  transition: max-width 0.18s ease, opacity 0.14s ease;
}

.app-sidebar__brand--hidden {
  max-width: 0;
  opacity: 0;
  flex: 0 0 0;
}

.app-sidebar__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
}

.app-sidebar__subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.app-sidebar__toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  cursor: pointer;
}

.app-sidebar__toggle--open {
  background: hsl(var(--accent));
}

.app-sidebar__burger {
  width: 16px;
  height: 12px;
  position: relative;
  display: inline-block;
}

.app-sidebar__burger-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transition: transform 0.2s ease, opacity 0.2s ease, top 0.2s ease;
}

.app-sidebar__burger-line--top {
  top: 0;
}

.app-sidebar__burger-line--middle {
  top: 5px;
}

.app-sidebar__burger-line--bottom {
  top: 10px;
}

.app-sidebar__burger--open .app-sidebar__burger-line--top {
  top: 5px;
  transform: rotate(45deg);
}

.app-sidebar__burger--open .app-sidebar__burger-line--middle {
  opacity: 0;
}

.app-sidebar__burger--open .app-sidebar__burger-line--bottom {
  top: 5px;
  transform: rotate(-45deg);
}

.app-sidebar__nav {
  display: grid;
  gap: 6px;
  margin-top: 2px;
}

.app-sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  border-radius: 10px;
  padding: 8px 10px;
  text-decoration: none;
  font-size: 14px;
  color: hsl(var(--foreground));
  transition: background-color 0.15s ease, color 0.15s ease;
  cursor: pointer;
  user-select: none;
}

.app-sidebar__link--compact {
  justify-content: center;
  padding: 8px;
}

.app-sidebar__link:hover {
  background: hsl(var(--accent));
}

.app-sidebar__link--active {
  background: hsl(var(--accent) / 0.9);
  color: hsl(var(--accent-foreground));
}

.app-sidebar__label {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  opacity: 1;
  transform: translateX(0);
  transition:
    max-width 0.2s ease,
    opacity 0.12s ease 0.08s,
    transform 0.12s ease 0.08s;
}

.app-sidebar__link--compact .app-sidebar__label {
  display: none;
}

.app-sidebar__label--hidden {
  max-width: 0;
  opacity: 0;
  transform: translateX(-4px);
  transition-delay: 0s, 0s, 0s;
}

.app-sidebar__icon {
  width: 20px;
  height: 20px;
  background: currentColor;
  -webkit-mask: var(--sidebar-icon) center / contain no-repeat;
  mask: var(--sidebar-icon) center / contain no-repeat;
  flex-shrink: 0;
}

.app-sidebar__footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid hsl(var(--border));
  display: grid;
  gap: 8px;
}

.app-sidebar__footer--compact {
  justify-items: center;
}

.app-sidebar__profile {
  display: flex;
  align-items: center;
  gap: 9px;
}

.app-sidebar__profile--compact {
  justify-content: center;
}

.app-sidebar__profile-meta {
  min-width: 0;
  max-width: 170px;
  opacity: 1;
  transition: max-width 0.18s ease, opacity 0.12s ease 0.08s;
}

.app-sidebar__profile-meta--hidden {
  max-width: 0;
  opacity: 0;
  transition-delay: 0s, 0s;
}

.app-sidebar__name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.app-sidebar__email {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.app-sidebar__button {
  width: 100%;
  cursor: pointer;
  user-select: none;
}

.app-sidebar__compact-action {
  width: 36px;
  height: 36px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .app-sidebar {
    width: 68px;
    padding: 10px 8px 12px;
  }

  .app-sidebar--open {
    width: 254px;
    padding: 12px;
  }
}
</style>
