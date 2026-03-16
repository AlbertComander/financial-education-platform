import { splitTopicLessons } from '@/lib/learning-lessons'
import type { Topic, TopicLesson } from '@/types/learning'
import type {
  AchievementItem,
  CompetencyItem,
  ExperienceSourceItem,
  LevelState,
  ProfileAnalytics,
} from '@/types/profile'

const MAX_LEVEL = 40

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function ratioPercent(current: number, total: number) {
  if (total <= 0) return 0
  return clampPercent((current / total) * 100)
}

function toSafeDifficulty(value: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : 1
  return Math.max(1, Math.min(5, normalized))
}

function competencyLevelLabel(percent: number) {
  if (percent < 30) return 'Базовый'
  if (percent < 55) return 'Устойчивый'
  if (percent < 80) return 'Продвинутый'
  return 'Сильный'
}

export function getLevelRequirement(level: number) {
  const safeLevel = Math.max(1, level)
  return Math.round(260 + safeLevel * 92 + safeLevel * safeLevel * 18)
}

export function getLevelTitle(level: number) {
  if (level <= 2) return 'Новичок'
  if (level <= 4) return 'Исследователь'
  if (level <= 7) return 'Практик'
  if (level <= 11) return 'Продвинутый'
  return 'Эксперт'
}

function buildLevelState(totalXp: number): LevelState {
  const safeTotalXp = Math.max(0, Math.round(totalXp))
  let level = 1
  let xpInLevel = safeTotalXp
  let nextLevelXp = getLevelRequirement(level)

  while (level < MAX_LEVEL && xpInLevel >= nextLevelXp) {
    xpInLevel -= nextLevelXp
    level += 1
    nextLevelXp = getLevelRequirement(level)
  }

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      levelTitle: getLevelTitle(MAX_LEVEL),
      totalXp: safeTotalXp,
      currentXpInLevel: nextLevelXp,
      nextLevelXp,
      progressPercent: 100,
    }
  }

  return {
    level,
    levelTitle: getLevelTitle(level),
    totalXp: safeTotalXp,
    currentXpInLevel: xpInLevel,
    nextLevelXp,
    progressPercent: clampPercent((xpInLevel / nextLevelXp) * 100),
  }
}

function completedLessonXp(lesson: TopicLesson) {
  const difficulty = toSafeDifficulty(lesson.difficulty)
  return 110 + difficulty * 22
}

function inProgressLessonXp(lesson: TopicLesson) {
  const difficulty = toSafeDifficulty(lesson.difficulty)
  const progressPercent = Math.max(0, Math.min(90, lesson.user_progress.progress_percent))
  return Math.round((progressPercent / 100) * (70 + difficulty * 14))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

export function buildProfileAnalytics(topics: Topic[]): ProfileAnalytics {
  const regularLessons: TopicLesson[] = []
  const finalExamLessons: TopicLesson[] = []

  let startedTopics = 0
  let completedTopics = 0

  for (const topic of topics) {
    const { regularLessons: topicRegularLessons, finalExamLesson } = splitTopicLessons(topic)
    regularLessons.push(...topicRegularLessons)

    if (finalExamLesson) {
      finalExamLessons.push(finalExamLesson)
    }

    const hasStartedTopic = topicRegularLessons.some(
      (lesson) => lesson.user_progress.status !== 'not_started',
    )

    if (hasStartedTopic) {
      startedTopics += 1
    }

    const completedRegularLessons = topicRegularLessons.filter(
      (lesson) => lesson.user_progress.status === 'completed',
    ).length

    const isFinalExamPassed = finalExamLesson?.user_progress.status === 'completed'
    const isTopicCompleted =
      topicRegularLessons.length > 0 &&
      completedRegularLessons === topicRegularLessons.length &&
      (!finalExamLesson || isFinalExamPassed)

    if (isTopicCompleted) {
      completedTopics += 1
    }
  }

  const totalTopics = topics.length
  const totalLessons = regularLessons.length
  const completedLessons = regularLessons.filter(
    (lesson) => lesson.user_progress.status === 'completed',
  ).length
  const inProgressLessons = regularLessons.filter(
    (lesson) => lesson.user_progress.status === 'in_progress',
  ).length

  const totalQuizzes = regularLessons.reduce(
    (sum, lesson) => sum + lesson.user_progress.quizzes_total,
    0,
  )
  const solvedQuizzes = regularLessons.reduce(
    (sum, lesson) => sum + lesson.user_progress.quizzes_solved,
    0,
  )
  const passedQuizzes = regularLessons.reduce(
    (sum, lesson) => sum + lesson.user_progress.quizzes_passed,
    0,
  )

  const totalFinalExams = finalExamLessons.length
  const passedFinalExams = finalExamLessons.filter(
    (lesson) => lesson.user_progress.status === 'completed',
  ).length

  const bestQuizPercents = regularLessons
    .map((lesson) => lesson.user_progress.best_quiz_percent)
    .filter((value): value is number => typeof value === 'number')

  const averageBestQuizPercent = clampPercent(average(bestQuizPercents))

  const lessonCompletionScore = ratioPercent(completedLessons, totalLessons)
  const lessonEngagementScore = ratioPercent(
    completedLessons + inProgressLessons * 0.45,
    totalLessons,
  )
  const quizScore =
    totalQuizzes > 0
      ? clampPercent(
          ((passedQuizzes + Math.max(0, solvedQuizzes - passedQuizzes) * 0.35) / totalQuizzes) *
            100,
        )
      : lessonEngagementScore
  const finalExamScore =
    totalFinalExams > 0 ? ratioPercent(passedFinalExams, totalFinalExams) : quizScore
  const consistencyScore =
    totalTopics > 0
      ? clampPercent(((startedTopics * 0.55 + completedTopics * 0.45) / totalTopics) * 100)
      : 0
  const masteryScore = averageBestQuizPercent > 0 ? averageBestQuizPercent : quizScore

  const overallProgressPercent = clampPercent(
    lessonCompletionScore * 0.35 +
      quizScore * 0.25 +
      finalExamScore * 0.25 +
      consistencyScore * 0.15,
  )

  const xpFromCompletedLessons = regularLessons
    .filter((lesson) => lesson.user_progress.status === 'completed')
    .reduce((sum, lesson) => sum + completedLessonXp(lesson), 0)

  const xpFromInProgressLessons = regularLessons
    .filter((lesson) => lesson.user_progress.status === 'in_progress')
    .reduce((sum, lesson) => sum + inProgressLessonXp(lesson), 0)

  const xpFromQuizWork = passedQuizzes * 48 + Math.max(0, solvedQuizzes - passedQuizzes) * 16
  const xpFromFinalExams = passedFinalExams * 220
  const xpFromCompletedTopics = completedTopics * 140
  const xpFromConsistency = Math.round(consistencyScore * 1.1)
  const xpFromMastery = Math.round(masteryScore * 1.4)

  const experienceSources: ExperienceSourceItem[] = [
    { id: 'xp-completed-lessons', title: 'Завершенные уроки', value: xpFromCompletedLessons },
    { id: 'xp-progress-lessons', title: 'Прогресс по урокам', value: xpFromInProgressLessons },
    { id: 'xp-quiz-work', title: 'Решение тестов', value: xpFromQuizWork },
    { id: 'xp-final-exams', title: 'Финальные экзамены', value: xpFromFinalExams },
    { id: 'xp-topics', title: 'Закрытые темы', value: xpFromCompletedTopics },
    { id: 'xp-consistency', title: 'Стабильность обучения', value: xpFromConsistency },
    { id: 'xp-mastery', title: 'Качество ответов', value: xpFromMastery },
  ]

  const visibleExperienceSources = experienceSources.filter((item) => item.value > 0)
  const normalizedExperienceSources =
    visibleExperienceSources.length > 0
      ? visibleExperienceSources
      : [{ id: 'xp-start', title: 'Старт обучения', value: 0 }]

  const totalXp = normalizedExperienceSources.reduce((sum, item) => sum + item.value, 0)
  const levelState = buildLevelState(totalXp)

  const competencies: CompetencyItem[] = [
    {
      id: 'competency-discipline',
      title: 'Учебная дисциплина',
      description: 'Показывает регулярность прохождения уроков и чтения материалов.',
      percent: lessonEngagementScore,
      levelLabel: competencyLevelLabel(lessonEngagementScore),
    },
    {
      id: 'competency-knowledge',
      title: 'Проверка знаний',
      description: 'Оценивает качество выполнения мини-тестов и проверочных вопросов.',
      percent: quizScore,
      levelLabel: competencyLevelLabel(quizScore),
    },
    {
      id: 'competency-exam',
      title: 'Итоговая аттестация',
      description: 'Отражает прохождение финальных тестов по темам.',
      percent: finalExamScore,
      levelLabel: competencyLevelLabel(finalExamScore),
    },
    {
      id: 'competency-consistency',
      title: 'Стабильность темпа',
      description: 'Показывает, насколько равномерно вы продвигаетесь по темам.',
      percent: consistencyScore,
      levelLabel: competencyLevelLabel(consistencyScore),
    },
    {
      id: 'competency-mastery',
      title: 'Глубина понимания',
      description: 'Основана на лучшем проценте правильных ответов в тестах.',
      percent: masteryScore,
      levelLabel: competencyLevelLabel(masteryScore),
    },
  ]

  const quizMilestoneTarget = Math.max(5, Math.ceil(totalQuizzes * 0.6))
  const completedTopicsTarget = Math.max(1, Math.min(3, totalTopics))
  const startedTopicsTarget = Math.max(2, Math.min(4, totalTopics))

  const achievements: AchievementItem[] = [
    {
      id: 'achievement-first-lesson',
      title: 'Первые шаги',
      description: 'Завершите первый урок.',
      unlocked: completedLessons >= 1,
      progressText: `${Math.min(completedLessons, 1)}/1`,
    },
    {
      id: 'achievement-learning-rhythm',
      title: 'Рабочий ритм',
      description: 'Начните несколько тем, чтобы сформировать стабильный темп.',
      unlocked: startedTopics >= startedTopicsTarget && startedTopicsTarget > 0,
      progressText: `${Math.min(startedTopics, startedTopicsTarget)}/${startedTopicsTarget}`,
    },
    {
      id: 'achievement-quiz-milestone',
      title: 'Тестовый рубеж',
      description: 'Решите достаточное количество тестов с правильными ответами.',
      unlocked: passedQuizzes >= quizMilestoneTarget,
      progressText: `${Math.min(passedQuizzes, quizMilestoneTarget)}/${quizMilestoneTarget}`,
    },
    {
      id: 'achievement-first-final',
      title: 'Финальный зачет',
      description: 'Сдайте первый финальный тест темы.',
      unlocked: passedFinalExams >= 1,
      progressText: `${Math.min(passedFinalExams, 1)}/1`,
    },
    {
      id: 'achievement-topic-completion',
      title: 'Закрытая траектория',
      description: 'Полностью завершите несколько тем.',
      unlocked: completedTopics >= completedTopicsTarget && completedTopicsTarget > 0,
      progressText: `${Math.min(completedTopics, completedTopicsTarget)}/${completedTopicsTarget}`,
    },
    {
      id: 'achievement-level-growth',
      title: 'Рост уровня',
      description: 'Достигните 6 уровня опыта.',
      unlocked: levelState.level >= 6,
      progressText: `${Math.min(levelState.level, 6)}/6`,
    },
  ]

  return {
    stats: {
      totalTopics,
      startedTopics,
      completedTopics,
      totalLessons,
      completedLessons,
      inProgressLessons,
      totalQuizzes,
      solvedQuizzes,
      passedQuizzes,
      totalFinalExams,
      passedFinalExams,
      averageBestQuizPercent,
      overallProgressPercent,
    },
    levelState,
    competencies,
    achievements,
    experienceSources: normalizedExperienceSources,
  }
}
