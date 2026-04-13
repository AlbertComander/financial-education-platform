import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LearningErrors } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { CreateTopicDto, UpdateTopicDto } from './dto/admin/topic.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/admin/lesson.dto';
import {
  CreateQuizDto,
  CreateQuizWithQuestionsDto,
  UpdateQuizDto,
} from './dto/admin/quiz.dto';
import {
  CreateQuestionDto,
  QUESTION_TYPES,
  QuestionType,
  UpdateQuestionDto,
} from './dto/admin/question.dto';
import { CreateAnswerDto, UpdateAnswerDto } from './dto/admin/answer.dto';

type EvaluatedQuestion = {
  questionId: bigint;
  selectedAnswerIds: string[];
  submittedPayload: Record<string, unknown>;
  isCorrect: boolean;
};

type QuestionConfigObject = Record<string, unknown>;

type SequenceConfig = {
  items: Array<{ id: string; text: string }>;
  correctOrder: string[];
};

type MatchingConfig = {
  leftItems: Array<{ id: string; text: string }>;
  rightItems: Array<{ id: string; text: string }>;
  correctPairs: Array<{ leftId: string; rightId: string }>;
};

type LessonProgressSnapshot = {
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  last_opened_at: Date | null;
  completed_at: Date | null;
  quizzes_total: number;
  quizzes_solved: number;
  quizzes_passed: number;
  best_quiz_percent: number | null;
};

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  private parseBigInt(value: string, fieldName: string): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(LearningErrors.invalidId(fieldName));
    }
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === 'object' && 'toNumber' in value) {
      const maybeToNumber = (value as { toNumber?: () => unknown }).toNumber;
      if (typeof maybeToNumber === 'function') {
        const parsed = Number(maybeToNumber());
        return Number.isFinite(parsed) ? parsed : 0;
      }
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private scoreToPercent(score: unknown, maxScore: unknown): number {
    const scoreValue = this.toNumber(score);
    const maxScoreValue = this.toNumber(maxScore);
    if (maxScoreValue <= 0) return 0;
    const percent = Math.round((scoreValue / maxScoreValue) * 100);
    if (percent < 0) return 0;
    if (percent > 100) return 100;
    return percent;
  }

  private async buildLessonProgressMap(
    userId: bigint,
    lessonRecords: Array<{
      id: bigint;
      lesson_type: string;
      quizzes: Array<{ id: bigint }>;
      lesson_quick_questions: Array<{ id: bigint }>;
    }>,
  ) {
    const lessonIds = lessonRecords.map((lesson) => lesson.id);
    const allQuizIds = lessonRecords.flatMap((lesson) =>
      lesson.quizzes.map((quiz) => quiz.id),
    );
    const allQuickQuestionIds = lessonRecords.flatMap((lesson) =>
      lesson.lesson_quick_questions.map((question) => question.id),
    );

    const lessonProgressRows = lessonIds.length
      ? await this.prisma.user_lesson_progress.findMany({
          where: {
            user_id: userId,
            lesson_id: { in: lessonIds },
          },
          select: {
            lesson_id: true,
            status: true,
            progress_percent: true,
            last_opened_at: true,
            completed_at: true,
          },
        })
      : [];

    const attempts = allQuizIds.length
      ? await this.prisma.user_quiz_attempts.findMany({
          where: {
            user_id: userId,
            quiz_id: { in: allQuizIds },
          },
          select: {
            quiz_id: true,
            score: true,
            max_score: true,
          },
        })
      : [];

    const quickAnswers = allQuickQuestionIds.length
      ? await this.prisma.user_lesson_quick_answers.findMany({
          where: {
            user_id: userId,
            question_id: { in: allQuickQuestionIds },
          },
          select: {
            lesson_id: true,
            question_id: true,
            is_correct: true,
          },
        })
      : [];

    const lessonProgressByLesson = new Map(
      lessonProgressRows.map((row) => [row.lesson_id.toString(), row]),
    );

    const bestPercentByQuiz = new Map<string, number>();
    for (const attempt of attempts) {
      const quizKey = attempt.quiz_id.toString();
      const percent = this.scoreToPercent(attempt.score, attempt.max_score);
      const prev = bestPercentByQuiz.get(quizKey);
      if (prev === undefined || percent > prev) {
        bestPercentByQuiz.set(quizKey, percent);
      }
    }

    const quickAnsweredByLesson = new Map<string, number>();
    const quickCorrectByLesson = new Map<string, number>();
    for (const answer of quickAnswers) {
      const lessonKey = answer.lesson_id.toString();
      quickAnsweredByLesson.set(
        lessonKey,
        (quickAnsweredByLesson.get(lessonKey) ?? 0) + 1,
      );
      if (answer.is_correct) {
        quickCorrectByLesson.set(
          lessonKey,
          (quickCorrectByLesson.get(lessonKey) ?? 0) + 1,
        );
      }
    }

    const result = new Map<string, LessonProgressSnapshot>();

    for (const lesson of lessonRecords) {
      const lessonKey = lesson.id.toString();
      const progressRow = lessonProgressByLesson.get(lessonKey);
      const lessonType = lesson.lesson_type ?? 'lesson';
      const quickTotal = lesson.lesson_quick_questions.length;
      const quickAnswered = quickAnsweredByLesson.get(lessonKey) ?? 0;
      const quickCorrect = quickCorrectByLesson.get(lessonKey) ?? 0;
      const hasDbProgress = (progressRow?.progress_percent ?? 0) > 0;
      const startedByDb =
        progressRow?.status === 'in_progress' || hasDbProgress;
      const completedByDb =
        progressRow?.status === 'completed' ||
        (progressRow?.progress_percent ?? 0) >= 100;

      if (lessonType === 'lesson') {
        const completedByQuick = quickTotal > 0 && quickCorrect >= quickTotal;
        const isCompleted = completedByQuick || completedByDb;
        const isStarted = isCompleted || quickAnswered > 0 || startedByDb;

        let progressPercent = Math.max(
          progressRow?.progress_percent ?? 0,
          isStarted ? 10 : 0,
        );
        if (isCompleted) {
          progressPercent = 100;
        } else {
          progressPercent = Math.min(progressPercent, 90);
        }

        const quickPercent =
          quickTotal > 0 ? Math.round((quickCorrect / quickTotal) * 100) : null;

        result.set(lessonKey, {
          status: isCompleted
            ? 'completed'
            : isStarted
              ? 'in_progress'
              : 'not_started',
          progress_percent: progressPercent,
          last_opened_at: progressRow?.last_opened_at ?? null,
          completed_at: isCompleted
            ? (progressRow?.completed_at ?? null)
            : null,
          quizzes_total: quickTotal > 0 ? 1 : 0,
          quizzes_solved: completedByQuick ? 1 : 0,
          quizzes_passed: completedByQuick ? 1 : 0,
          best_quiz_percent: quickPercent,
        });
        continue;
      }

      const quizPercents = lesson.quizzes
        .map((quiz) => bestPercentByQuiz.get(quiz.id.toString()))
        .filter((value): value is number => value !== undefined);
      const quizzesTotal = lesson.quizzes.length;
      const quizzesSolved = quizPercents.length;
      const quizzesPassed = quizPercents.filter((value) => value >= 70).length;
      const hasQuizAttempt = quizPercents.length > 0;
      const bestQuizPercent =
        quizPercents.length > 0 ? Math.max(...quizPercents) : null;

      const completedByQuiz =
        quizzesTotal > 0 && quizzesSolved === quizzesTotal;

      const isCompleted = completedByQuiz || completedByDb;
      const isStarted = isCompleted || hasQuizAttempt || startedByDb;

      let progressPercent = 0;
      if (isCompleted) {
        progressPercent = 100;
      } else if (quizzesTotal > 0) {
        const quizProgress = Math.round((quizzesSolved / quizzesTotal) * 100);
        progressPercent = Math.max(
          quizProgress,
          progressRow?.progress_percent ?? 0,
        );
        if (isStarted && progressPercent === 0) {
          progressPercent = 10;
        }
      } else {
        progressPercent = Math.max(
          progressRow?.progress_percent ?? 0,
          isStarted ? 10 : 0,
        );
      }

      if (progressPercent > 100) progressPercent = 100;

      result.set(lessonKey, {
        status: isCompleted
          ? 'completed'
          : isStarted
            ? 'in_progress'
            : 'not_started',
        progress_percent: progressPercent,
        last_opened_at: progressRow?.last_opened_at ?? null,
        completed_at: isCompleted ? (progressRow?.completed_at ?? null) : null,
        quizzes_total: quizzesTotal,
        quizzes_solved: quizzesSolved,
        quizzes_passed: quizzesPassed,
        best_quiz_percent: bestQuizPercent,
      });
    }

    return result;
  }

  private async upsertLessonProgressFromQuiz(userId: bigint, lessonId: bigint) {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        lesson_type: true,
        quizzes: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);
    if (lesson.lesson_type === 'lesson') {
      return null;
    }

    const quizIds = lesson.quizzes.map((quiz) => quiz.id);

    const [existing, attempts] = await Promise.all([
      this.prisma.user_lesson_progress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        select: {
          id: true,
          status: true,
          progress_percent: true,
        },
      }),
      quizIds.length
        ? this.prisma.user_quiz_attempts.findMany({
            where: {
              user_id: userId,
              quiz_id: { in: quizIds },
            },
            select: {
              quiz_id: true,
              score: true,
              max_score: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const bestPercentByQuiz = new Map<string, number>();
    for (const attempt of attempts) {
      const quizKey = attempt.quiz_id.toString();
      const percent = this.scoreToPercent(attempt.score, attempt.max_score);
      const previous = bestPercentByQuiz.get(quizKey);
      if (previous === undefined || percent > previous) {
        bestPercentByQuiz.set(quizKey, percent);
      }
    }

    const quizzesTotal = quizIds.length;
    const quizzesSolved = bestPercentByQuiz.size;
    const completedByQuiz = quizzesTotal > 0 && quizzesSolved === quizzesTotal;
    const startedByDb =
      (existing?.progress_percent ?? 0) > 0 ||
      existing?.status === 'in_progress';
    const isCompleted = completedByQuiz;
    const isStarted = isCompleted || quizzesSolved > 0 || startedByDb;

    let progressPercent = 0;
    if (isCompleted) {
      progressPercent = 100;
    } else if (quizzesTotal > 0) {
      const quizProgress = Math.round((quizzesSolved / quizzesTotal) * 100);
      progressPercent = Math.max(quizProgress, existing?.progress_percent ?? 0);
      if (isStarted && progressPercent === 0) {
        progressPercent = 10;
      }
    } else {
      progressPercent = Math.max(
        existing?.progress_percent ?? 0,
        isStarted ? 10 : 0,
      );
    }

    const now = new Date();
    if (!isStarted) {
      return existing;
    }

    const nextStatus: 'not_started' | 'in_progress' | 'completed' = isCompleted
      ? 'completed'
      : 'in_progress';

    if (!existing) {
      return this.prisma.user_lesson_progress.create({
        data: {
          user_id: userId,
          lesson_id: lessonId,
          status: nextStatus,
          progress_percent: progressPercent,
          last_opened_at: now,
          completed_at: isCompleted ? now : null,
        },
      });
    }

    const nextProgress = Math.max(existing.progress_percent, progressPercent);

    return this.prisma.user_lesson_progress.update({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      data: {
        status: nextStatus,
        progress_percent: nextProgress,
        last_opened_at: now,
        completed_at: isCompleted ? now : null,
      },
    });
  }

  async getTopicsWithLessons(userId: bigint) {
    const topics = await this.prisma.topics.findMany({
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        order_index: true,
        lessons: {
          orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            lesson_type: true,
            title: true,
            summary: true,
            difficulty: true,
            estimated_minutes: true,
            created_at: true,
            lesson_quick_questions: {
              select: {
                id: true,
              },
            },
            quizzes: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const lessonRecords = topics.flatMap((topic) => topic.lessons);
    const progressMap = await this.buildLessonProgressMap(
      userId,
      lessonRecords,
    );

    return topics.map((topic) => ({
      ...topic,
      lessons: topic.lessons.map((lesson) => {
        const snapshot = progressMap.get(lesson.id.toString()) ?? {
          status: 'not_started' as const,
          progress_percent: 0,
          last_opened_at: null,
          completed_at: null,
          quizzes_total:
            lesson.lesson_type === 'lesson'
              ? lesson.lesson_quick_questions.length > 0
                ? 1
                : 0
              : lesson.quizzes.length,
          quizzes_solved: 0,
          quizzes_passed: 0,
          best_quiz_percent: null,
        };

        return {
          id: lesson.id,
          lesson_type: lesson.lesson_type,
          title: lesson.title,
          summary: lesson.summary,
          difficulty: lesson.difficulty,
          estimated_minutes: lesson.estimated_minutes,
          created_at: lesson.created_at,
          user_progress: snapshot,
        };
      }),
    }));
  }

  async markLessonOpened(userId: bigint, lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true, lesson_type: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    const existing = await this.prisma.user_lesson_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      select: {
        status: true,
        progress_percent: true,
      },
    });

    const now = new Date();

    if (!existing) {
      return this.prisma.user_lesson_progress.create({
        data: {
          user_id: userId,
          lesson_id: lessonId,
          status: 'in_progress',
          progress_percent: 10,
          last_opened_at: now,
        },
      });
    }

    if (existing.status === 'completed') {
      return this.prisma.user_lesson_progress.update({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        data: {
          last_opened_at: now,
        },
      });
    }

    return this.prisma.user_lesson_progress.update({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      data: {
        status: 'in_progress',
        progress_percent: Math.max(existing.progress_percent, 10),
        last_opened_at: now,
      },
    });
  }

  async markLessonCompleted(userId: bigint, lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true, lesson_type: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    const now = new Date();

    return this.prisma.user_lesson_progress.upsert({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed',
        progress_percent: 100,
        last_opened_at: now,
        completed_at: now,
      },
      update: {
        status: 'completed',
        progress_percent: 100,
        last_opened_at: now,
        completed_at: now,
      },
    });
  }

  async updateLessonReadProgress(
    userId: bigint,
    lessonIdRaw: string,
    percentRaw: number,
  ) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true, lesson_type: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    const existing = await this.prisma.user_lesson_progress.findUnique({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      select: {
        status: true,
        progress_percent: true,
      },
    });

    if (existing?.status === 'completed') {
      return existing;
    }

    const maxReadPercent = lesson.lesson_type === 'lesson' ? 90 : 99;
    const normalizedPercent = Math.max(
      0,
      Math.min(maxReadPercent, Math.round(percentRaw)),
    );

    if (!existing && normalizedPercent === 0) {
      return null;
    }

    const now = new Date();

    if (!existing) {
      return this.prisma.user_lesson_progress.create({
        data: {
          user_id: userId,
          lesson_id: lessonId,
          status: 'in_progress',
          progress_percent: normalizedPercent,
          last_opened_at: now,
        },
      });
    }

    const nextPercent = Math.max(existing.progress_percent, normalizedPercent);
    const nextStatus = nextPercent > 0 ? 'in_progress' : existing.status;

    return this.prisma.user_lesson_progress.update({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      data: {
        status: nextStatus,
        progress_percent: nextPercent,
        last_opened_at: now,
      },
    });
  }

  async getLessonById(lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        topic_id: true,
        lesson_type: true,
        title: true,
        summary: true,
        content: true,
        difficulty: true,
        estimated_minutes: true,
        created_at: true,
        lesson_blocks: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            block_type: true,
            block_content: true,
            order_index: true,
          },
        },
      },
    });

    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);
    return lesson;
  }

  async getLessonQuickCheck(userId: bigint, lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        lesson_type: true,
        lesson_quick_questions: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            text: true,
            order_index: true,
            lesson_quick_answers: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);
    if (lesson.lesson_type !== 'lesson') {
      throw new BadRequestException(
        'Мини-тест доступен только для обычного урока.',
      );
    }

    const userAnswers = await this.prisma.user_lesson_quick_answers.findMany({
      where: {
        user_id: userId,
        lesson_id: lessonId,
      },
      select: {
        question_id: true,
        answer_id: true,
        is_correct: true,
      },
    });

    const userAnswerByQuestion = new Map(
      userAnswers.map((item) => [item.question_id.toString(), item]),
    );

    const totalQuestions = lesson.lesson_quick_questions.length;
    const answeredQuestions = userAnswers.length;
    const correctQuestions = userAnswers.filter(
      (item) => item.is_correct,
    ).length;
    const completed = totalQuestions > 0 && correctQuestions >= totalQuestions;

    return {
      lessonId: lesson.id,
      totalQuestions,
      answeredQuestions,
      correctQuestions,
      completed,
      questions: lesson.lesson_quick_questions.map((question) => {
        const userAnswer = userAnswerByQuestion.get(question.id.toString());
        return {
          id: question.id,
          text: question.text,
          order_index: question.order_index,
          selected_answer_id: userAnswer?.answer_id ?? null,
          selected_is_correct: userAnswer?.is_correct ?? null,
          answers: question.lesson_quick_answers.map((answer) => ({
            id: answer.id,
            text: answer.text,
          })),
        };
      }),
    };
  }

  private async syncRegularLessonQuickProgress(
    userId: bigint,
    lessonId: bigint,
  ) {
    const [lesson, userAnswers, existing] = await Promise.all([
      this.prisma.lessons.findUnique({
        where: { id: lessonId },
        select: {
          id: true,
          lesson_type: true,
          lesson_quick_questions: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.user_lesson_quick_answers.findMany({
        where: {
          user_id: userId,
          lesson_id: lessonId,
        },
        select: {
          question_id: true,
          is_correct: true,
        },
      }),
      this.prisma.user_lesson_progress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        select: {
          status: true,
          progress_percent: true,
        },
      }),
    ]);

    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);
    if (lesson.lesson_type !== 'lesson') return null;

    const totalQuestions = lesson.lesson_quick_questions.length;
    const answeredQuestions = userAnswers.length;
    const correctQuestions = userAnswers.filter(
      (item) => item.is_correct,
    ).length;
    const completed = totalQuestions > 0 && correctQuestions >= totalQuestions;
    const now = new Date();

    if (completed) {
      await this.prisma.user_lesson_progress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        create: {
          user_id: userId,
          lesson_id: lessonId,
          status: 'completed',
          progress_percent: 100,
          last_opened_at: now,
          completed_at: now,
        },
        update: {
          status: 'completed',
          progress_percent: 100,
          last_opened_at: now,
          completed_at: now,
        },
      });

      return {
        totalQuestions,
        answeredQuestions,
        correctQuestions,
        completed,
        progressPercent: 100,
      };
    } else {
      const currentPercent = existing?.progress_percent ?? 0;
      const basePercent =
        answeredQuestions > 0 ? Math.max(currentPercent, 10) : currentPercent;
      const nextPercent = Math.min(basePercent, 90);

      await this.prisma.user_lesson_progress.upsert({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        create: {
          user_id: userId,
          lesson_id: lessonId,
          status: nextPercent > 0 ? 'in_progress' : 'not_started',
          progress_percent: nextPercent,
          last_opened_at: now,
        },
        update: {
          status:
            nextPercent > 0
              ? 'in_progress'
              : (existing?.status ?? 'not_started'),
          progress_percent: nextPercent,
          last_opened_at: now,
          completed_at: null,
        },
      });

      return {
        totalQuestions,
        answeredQuestions,
        correctQuestions,
        completed,
        progressPercent: nextPercent,
      };
    }
  }

  async submitLessonQuickAnswer(
    userId: bigint,
    lessonIdRaw: string,
    questionIdRaw: string,
    answerIdRaw: string,
  ) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');
    const questionId = this.parseBigInt(questionIdRaw, 'questionId');
    const answerId = this.parseBigInt(answerIdRaw, 'answerId');

    const question = await this.prisma.lesson_quick_questions.findFirst({
      where: {
        id: questionId,
        lesson_id: lessonId,
      },
      select: {
        id: true,
        lesson_id: true,
        lessons: {
          select: {
            lesson_type: true,
          },
        },
        lesson_quick_answers: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            text: true,
            is_correct: true,
            feedback_text: true,
          },
        },
      },
    });

    if (!question) throw new NotFoundException('Вопрос мини-теста не найден.');
    if (question.lessons.lesson_type !== 'lesson') {
      throw new BadRequestException(
        'Ответ на мини-тест доступен только для обычного урока.',
      );
    }

    const selectedAnswer = question.lesson_quick_answers.find(
      (item) => item.id === answerId,
    );
    if (!selectedAnswer) {
      throw new BadRequestException(
        'Выбранный вариант не относится к этому вопросу.',
      );
    }

    const correctAnswer = question.lesson_quick_answers.find(
      (item) => item.is_correct,
    );

    await this.prisma.user_lesson_quick_answers.upsert({
      where: {
        user_id_question_id: {
          user_id: userId,
          question_id: questionId,
        },
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        question_id: questionId,
        answer_id: answerId,
        is_correct: selectedAnswer.is_correct,
        answered_at: new Date(),
      },
      update: {
        answer_id: answerId,
        is_correct: selectedAnswer.is_correct,
        answered_at: new Date(),
      },
    });

    const progressState = await this.syncRegularLessonQuickProgress(
      userId,
      lessonId,
    );

    return {
      lessonId,
      questionId,
      selectedAnswerId: selectedAnswer.id,
      isCorrect: selectedAnswer.is_correct,
      feedback: selectedAnswer.feedback_text,
      correctAnswerId: correctAnswer?.id ?? null,
      progress: progressState,
    };
  }

  async getLessonFinalQuizzes(lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    return this.prisma.quizzes.findMany({
      where: { lesson_id: lessonId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        lesson_id: true,
        title: true,
        description: true,
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async getFinalQuizById(quizIdRaw: string) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');

    const quiz = await this.prisma.quizzes.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        lesson_id: true,
        title: true,
        description: true,
        questions: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            text: true,
            q_type: true,
            config_json: true,
            order_index: true,
            answers: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException(LearningErrors.quizNotFound);
    return quiz;
  }

  private normalizeQuestionType(value?: string): QuestionType {
    if (!value) return 'single';
    if (!QUESTION_TYPES.includes(value as QuestionType)) {
      throw new BadRequestException(
        LearningErrors.invalidQuestionType(QUESTION_TYPES),
      );
    }
    return value as QuestionType;
  }

  private toQuestionConfigObject(value: unknown): QuestionConfigObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as QuestionConfigObject;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  private toPrismaJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  private parseSequenceConfig(configRaw: unknown): SequenceConfig | null {
    const config = this.toQuestionConfigObject(configRaw);
    const rawItems = config.items;
    const rawCorrectOrder = config.correctOrder;

    if (!Array.isArray(rawItems)) return null;

    const items = rawItems
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }
        const id =
          typeof (item as { id?: unknown }).id === 'string'
            ? (item as { id: string }).id.trim()
            : '';
        const text =
          typeof (item as { text?: unknown }).text === 'string'
            ? (item as { text: string }).text.trim()
            : '';
        if (!id || !text) return null;
        return { id, text };
      })
      .filter((item): item is { id: string; text: string } => item !== null);

    const correctOrder = this.toStringArray(rawCorrectOrder);
    if (items.length < 2 || correctOrder.length !== items.length) {
      return null;
    }

    const itemIds = items.map((item) => item.id);
    if (new Set(itemIds).size !== itemIds.length) return null;
    if (new Set(correctOrder).size !== correctOrder.length) return null;
    if (!itemIds.every((id) => correctOrder.includes(id))) return null;
    if (!correctOrder.every((id) => itemIds.includes(id))) return null;

    return { items, correctOrder };
  }

  private parseMatchingConfig(configRaw: unknown): MatchingConfig | null {
    const config = this.toQuestionConfigObject(configRaw);
    const rawLeftItems = config.leftItems;
    const rawRightItems = config.rightItems;
    const rawCorrectPairs = config.correctPairs;

    const parseItems = (
      raw: unknown,
    ): Array<{ id: string; text: string }> | null => {
      if (!Array.isArray(raw)) return null;
      const items = raw
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null;
          }
          const id =
            typeof (item as { id?: unknown }).id === 'string'
              ? (item as { id: string }).id.trim()
              : '';
          const text =
            typeof (item as { text?: unknown }).text === 'string'
              ? (item as { text: string }).text.trim()
              : '';
          if (!id || !text) return null;
          return { id, text };
        })
        .filter((item): item is { id: string; text: string } => item !== null);
      return items;
    };

    const leftItems = parseItems(rawLeftItems);
    const rightItems = parseItems(rawRightItems);
    if (!leftItems || !rightItems) return null;
    if (leftItems.length < 2 || rightItems.length < 2) return null;

    if (new Set(leftItems.map((item) => item.id)).size !== leftItems.length) {
      return null;
    }
    if (
      new Set(rightItems.map((item) => item.id)).size !== rightItems.length
    ) {
      return null;
    }

    if (!Array.isArray(rawCorrectPairs)) return null;
    const correctPairs = rawCorrectPairs
      .map((pair) => {
        if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
          return null;
        }
        const leftId =
          typeof (pair as { leftId?: unknown }).leftId === 'string'
            ? (pair as { leftId: string }).leftId.trim()
            : '';
        const rightId =
          typeof (pair as { rightId?: unknown }).rightId === 'string'
            ? (pair as { rightId: string }).rightId.trim()
            : '';
        if (!leftId || !rightId) return null;
        return { leftId, rightId };
      })
      .filter((pair): pair is { leftId: string; rightId: string } => pair !== null);

    if (correctPairs.length !== leftItems.length) return null;
    if (
      new Set(correctPairs.map((pair) => pair.leftId)).size !==
      correctPairs.length
    ) {
      return null;
    }
    if (
      new Set(correctPairs.map((pair) => pair.rightId)).size !==
      correctPairs.length
    ) {
      return null;
    }

    const leftIds = new Set(leftItems.map((item) => item.id));
    const rightIds = new Set(rightItems.map((item) => item.id));
    if (!correctPairs.every((pair) => leftIds.has(pair.leftId))) return null;
    if (!correctPairs.every((pair) => rightIds.has(pair.rightId))) return null;

    return {
      leftItems,
      rightItems,
      correctPairs,
    };
  }

  private normalizeOpenAnswer(
    value: string,
    options: {
      caseSensitive: boolean;
      trim: boolean;
      collapseSpaces: boolean;
    },
  ): string {
    let next = value;
    if (options.trim) next = next.trim();
    if (options.collapseSpaces) next = next.replace(/\s+/g, ' ');
    if (!options.caseSensitive) next = next.toLowerCase();
    return next;
  }

  private validateQuestionPayload(
    qType: QuestionType,
    answers: Array<{ isCorrect: boolean }>,
    configRaw: unknown,
  ) {
    if (qType === 'single' || qType === 'multiple') {
      this.validateChoiceAnswers(qType, answers);
      return;
    }

    if (qType === 'open') {
      const config = this.toQuestionConfigObject(configRaw);
      const accepted = this.toStringArray(config.acceptedAnswers);
      const hasFallbackAccepted = answers.some((answer) => answer.isCorrect);
      if (accepted.length === 0 && !hasFallbackAccepted) {
        throw new BadRequestException(
          LearningErrors.openQuestionNeedsAcceptedAnswers,
        );
      }
      return;
    }

    if (qType === 'sequence') {
      const parsed = this.parseSequenceConfig(configRaw);
      if (!parsed) {
        throw new BadRequestException(LearningErrors.sequenceQuestionInvalidConfig);
      }
      return;
    }

    if (qType === 'matching') {
      const parsed = this.parseMatchingConfig(configRaw);
      if (!parsed) {
        throw new BadRequestException(LearningErrors.matchingQuestionInvalidConfig);
      }
      return;
    }
  }

  private validateChoiceAnswers(
    qType: QuestionType,
    answers: Array<{ isCorrect: boolean }>,
  ) {
    if (answers.length < 2) {
      throw new BadRequestException(LearningErrors.questionMinAnswers);
    }

    const correctCount = answers.filter((answer) => answer.isCorrect).length;

    if (correctCount < 1) {
      throw new BadRequestException(LearningErrors.questionMinOneCorrect);
    }

    if (qType === 'single' && correctCount !== 1) {
      throw new BadRequestException(
        LearningErrors.singleQuestionExactOneCorrect,
      );
    }
  }

  async getAdminTopicsTree() {
    return this.prisma.topics.findMany({
      orderBy: { order_index: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        order_index: true,
        lessons: {
          orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            lesson_type: true,
            title: true,
            summary: true,
            difficulty: true,
            estimated_minutes: true,
            created_at: true,
            _count: {
              select: {
                quizzes: true,
              },
            },
          },
        },
      },
    });
  }

  createTopic(dto: CreateTopicDto) {
    return this.prisma.topics.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        order_index: dto.orderIndex ?? 0,
      },
    });
  }

  async updateTopic(topicIdRaw: string, dto: UpdateTopicDto) {
    const topicId = this.parseBigInt(topicIdRaw, 'topicId');

    const existing = await this.prisma.topics.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(LearningErrors.topicNotFound);

    return this.prisma.topics.update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.orderIndex !== undefined
          ? { order_index: dto.orderIndex }
          : {}),
      },
    });
  }

  async deleteTopic(topicIdRaw: string) {
    const topicId = this.parseBigInt(topicIdRaw, 'topicId');
    const result = await this.prisma.topics.deleteMany({
      where: { id: topicId },
    });
    if (result.count === 0)
      throw new NotFoundException(LearningErrors.topicNotFound);
    return { deleted: result.count };
  }

  async createLesson(topicIdRaw: string, dto: CreateLessonDto) {
    const topicId = this.parseBigInt(topicIdRaw, 'topicId');

    const topic = await this.prisma.topics.findUnique({
      where: { id: topicId },
      select: { id: true },
    });
    if (!topic) throw new NotFoundException(LearningErrors.topicNotFound);

    return this.prisma.lessons.create({
      data: {
        topic_id: topicId,
        lesson_type: dto.lessonType ?? 'lesson',
        title: dto.title,
        summary: dto.summary ?? null,
        content: dto.content,
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.estimatedMinutes !== undefined
          ? { estimated_minutes: dto.estimatedMinutes }
          : {}),
      },
    });
  }

  async updateLesson(lessonIdRaw: string, dto: UpdateLessonDto) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    return this.prisma.lessons.update({
      where: { id: lessonId },
      data: {
        ...(dto.lessonType !== undefined
          ? { lesson_type: dto.lessonType }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.estimatedMinutes !== undefined
          ? { estimated_minutes: dto.estimatedMinutes }
          : {}),
      },
    });
  }

  async deleteLesson(lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');
    const result = await this.prisma.lessons.deleteMany({
      where: { id: lessonId },
    });
    if (result.count === 0)
      throw new NotFoundException(LearningErrors.lessonNotFound);
    return { deleted: result.count };
  }

  async createFinalQuiz(lessonIdRaw: string, dto: CreateQuizDto) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    return this.prisma.quizzes.create({
      data: {
        lesson_id: lessonId,
        title: dto.title,
        description: dto.description ?? null,
      },
    });
  }

  async createFinalQuizWithQuestions(
    lessonIdRaw: string,
    dto: CreateQuizWithQuestionsDto,
  ) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    for (const question of dto.questions) {
      const qType = this.normalizeQuestionType(question.qType);
      this.validateQuestionPayload(
        qType,
        question.answers ?? [],
        question.config,
      );
    }

    const createdQuiz = await this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quizzes.create({
        data: {
          lesson_id: lessonId,
          title: dto.title,
          description: dto.description ?? null,
        },
      });

      for (let i = 0; i < dto.questions.length; i += 1) {
        const question = dto.questions[i];
        const qType = this.normalizeQuestionType(question.qType);
        const orderIndex = question.orderIndex ?? i + 1;

        const createdQuestion = await tx.questions.create({
          data: {
            quiz_id: quiz.id,
            text: question.text,
            q_type: qType,
            config_json: this.toPrismaJson(question.config ?? {}),
            order_index: orderIndex,
          },
        });

        for (const answer of question.answers ?? []) {
          await tx.answers.create({
            data: {
              question_id: createdQuestion.id,
              text: answer.text,
              is_correct: answer.isCorrect,
            },
          });
        }
      }

      return tx.quizzes.findUnique({
        where: { id: quiz.id },
        select: {
          id: true,
          lesson_id: true,
          title: true,
          description: true,
          questions: {
            orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
            select: {
              id: true,
              text: true,
              q_type: true,
              config_json: true,
              order_index: true,
              answers: {
                orderBy: { id: 'asc' },
                select: {
                  id: true,
                  text: true,
                  is_correct: true,
                },
              },
            },
          },
        },
      });
    });

    if (!createdQuiz) throw new NotFoundException(LearningErrors.quizNotFound);
    return createdQuiz;
  }

  async getFinalQuizForEditor(quizIdRaw: string) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');

    const quiz = await this.prisma.quizzes.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        lesson_id: true,
        title: true,
        description: true,
        questions: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            text: true,
            q_type: true,
            config_json: true,
            order_index: true,
            answers: {
              orderBy: { id: 'asc' },
              select: {
                id: true,
                text: true,
                is_correct: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException(LearningErrors.quizNotFound);
    return quiz;
  }

  async updateFinalQuiz(quizIdRaw: string, dto: UpdateQuizDto) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');

    const quiz = await this.prisma.quizzes.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException(LearningErrors.quizNotFound);

    return this.prisma.quizzes.update({
      where: { id: quizId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
    });
  }

  async deleteFinalQuiz(quizIdRaw: string) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');
    const result = await this.prisma.quizzes.deleteMany({
      where: { id: quizId },
    });
    if (result.count === 0)
      throw new NotFoundException(LearningErrors.quizNotFound);
    return { deleted: result.count };
  }

  async createFinalQuizQuestion(quizIdRaw: string, dto: CreateQuestionDto) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');
    const qType = this.normalizeQuestionType(dto.qType);
    this.validateQuestionPayload(qType, dto.answers ?? [], dto.config);

    const quiz = await this.prisma.quizzes.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) throw new NotFoundException(LearningErrors.quizNotFound);

    const createdQuestion = await this.prisma.$transaction(async (tx) => {
      let orderIndex = dto.orderIndex;
      if (orderIndex === undefined) {
        const lastQuestion = await tx.questions.findFirst({
          where: { quiz_id: quizId },
          orderBy: { order_index: 'desc' },
          select: { order_index: true },
        });
        orderIndex = (lastQuestion?.order_index ?? 0) + 1;
      }

      const question = await tx.questions.create({
        data: {
          quiz_id: quizId,
          text: dto.text,
          q_type: qType,
          config_json: this.toPrismaJson(dto.config ?? {}),
          order_index: orderIndex,
        },
      });

      for (const answer of dto.answers ?? []) {
        await tx.answers.create({
          data: {
            question_id: question.id,
            text: answer.text,
            is_correct: answer.isCorrect,
          },
        });
      }

      return tx.questions.findUnique({
        where: { id: question.id },
        select: {
          id: true,
          quiz_id: true,
          text: true,
          q_type: true,
          config_json: true,
          order_index: true,
          answers: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              text: true,
              is_correct: true,
            },
          },
        },
      });
    });

    if (!createdQuestion)
      throw new NotFoundException(LearningErrors.questionNotFound);
    return createdQuestion;
  }

  async updateQuestion(questionIdRaw: string, dto: UpdateQuestionDto) {
    const questionId = this.parseBigInt(questionIdRaw, 'questionId');

    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        q_type: true,
        config_json: true,
        answers: {
          select: {
            is_correct: true,
          },
        },
      },
    });
    if (!question) throw new NotFoundException(LearningErrors.questionNotFound);

    const nextType = this.normalizeQuestionType(dto.qType ?? question.q_type);

    if (nextType === 'single') {
      const correctCount = question.answers.filter((a) => a.is_correct).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          LearningErrors.switchToSingleRequiresOneCorrect,
        );
      }
    }

    this.validateQuestionPayload(
      nextType,
      question.answers.map((answer) => ({ isCorrect: answer.is_correct })),
      dto.config ?? question.config_json,
    );

    return this.prisma.questions.update({
      where: { id: questionId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.qType !== undefined ? { q_type: dto.qType } : {}),
        ...(dto.config !== undefined
          ? { config_json: this.toPrismaJson(dto.config) }
          : {}),
        ...(dto.orderIndex !== undefined
          ? { order_index: dto.orderIndex }
          : {}),
      },
    });
  }

  async deleteQuestion(questionIdRaw: string) {
    const questionId = this.parseBigInt(questionIdRaw, 'questionId');
    const result = await this.prisma.questions.deleteMany({
      where: { id: questionId },
    });
    if (result.count === 0)
      throw new NotFoundException(LearningErrors.questionNotFound);
    return { deleted: result.count };
  }

  async createAnswer(questionIdRaw: string, dto: CreateAnswerDto) {
    const questionId = this.parseBigInt(questionIdRaw, 'questionId');

    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        q_type: true,
        answers: {
          select: {
            id: true,
            is_correct: true,
          },
        },
      },
    });
    if (!question) throw new NotFoundException(LearningErrors.questionNotFound);
    if (!['single', 'multiple'].includes(question.q_type)) {
      throw new BadRequestException(
        LearningErrors.unsupportedAnswerOperationsForQuestionType(
          question.q_type,
        ),
      );
    }

    const isCorrect = dto.isCorrect ?? false;

    if (
      question.q_type === 'single' &&
      isCorrect &&
      question.answers.some((answer) => answer.is_correct)
    ) {
      throw new BadRequestException(
        LearningErrors.singleQuestionOnlyOneCorrect,
      );
    }

    return this.prisma.answers.create({
      data: {
        question_id: questionId,
        text: dto.text,
        is_correct: isCorrect,
      },
    });
  }

  async updateAnswer(answerIdRaw: string, dto: UpdateAnswerDto) {
    const answerId = this.parseBigInt(answerIdRaw, 'answerId');

    const answer = await this.prisma.answers.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        text: true,
        is_correct: true,
        questions: {
          select: {
            q_type: true,
            answers: {
              select: {
                id: true,
                is_correct: true,
              },
            },
          },
        },
      },
    });
    if (!answer) throw new NotFoundException(LearningErrors.answerNotFound);
    if (!['single', 'multiple'].includes(answer.questions.q_type)) {
      throw new BadRequestException(
        LearningErrors.unsupportedAnswerOperationsForQuestionType(
          answer.questions.q_type,
        ),
      );
    }

    const nextIsCorrect = dto.isCorrect ?? answer.is_correct;
    const otherAnswers = answer.questions.answers.filter(
      (item) => item.id !== answer.id,
    );

    if (
      answer.questions.q_type === 'single' &&
      nextIsCorrect &&
      otherAnswers.some((item) => item.is_correct)
    ) {
      throw new BadRequestException(
        LearningErrors.singleQuestionOnlyOneCorrect,
      );
    }

    if (
      answer.is_correct &&
      !nextIsCorrect &&
      !otherAnswers.some((item) => item.is_correct)
    ) {
      throw new BadRequestException(LearningErrors.questionMustKeepOneCorrect);
    }

    return this.prisma.answers.update({
      where: { id: answerId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.isCorrect !== undefined ? { is_correct: dto.isCorrect } : {}),
      },
    });
  }

  async deleteAnswer(answerIdRaw: string) {
    const answerId = this.parseBigInt(answerIdRaw, 'answerId');

    const answer = await this.prisma.answers.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        is_correct: true,
        questions: {
          select: {
            q_type: true,
            answers: {
              select: {
                id: true,
                is_correct: true,
              },
            },
          },
        },
      },
    });
    if (!answer) throw new NotFoundException(LearningErrors.answerNotFound);
    if (!['single', 'multiple'].includes(answer.questions.q_type)) {
      throw new BadRequestException(
        LearningErrors.unsupportedAnswerOperationsForQuestionType(
          answer.questions.q_type,
        ),
      );
    }

    const allAnswers = answer.questions.answers;
    const remaining = allAnswers.filter((item) => item.id !== answer.id);

    if (allAnswers.length <= 2) {
      throw new BadRequestException(LearningErrors.questionMustKeepTwoAnswers);
    }

    if (answer.is_correct && !remaining.some((item) => item.is_correct)) {
      throw new BadRequestException(LearningErrors.questionMustKeepOneCorrect);
    }

    const result = await this.prisma.answers.deleteMany({
      where: { id: answerId },
    });
    return { deleted: result.count };
  }

  private evaluateAnswers(params: {
    submitted: SubmitQuizAttemptDto;
    questions: Array<{
      id: bigint;
      q_type: string;
      config_json: unknown;
      answers: Array<{ id: bigint; text: string; is_correct: boolean }>;
    }>;
  }) {
    const submittedMap = new Map<
      bigint,
      {
        selectedAnswerIds: string[];
        textAnswer: string;
        orderedItemIds: string[];
        matchingPairs: Array<{ leftId: string; rightId: string }>;
      }
    >();

    for (const answer of params.submitted.answers) {
      const questionId = this.parseBigInt(answer.questionId, 'questionId');
      if (submittedMap.has(questionId)) {
        throw new BadRequestException(
          LearningErrors.duplicateAnswersForQuestion(answer.questionId),
        );
      }
      submittedMap.set(questionId, {
        selectedAnswerIds: [...new Set(answer.selectedAnswerIds ?? [])],
        textAnswer: answer.textAnswer ?? '',
        orderedItemIds: answer.orderedItemIds ?? [],
        matchingPairs: (answer.matchingPairs ?? []).map((pair) => ({
          leftId: pair.leftId,
          rightId: pair.rightId,
        })),
      });
    }

    const quizQuestionIds = new Set(
      params.questions.map((q) => q.id.toString()),
    );
    for (const questionId of submittedMap.keys()) {
      if (!quizQuestionIds.has(questionId.toString())) {
        throw new BadRequestException(
          LearningErrors.questionNotInQuiz(questionId.toString()),
        );
      }
    }

    const evaluated: EvaluatedQuestion[] = [];

    for (const question of params.questions) {
      const qType = this.normalizeQuestionType(question.q_type);
      const submittedAnswer = submittedMap.get(question.id);

      if (qType === 'single' || qType === 'multiple') {
        const selectedAnswerIds = submittedAnswer?.selectedAnswerIds ?? [];
        const answerIdsInQuestion = new Set(
          question.answers.map((answer) => answer.id.toString()),
        );

        for (const selectedId of selectedAnswerIds) {
          if (!answerIdsInQuestion.has(selectedId)) {
            throw new BadRequestException(
              LearningErrors.answerNotInQuestion(
                selectedId,
                question.id.toString(),
              ),
            );
          }
        }

        const selectedKey = [...selectedAnswerIds].sort().join(',');
        const correctIds = question.answers
          .filter((answer) => answer.is_correct)
          .map((answer) => answer.id.toString())
          .sort();
        const correctKey = correctIds.join(',');
        const isCorrect =
          correctIds.length > 0 &&
          selectedKey === correctKey &&
          (qType !== 'single' || selectedAnswerIds.length <= 1);

        evaluated.push({
          questionId: question.id,
          selectedAnswerIds,
          submittedPayload: { selectedAnswerIds },
          isCorrect,
        });
        continue;
      }

      if (qType === 'open') {
        const config = this.toQuestionConfigObject(question.config_json);
        const trim =
          typeof config.trim === 'boolean' ? config.trim : true;
        const collapseSpaces =
          typeof config.collapseSpaces === 'boolean'
            ? config.collapseSpaces
            : true;
        const caseSensitive =
          typeof config.caseSensitive === 'boolean'
            ? config.caseSensitive
            : false;
        const acceptedFromConfig = this.toStringArray(config.acceptedAnswers);
        const acceptedFromAnswers = question.answers
          .filter((answer) => answer.is_correct)
          .map((answer) => answer.text);
        const acceptedAnswers =
          acceptedFromConfig.length > 0
            ? acceptedFromConfig
            : acceptedFromAnswers;

        const rawText = submittedAnswer?.textAnswer ?? '';
        const normalizedText = this.normalizeOpenAnswer(rawText, {
          trim,
          collapseSpaces,
          caseSensitive,
        });
        const normalizedAccepted = acceptedAnswers
          .map((value) =>
            this.normalizeOpenAnswer(value, {
              trim,
              collapseSpaces,
              caseSensitive,
            }),
          )
          .filter((value) => value.length > 0);

        const isCorrect =
          normalizedText.length > 0 &&
          normalizedAccepted.includes(normalizedText);

        evaluated.push({
          questionId: question.id,
          selectedAnswerIds: [],
          submittedPayload: { textAnswer: rawText },
          isCorrect,
        });
        continue;
      }

      if (qType === 'sequence') {
        const parsedConfig = this.parseSequenceConfig(question.config_json);
        if (!parsedConfig) {
          throw new BadRequestException(
            LearningErrors.sequenceQuestionInvalidConfig,
          );
        }

        const orderedItemIds = submittedAnswer?.orderedItemIds ?? [];
        const itemIds = parsedConfig.items.map((item) => item.id);
        const hasValidShape =
          orderedItemIds.length === itemIds.length &&
          new Set(orderedItemIds).size === orderedItemIds.length &&
          orderedItemIds.every((id) => itemIds.includes(id));
        const isCorrect =
          hasValidShape &&
          orderedItemIds.every(
            (id, index) => id === parsedConfig.correctOrder[index],
          );

        evaluated.push({
          questionId: question.id,
          selectedAnswerIds: [],
          submittedPayload: { orderedItemIds },
          isCorrect,
        });
        continue;
      }

      const parsedConfig = this.parseMatchingConfig(question.config_json);
      if (!parsedConfig) {
        throw new BadRequestException(
          LearningErrors.matchingQuestionInvalidConfig,
        );
      }

      const submittedPairs = submittedAnswer?.matchingPairs ?? [];
      const normalizedPairs = submittedPairs
        .map((pair) => ({
          leftId: pair.leftId.trim(),
          rightId: pair.rightId.trim(),
        }))
        .filter((pair) => pair.leftId.length > 0 && pair.rightId.length > 0);

      const leftIds = new Set(parsedConfig.leftItems.map((item) => item.id));
      const rightIds = new Set(parsedConfig.rightItems.map((item) => item.id));
      const hasValidShape =
        normalizedPairs.length === parsedConfig.leftItems.length &&
        new Set(normalizedPairs.map((pair) => pair.leftId)).size ===
          normalizedPairs.length &&
        new Set(normalizedPairs.map((pair) => pair.rightId)).size ===
          normalizedPairs.length &&
        normalizedPairs.every((pair) => leftIds.has(pair.leftId)) &&
        normalizedPairs.every((pair) => rightIds.has(pair.rightId));

      const expectedMap = new Map(
        parsedConfig.correctPairs.map((pair) => [pair.leftId, pair.rightId]),
      );
      const isCorrect =
        hasValidShape &&
        normalizedPairs.every(
          (pair) => expectedMap.get(pair.leftId) === pair.rightId,
        );

      evaluated.push({
        questionId: question.id,
        selectedAnswerIds: [],
        submittedPayload: { matchingPairs: normalizedPairs },
        isCorrect,
      });
    }

    const maxScore = evaluated.length;
    const score = evaluated.filter((item) => item.isCorrect).length;

    return { evaluated, score, maxScore };
  }

  async submitFinalQuizAttempt(
    userId: bigint,
    quizIdRaw: string,
    dto: SubmitQuizAttemptDto,
  ) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');

    const quiz = await this.prisma.quizzes.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        lesson_id: true,
        questions: {
          orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            q_type: true,
            config_json: true,
            answers: {
              select: {
                id: true,
                text: true,
                is_correct: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException(LearningErrors.quizNotFound);

    const { evaluated, score, maxScore } = this.evaluateAnswers({
      submitted: dto,
      questions: quiz.questions,
    });

    const attempt = await this.prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.user_quiz_attempts.create({
        data: {
          user_id: userId,
          quiz_id: quizId,
          started_at: new Date(),
          finished_at: new Date(),
          score,
          max_score: maxScore,
        },
      });

      for (const question of evaluated) {
        await tx.user_answers.create({
          data: {
            attempt_id: createdAttempt.id,
            question_id: question.questionId,
            selected_answer_ids: question.selectedAnswerIds,
            submitted_payload: this.toPrismaJson(question.submittedPayload),
            is_correct: question.isCorrect,
          },
        });
      }

      return createdAttempt;
    });

    const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    await this.upsertLessonProgressFromQuiz(userId, quiz.lesson_id);

    return {
      attemptId: attempt.id,
      quizId,
      score,
      maxScore,
      percent,
      answers: evaluated,
      finishedAt: attempt.finished_at,
    };
  }

  async getMyFinalQuizAttempts(userId: bigint, quizIdRaw: string) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');

    return this.prisma.user_quiz_attempts.findMany({
      where: { user_id: userId, quiz_id: quizId },
      orderBy: { started_at: 'desc' },
      select: {
        id: true,
        quiz_id: true,
        started_at: true,
        finished_at: true,
        score: true,
        max_score: true,
        user_answers: {
          orderBy: { question_id: 'asc' },
          select: {
            question_id: true,
            selected_answer_ids: true,
            submitted_payload: true,
            is_correct: true,
          },
        },
      },
    });
  }
}
