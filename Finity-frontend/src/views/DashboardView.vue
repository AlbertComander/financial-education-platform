<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Card } from '@/components/ui/card'

const auth = useAuthStore()
const roleLabel = computed(() => auth.user?.role ?? 'user')
</script>

<template>
  <section class="dashboard">
    <Card class="dashboard__card dashboard__card--main">
      <h1 class="dashboard__title">Личный кабинет</h1>
      <p class="dashboard__subtitle">Вы авторизованы в системе и можете продолжить обучение.</p>

      <div class="dashboard__meta">
        <div class="dashboard__meta-row"><strong>Email:</strong> {{ auth.user?.email }}</div>
        <div class="dashboard__meta-row"><strong>Роль:</strong> {{ roleLabel }}</div>
        <div class="dashboard__meta-row"><strong>User ID:</strong> {{ auth.user?.sub }}</div>
      </div>
    </Card>

    <Card class="dashboard__card dashboard__card--next">
      <h2 class="dashboard__heading">Следующий этап</h2>
      <p class="dashboard__text">
        Здесь можно добавить персональную образовательную траекторию: темы финансовой грамотности,
        прогресс по урокам, результаты квизов и интерактивные сценарии принятия решений.
      </p>
    </Card>
  </section>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 16px;
}

.dashboard__card {
  padding: 24px;
}

.dashboard__title {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.2;
}

.dashboard__heading {
  margin: 0 0 8px;
  font-size: 20px;
  line-height: 1.2;
}

.dashboard__subtitle {
  margin: 0 0 14px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}

.dashboard__meta {
  display: grid;
  gap: 8px;
  font-size: 14px;
}

.dashboard__meta-row {
  line-height: 1.3;
}

.dashboard__text {
  margin: 0;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}
</style>
