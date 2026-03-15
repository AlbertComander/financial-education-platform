import type { Lesson, Topic, TopicLesson } from '@/types/learning'

type LessonLike = Pick<TopicLesson, 'lesson_type'> | Pick<Lesson, 'lesson_type'>

export function isFinalExamLesson(lesson: LessonLike): boolean {
  return lesson.lesson_type === 'final_exam'
}

export function splitTopicLessons(topic: Topic) {
  const regularLessons = topic.lessons.filter((lesson) => !isFinalExamLesson(lesson))
  const finalExamLesson = topic.lessons.find((lesson) => isFinalExamLesson(lesson)) ?? null
  return { regularLessons, finalExamLesson }
}

export function isFinalExamUnlocked(topic: Topic): boolean {
  const { regularLessons } = splitTopicLessons(topic)
  if (regularLessons.length === 0) return false
  return regularLessons.every((lesson) => lesson.user_progress.status === 'completed')
}
