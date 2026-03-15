<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const router = useRouter()
const auth = useAuthStore()
const roleLabel = computed(() => auth.user?.role ?? 'user')
</script>

<template>
  <section class="dashboard-page">
    <Card class="dashboard-page__hero">
      <p class="dashboard-page__eyebrow">Кабинет пользователя</p>
      <h1 class="dashboard-page__title">Добро пожаловать в Finity</h1>
      <p class="dashboard-page__subtitle">
        Продолжайте обучение по финансовой грамотности и отслеживайте свои результаты по темам и тестам.
      </p>

      <div class="dashboard-page__meta-grid">
        <div class="dashboard-page__meta-row">
          <span class="dashboard-page__meta-label">Email</span>
          <span class="dashboard-page__meta-value">{{ auth.user?.email ?? '—' }}</span>
        </div>
        <div class="dashboard-page__meta-row">
          <span class="dashboard-page__meta-label">Роль</span>
          <span class="dashboard-page__meta-value">{{ roleLabel }}</span>
        </div>
        <div class="dashboard-page__meta-row">
          <span class="dashboard-page__meta-label">User ID</span>
          <span class="dashboard-page__meta-value">{{ auth.user?.sub ?? '—' }}</span>
        </div>
      </div>

      <div class="dashboard-page__actions">
        <Button @click="router.push({ name: 'learning' })">Перейти к обучению</Button>
        <Button variant="outline" @click="router.push({ name: 'profile' })">Настроить профиль</Button>
      </div>
    </Card>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: grid;
}

.dashboard-page__hero {
  display: grid;
  gap: 16px;
  padding: 24px 24px 26px;
  border-radius: 16px;
}

.dashboard-page__eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.dashboard-page__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 700;
}

.dashboard-page__subtitle {
  margin: 0;
  max-width: 760px;
  color: hsl(var(--muted-foreground));
}

.dashboard-page__meta-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard-page__meta-row {
  display: grid;
  gap: 4px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  padding: 12px;
  background: hsl(var(--card));
}

.dashboard-page__meta-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

.dashboard-page__meta-value {
  font-weight: 600;
  word-break: break-all;
}

.dashboard-page__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 980px) {
  .dashboard-page__meta-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard-page__hero {
    padding: 18px;
  }

  .dashboard-page__title {
    font-size: 26px;
  }
}
</style>
