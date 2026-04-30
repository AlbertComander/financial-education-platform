import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { interactiveToolLinks } from '@/lib/tool-navigation'

const LoginView = () => import('@/views/LoginView.vue')
const RegisterView = () => import('@/views/RegisterView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const EditProfileView = () => import('@/views/EditProfileView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const LearningView = () => import('@/views/LearningView.vue')
const TopicView = () => import('@/views/TopicView.vue')
const LessonView = () => import('@/views/LessonView.vue')
const LessonTestResultView = () => import('@/views/LessonTestResultView.vue')
const QuizView = () => import('@/views/QuizView.vue')
const AdminLearningView = () => import('@/views/AdminLearningView.vue')
const ToolsView = () => import('@/views/ToolsView.vue')
const DemoAccountView = () => import('@/views/DemoAccountView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/profile',
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
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/edit',
      name: 'profile-edit',
      component: EditProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
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
      path: '/learning/lessons/:lessonId/test-result',
      name: 'lesson-test-result',
      component: LessonTestResultView,
      meta: { requiresAuth: true },
    },
    {
      path: '/learning/final-quizzes/:quizId',
      name: 'quiz',
      component: QuizView,
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/learning',
      name: 'admin-learning',
      component: AdminLearningView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/tools',
      name: 'tools-home',
      component: ToolsView,
      meta: { requiresAuth: true, toolId: 'overview' },
    },
    {
      path: '/demo-account',
      name: 'demo-account',
      component: DemoAccountView,
      meta: { requiresAuth: true },
    },
    ...interactiveToolLinks
      .filter((tool) => tool.id !== 'overview')
      .map((tool) => ({
        path: tool.to,
        name: tool.routeName,
        component: ToolsView,
        meta: { requiresAuth: true, toolId: tool.id },
      })),
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

  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    return { name: 'profile' }
  }

  if (to.meta.publicOnly && auth.isAuthenticated) {
    return { name: 'profile' }
  }

  return true
})

export default router
