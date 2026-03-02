<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

async function onSubmit() {
  error.value = ''
  try {
    await auth.login(email.value.trim(), password.value)
    await router.push({ name: 'dashboard' })
  } catch (e) {
    if (e instanceof ApiError) {
      error.value = e.message
      return
    }
    error.value = 'Ошибка входа. Повторите попытку.'
  }
}
</script>

<template>
  <Card class="auth-page auth-page--login">
    <h1 class="auth-page__title">Вход в систему</h1>
    <p class="auth-page__subtitle">Используйте email и пароль</p>

    <form class="auth-page__form" @submit.prevent="onSubmit">
      <label class="auth-page__field">
        <span class="auth-page__field-label">Email</span>
        <Input v-model="email" type="email" autocomplete="email" required />
      </label>

      <label class="auth-page__field">
        <span class="auth-page__field-label">Пароль</span>
        <Input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="auth-page__error">{{ error }}</p>
      <Button type="submit" class="auth-page__submit" :disabled="auth.isLoading">Войти</Button>
    </form>

    <p class="auth-page__hint">
      Нет аккаунта?
      <RouterLink to="/register">Зарегистрироваться</RouterLink>
    </p>
  </Card>
</template>

<style scoped>
.auth-page {
  max-width: 430px;
  margin: 48px auto 0;
  padding: 24px;
}

.auth-page__title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}

.auth-page__subtitle {
  margin: 0 0 16px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.auth-page__form {
  display: grid;
  gap: 12px;
}

.auth-page__field {
  display: grid;
  gap: 6px;
}

.auth-page__field-label {
  font-size: 14px;
}

.auth-page__error {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--destructive));
}

.auth-page__submit {
  width: 100%;
}

.auth-page__hint {
  margin: 12px 0 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}
</style>
