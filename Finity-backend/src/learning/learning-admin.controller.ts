import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { LearningService } from './learning.service';
import { CreateTopicDto, UpdateTopicDto } from './dto/admin/topic.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/admin/lesson.dto';
import {
  CreateQuizDto,
  CreateQuizWithQuestionsDto,
  UpdateQuizDto,
} from './dto/admin/quiz.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/admin/question.dto';
import { CreateAnswerDto, UpdateAnswerDto } from './dto/admin/answer.dto';

@Controller('admin/learning')
@Roles('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LearningAdminController {
  constructor(private readonly learning: LearningService) {}

  @Get('topics')
  getTopicsTree() {
    return this.learning.getAdminTopicsTree();
  }

  @Post('topics')
  createTopic(@Body() dto: CreateTopicDto) {
    return this.learning.createTopic(dto);
  }

  @Patch('topics/:topicId')
  updateTopic(@Param('topicId') topicId: string, @Body() dto: UpdateTopicDto) {
    return this.learning.updateTopic(topicId, dto);
  }

  @Delete('topics/:topicId')
  deleteTopic(@Param('topicId') topicId: string) {
    return this.learning.deleteTopic(topicId);
  }

  @Post('topics/:topicId/lessons')
  createLesson(
    @Param('topicId') topicId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.learning.createLesson(topicId, dto);
  }

  @Patch('lessons/:lessonId')
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.learning.updateLesson(lessonId, dto);
  }

  @Delete('lessons/:lessonId')
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.learning.deleteLesson(lessonId);
  }

  @Post('lessons/:lessonId/quizzes')
  createQuiz(@Param('lessonId') lessonId: string, @Body() dto: CreateQuizDto) {
    return this.learning.createQuiz(lessonId, dto);
  }

  @Post('lessons/:lessonId/quizzes/constructor')
  createQuizWithQuestions(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuizWithQuestionsDto,
  ) {
    return this.learning.createQuizWithQuestions(lessonId, dto);
  }

  @Get('quizzes/:quizId')
  getQuizEditor(@Param('quizId') quizId: string) {
    return this.learning.getQuizForEditor(quizId);
  }

  @Patch('quizzes/:quizId')
  updateQuiz(@Param('quizId') quizId: string, @Body() dto: UpdateQuizDto) {
    return this.learning.updateQuiz(quizId, dto);
  }

  @Delete('quizzes/:quizId')
  deleteQuiz(@Param('quizId') quizId: string) {
    return this.learning.deleteQuiz(quizId);
  }

  @Post('quizzes/:quizId/questions')
  createQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.learning.createQuestion(quizId, dto);
  }

  @Patch('questions/:questionId')
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.learning.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  deleteQuestion(@Param('questionId') questionId: string) {
    return this.learning.deleteQuestion(questionId);
  }

  @Post('questions/:questionId/answers')
  createAnswer(
    @Param('questionId') questionId: string,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.learning.createAnswer(questionId, dto);
  }

  @Patch('answers/:answerId')
  updateAnswer(
    @Param('answerId') answerId: string,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.learning.updateAnswer(answerId, dto);
  }

  @Delete('answers/:answerId')
  deleteAnswer(@Param('answerId') answerId: string) {
    return this.learning.deleteAnswer(answerId);
  }
}
