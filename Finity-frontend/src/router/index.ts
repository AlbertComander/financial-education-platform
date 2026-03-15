import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const LoginView = () => import('@/views/LoginView.vue')
const RegisterView = () => import('@/views/RegisterView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const LearningView = () => import('@/views/LearningView.vue')
const TopicView = () => import('@/views/TopicView.vue')
const LessonView = () => import('@/views/LessonView.vue')
const QuizView = () => import('@/views/QuizView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { publicOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { publicOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/learning',
      name: 'learning',
      component: LearningView,
      meta: { requiresAuth: true },
    },
    {
      path: '/learning/topics/:topicId',
      name: 'topic',
      component: TopicView,
      meta: { requiresAuth: true },
    },
    {
      path: '/learning/lessons/:lessonId',
      name: 'lesson',
      component: LessonView,
      meta: { requiresAuth: true },
    },
    {
      path: '/learning/quizzes/:quizId',
      name: 'quiz',
      component: QuizView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isInitialized) {
    await auth.init()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.publicOnly && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
