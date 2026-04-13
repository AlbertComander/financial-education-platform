import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
import {
  CreateLessonQuickQuestionDto,
  UpdateLessonQuickQuestionDto,
} from './dto/admin/quick-check.dto';

@Controller('admin/learning')
@Roles('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LearningAdminController {
  constructor(private readonly learning: LearningService) {}

  @Post('lesson-images')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadLessonImage(
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Изображение не передано.');
    }

    return this.learning.saveAdminLessonImage(file);
  }

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

  @Get('lessons/:lessonId')
  getLessonEditor(@Param('lessonId') lessonId: string) {
    return this.learning.getAdminLessonEditor(lessonId);
  }

  @Delete('lessons/:lessonId')
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.learning.deleteLesson(lessonId);
  }

  @Post('lessons/:lessonId/quick-questions')
  createLessonQuickQuestion(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateLessonQuickQuestionDto,
  ) {
    return this.learning.createLessonQuickQuestion(lessonId, dto);
  }

  @Patch('quick-questions/:questionId')
  updateLessonQuickQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateLessonQuickQuestionDto,
  ) {
    return this.learning.updateLessonQuickQuestion(questionId, dto);
  }

  @Delete('quick-questions/:questionId')
  deleteLessonQuickQuestion(@Param('questionId') questionId: string) {
    return this.learning.deleteLessonQuickQuestion(questionId);
  }

  @Post('lessons/:lessonId/final-quizzes')
  createFinalQuiz(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.learning.createFinalQuiz(lessonId, dto);
  }

  @Post('lessons/:lessonId/final-quizzes/constructor')
  createFinalQuizWithQuestions(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuizWithQuestionsDto,
  ) {
    return this.learning.createFinalQuizWithQuestions(lessonId, dto);
  }

  @Get('final-quizzes/:quizId')
  getFinalQuizEditor(@Param('quizId') quizId: string) {
    return this.learning.getFinalQuizForEditor(quizId);
  }

  @Patch('final-quizzes/:quizId')
  updateFinalQuiz(@Param('quizId') quizId: string, @Body() dto: UpdateQuizDto) {
    return this.learning.updateFinalQuiz(quizId, dto);
  }

  @Delete('final-quizzes/:quizId')
  deleteFinalQuiz(@Param('quizId') quizId: string) {
    return this.learning.deleteFinalQuiz(quizId);
  }

  @Post('final-quizzes/:quizId/questions')
  createFinalQuizQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.learning.createFinalQuizQuestion(quizId, dto);
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
