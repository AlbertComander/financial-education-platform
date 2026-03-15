import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  isCorrect: boolean;
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
    lessonRecords: Array<{ id: bigint; quizzes: Array<{ id: bigint }> }>,
  ) {
    const lessonIds = lessonRecords.map((lesson) => lesson.id);
    const allQuizIds = lessonRecords.flatMap((lesson) =>
      lesson.quizzes.map((quiz) => quiz.id),
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

    const result = new Map<string, LessonProgressSnapshot>();

    for (const lesson of lessonRecords) {
      const lessonKey = lesson.id.toString();
      const progressRow = lessonProgressByLesson.get(lessonKey);
      const quizPercents = lesson.quizzes
        .map((quiz) => bestPercentByQuiz.get(quiz.id.toString()))
        .filter((value): value is number => value !== undefined);
      const quizzesTotal = lesson.quizzes.length;
      const quizzesSolved = quizPercents.length;
      const quizzesPassed = quizPercents.filter((value) => value >= 70).length;
      const hasQuizAttempt = quizPercents.length > 0;
      const bestQuizPercent =
        quizPercents.length > 0
          ? Math.max(...quizPercents)
          : null;

      const completedByQuiz = quizzesTotal > 0 && quizzesSolved === quizzesTotal;
      const hasDbProgress = (progressRow?.progress_percent ?? 0) > 0;
      const startedByDb = progressRow?.status === 'in_progress' || hasDbProgress;
      const completedByDb =
        progressRow?.status === 'completed' ||
        (progressRow?.progress_percent ?? 0) >= 100;

      const isCompleted = completedByQuiz || completedByDb;
      const isStarted = isCompleted || hasQuizAttempt || startedByDb;

      let progressPercent = 0;
      if (isCompleted) {
        progressPercent = 100;
      } else if (quizzesTotal > 0) {
        const quizProgress = Math.round((quizzesSolved / quizzesTotal) * 100);
        progressPercent = Math.max(quizProgress, progressRow?.progress_percent ?? 0);
        if (isStarted && progressPercent === 0) {
          progressPercent = 10;
        }
      } else {
        progressPercent = Math.max(progressRow?.progress_percent ?? 0, isStarted ? 10 : 0);
      }

      if (progressPercent > 100) progressPercent = 100;

      result.set(lessonKey, {
        status: isCompleted ? 'completed' : isStarted ? 'in_progress' : 'not_started',
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
        quizzes: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException(LearningErrors.lessonNotFound);

    const [progressMap, existing] = await Promise.all([
      this.buildLessonProgressMap(userId, [lesson]),
      this.prisma.user_lesson_progress.findUnique({
        where: {
          user_id_lesson_id: {
            user_id: userId,
            lesson_id: lessonId,
          },
        },
        select: {
          id: true,
          progress_percent: true,
        },
      }),
    ]);

    const snapshot = progressMap.get(lessonId.toString());
    if (!snapshot) {
      throw new NotFoundException(LearningErrors.lessonNotFound);
    }

    const now = new Date();

    if (snapshot.status === 'not_started') {
      return existing;
    }

    if (!existing) {
      return this.prisma.user_lesson_progress.create({
        data: {
          user_id: userId,
          lesson_id: lessonId,
          status: snapshot.status,
          progress_percent: snapshot.progress_percent,
          last_opened_at: now,
          completed_at: snapshot.status === 'completed' ? now : null,
        },
      });
    }

    const nextProgress = Math.max(existing.progress_percent, snapshot.progress_percent);

    return this.prisma.user_lesson_progress.update({
      where: {
        user_id_lesson_id: {
          user_id: userId,
          lesson_id: lessonId,
        },
      },
      data: {
        status: snapshot.status,
        progress_percent: nextProgress,
        last_opened_at: now,
        completed_at: snapshot.status === 'completed' ? now : null,
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
            title: true,
            summary: true,
            difficulty: true,
            estimated_minutes: true,
            created_at: true,
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
    const progressMap = await this.buildLessonProgressMap(userId, lessonRecords);

    return topics.map((topic) => ({
      ...topic,
      lessons: topic.lessons.map((lesson) => {
        const snapshot = progressMap.get(lesson.id.toString()) ?? {
          status: 'not_started' as const,
          progress_percent: 0,
          last_opened_at: null,
          completed_at: null,
          quizzes_total: lesson.quizzes.length,
          quizzes_solved: 0,
          quizzes_passed: 0,
          best_quiz_percent: null,
        };

        return {
          id: lesson.id,
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
      select: { id: true },
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
      select: { id: true },
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

  async getLessonById(lessonIdRaw: string) {
    const lessonId = this.parseBigInt(lessonIdRaw, 'lessonId');

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        topic_id: true,
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

  async getLessonQuizzes(lessonIdRaw: string) {
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

  async getQuizById(quizIdRaw: string) {
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

  private validateQuestionAnswerSet(
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

  async createQuiz(lessonIdRaw: string, dto: CreateQuizDto) {
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

  async createQuizWithQuestions(
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
      this.validateQuestionAnswerSet(qType, question.answers);
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
            order_index: orderIndex,
          },
        });

        for (const answer of question.answers) {
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

  async getQuizForEditor(quizIdRaw: string) {
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

  async updateQuiz(quizIdRaw: string, dto: UpdateQuizDto) {
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

  async deleteQuiz(quizIdRaw: string) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');
    const result = await this.prisma.quizzes.deleteMany({
      where: { id: quizId },
    });
    if (result.count === 0)
      throw new NotFoundException(LearningErrors.quizNotFound);
    return { deleted: result.count };
  }

  async createQuestion(quizIdRaw: string, dto: CreateQuestionDto) {
    const quizId = this.parseBigInt(quizIdRaw, 'quizId');
    const qType = this.normalizeQuestionType(dto.qType);
    this.validateQuestionAnswerSet(qType, dto.answers);

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
          order_index: orderIndex,
        },
      });

      for (const answer of dto.answers) {
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

    return this.prisma.questions.update({
      where: { id: questionId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.qType !== undefined ? { q_type: dto.qType } : {}),
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
      answers: Array<{ id: bigint; is_correct: boolean }>;
    }>;
  }) {
    const submittedMap = new Map<bigint, string[]>();

    for (const answer of params.submitted.answers) {
      const questionId = this.parseBigInt(answer.questionId, 'questionId');
      if (submittedMap.has(questionId)) {
        throw new BadRequestException(
          LearningErrors.duplicateAnswersForQuestion(answer.questionId),
        );
      }
      submittedMap.set(questionId, [...new Set(answer.selectedAnswerIds)]);
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
      const selectedAnswerIds = submittedMap.get(question.id) ?? [];
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
      const isCorrect = correctIds.length > 0 && selectedKey === correctKey;

      evaluated.push({
        questionId: question.id,
        selectedAnswerIds,
        isCorrect,
      });
    }

    const maxScore = evaluated.length;
    const score = evaluated.filter((item) => item.isCorrect).length;

    return { evaluated, score, maxScore };
  }

  async submitQuizAttempt(
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

  async getMyQuizAttempts(userId: bigint, quizIdRaw: string) {
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
            is_correct: true,
          },
        },
      },
    });
  }
}
