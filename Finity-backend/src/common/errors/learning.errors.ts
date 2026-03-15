export const LearningErrors = {
  unauthorized: 'Пользователь не авторизован',

  invalidId: (fieldName: string) =>
    `Поле "${fieldName}" должно содержать корректный числовой идентификатор`,
  invalidQuestionType: (allowed: readonly string[]) =>
    `Поле "qType" должно быть одним из значений: ${allowed.join(', ')}`,

  topicNotFound: 'Тема не найдена',
  lessonNotFound: 'Урок не найден',
  quizNotFound: 'Тест не найден',
  questionNotFound: 'Вопрос не найден',
  answerNotFound: 'Вариант ответа не найден',

  questionMinAnswers: 'У вопроса должно быть минимум 2 варианта ответа',
  questionMinOneCorrect: 'У вопроса должен быть хотя бы один правильный ответ',
  singleQuestionExactOneCorrect:
    'Для вопроса типа "single" должен быть ровно один правильный ответ',
  singleQuestionOnlyOneCorrect:
    'Для вопроса типа "single" может быть только один правильный ответ',
  switchToSingleRequiresOneCorrect:
    'Переключение на тип "single" возможно только при одном правильном ответе',
  questionMustKeepOneCorrect:
    'У вопроса должен оставаться хотя бы один правильный ответ',
  questionMustKeepTwoAnswers:
    'У вопроса должно оставаться минимум 2 варианта ответа',

  duplicateAnswersForQuestion: (questionId: string) =>
    `Для вопроса ${questionId} отправлены дублирующиеся ответы`,
  questionNotInQuiz: (questionId: string) =>
    `Вопрос ${questionId} не относится к выбранному тесту`,
  answerNotInQuestion: (answerId: string, questionId: string) =>
    `Вариант ответа ${answerId} не относится к вопросу ${questionId}`,
};
