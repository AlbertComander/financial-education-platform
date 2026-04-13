require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const firstTopic = await prisma.topics.findFirst({
      orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
      },
    });

    if (!firstTopic) {
      throw new Error('Не найдена ни одна тема.');
    }

    const finalExamLesson = await prisma.lessons.findFirst({
      where: {
        topic_id: firstTopic.id,
        lesson_type: 'final_exam',
      },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
      },
    });

    if (!finalExamLesson) {
      throw new Error(
        `Для первой темы "${firstTopic.title}" не найден урок типа final_exam.`,
      );
    }

    const quizTitle = `Финальный тест: ${firstTopic.title}`;
    const existingQuiz = await prisma.quizzes.findFirst({
      where: { lesson_id: finalExamLesson.id },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const quiz = existingQuiz
      ? await prisma.quizzes.update({
          where: { id: existingQuiz.id },
          data: {
            title: quizTitle,
            description:
              'Итоговый тест с пятью типами вопросов: single, multiple, open, sequence, matching.',
          },
          select: { id: true },
        })
      : await prisma.quizzes.create({
          data: {
            lesson_id: finalExamLesson.id,
            title: quizTitle,
            description:
              'Итоговый тест с пятью типами вопросов: single, multiple, open, sequence, matching.',
          },
          select: { id: true },
        });

    await prisma.$transaction(async (tx) => {
      await tx.user_quiz_attempts.deleteMany({
        where: { quiz_id: quiz.id },
      });

      await tx.questions.deleteMany({
        where: { quiz_id: quiz.id },
      });

      const singleQuestion = await tx.questions.create({
        data: {
          quiz_id: quiz.id,
          q_type: 'single',
          text: 'Что лучше всего помогает снизить риск кассового разрыва в личном бюджете?',
          order_index: 1,
          config_json: {},
        },
        select: { id: true },
      });

      await tx.answers.createMany({
        data: [
          {
            question_id: singleQuestion.id,
            text: 'Создание резервного фонда на 3-6 месяцев расходов',
            is_correct: true,
          },
          {
            question_id: singleQuestion.id,
            text: 'Ежемесячная трата всего остатка средств',
            is_correct: false,
          },
          {
            question_id: singleQuestion.id,
            text: 'Игнорирование обязательных платежей до конца месяца',
            is_correct: false,
          },
        ],
      });

      const multipleQuestion = await tx.questions.create({
        data: {
          quiz_id: quiz.id,
          q_type: 'multiple',
          text: 'Какие действия напрямую повышают финансовую устойчивость?',
          order_index: 2,
          config_json: {},
        },
        select: { id: true },
      });

      await tx.answers.createMany({
        data: [
          {
            question_id: multipleQuestion.id,
            text: 'Фиксация лимитов по категориям расходов',
            is_correct: true,
          },
          {
            question_id: multipleQuestion.id,
            text: 'Планирование ежемесячных накоплений',
            is_correct: true,
          },
          {
            question_id: multipleQuestion.id,
            text: 'Импульсивные покупки при каждой скидке',
            is_correct: false,
          },
          {
            question_id: multipleQuestion.id,
            text: 'Постоянное использование кредитного лимита без плана',
            is_correct: false,
          },
        ],
      });

      await tx.questions.create({
        data: {
          quiz_id: quiz.id,
          q_type: 'open',
          text: 'Как называется правило распределения дохода: 50% потребности, 30% желания, 20% накопления?',
          order_index: 3,
          config_json: {
            acceptedAnswers: [
              'правило 50/30/20',
              '50/30/20',
              'метод 50/30/20',
            ],
            trim: true,
            collapseSpaces: true,
            caseSensitive: false,
          },
        },
      });

      await tx.questions.create({
        data: {
          quiz_id: quiz.id,
          q_type: 'sequence',
          text: 'Расположите шаги построения личного бюджета в правильной последовательности.',
          order_index: 4,
          config_json: {
            items: [
              { id: 'collect_income', text: 'Собрать данные о доходах' },
              {
                id: 'classify_expenses',
                text: 'Классифицировать обязательные и переменные расходы',
              },
              { id: 'set_limits', text: 'Установить лимиты по категориям' },
              {
                id: 'plan_savings',
                text: 'Запланировать накопления и финансовую подушку',
              },
            ],
            correctOrder: [
              'collect_income',
              'classify_expenses',
              'set_limits',
              'plan_savings',
            ],
          },
        },
      });

      await tx.questions.create({
        data: {
          quiz_id: quiz.id,
          q_type: 'matching',
          text: 'Соотнесите финансовый инструмент и его основную задачу.',
          order_index: 5,
          config_json: {
            leftItems: [
              { id: 'reserve_fund', text: 'Резервный фонд' },
              { id: 'insurance', text: 'Страхование' },
              { id: 'diversification', text: 'Диверсификация' },
            ],
            rightItems: [
              {
                id: 'unexpected_expenses',
                text: 'Покрытие непредвиденных расходов',
              },
              { id: 'big_losses', text: 'Защита от крупных убытков' },
              { id: 'portfolio_risk', text: 'Снижение риска портфеля' },
            ],
            correctPairs: [
              { leftId: 'reserve_fund', rightId: 'unexpected_expenses' },
              { leftId: 'insurance', rightId: 'big_losses' },
              { leftId: 'diversification', rightId: 'portfolio_risk' },
            ],
          },
        },
      });
    });

    console.log(
      `Готово: обновлен финальный тест в первой теме "${firstTopic.title}" (quizId=${quiz.id.toString()}).`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
