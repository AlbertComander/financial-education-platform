export type CompetencyItem = {
  id: string
  title: string
  description: string
  percent: number
  levelLabel: string
}

export type AchievementItem = {
  id: string
  title: string
  description: string
  unlocked: boolean
  progressText: string
}

export type ExperienceSourceItem = {
  id: string
  title: string
  value: number
}

export type LevelState = {
  level: number
  levelTitle: string
  totalXp: number
  currentXpInLevel: number
  nextLevelXp: number
  progressPercent: number
}

export type ProfileLearningStats = {
  totalTopics: number
  startedTopics: number
  completedTopics: number
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  totalQuizzes: number
  solvedQuizzes: number
  passedQuizzes: number
  totalFinalExams: number
  passedFinalExams: number
  averageBestQuizPercent: number
  overallProgressPercent: number
}

export type ProfileAnalytics = {
  stats: ProfileLearningStats
  levelState: LevelState
  competencies: CompetencyItem[]
  achievements: AchievementItem[]
  experienceSources: ExperienceSourceItem[]
}
