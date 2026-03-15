import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { LearningErrors } from '../common/errors';
import { LearningService } from './learning.service';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';

@Controller('learning')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  private getUserId(req: Request): bigint {
    const sub = (req.user as { sub?: string })?.sub;
    if (!sub) throw new UnauthorizedException(LearningErrors.unauthorized);
    return BigInt(sub);
  }

  @Get('topics')
  getTopicsWithLessons(@Req() req: Request) {
    return this.learning.getTopicsWithLessons(this.getUserId(req));
  }

  @Post('lessons/:lessonId/open')
  markLessonOpened(@Req() req: Request, @Param('lessonId') lessonId: string) {
    return this.learning.markLessonOpened(this.getUserId(req), lessonId);
  }

  @Post('lessons/:lessonId/complete')
  markLessonCompleted(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
  ) {
    return this.learning.markLessonCompleted(this.getUserId(req), lessonId);
  }

  @Get('lessons/:lessonId')
  getLesson(@Param('lessonId') lessonId: string) {
    return this.learning.getLessonById(lessonId);
  }

  @Get('lessons/:lessonId/quizzes')
  getLessonQuizzes(@Param('lessonId') lessonId: string) {
    return this.learning.getLessonQuizzes(lessonId);
  }

  @Get('quizzes/:quizId')
  getQuiz(@Param('quizId') quizId: string) {
    return this.learning.getQuizById(quizId);
  }

  @Post('quizzes/:quizId/attempts')
  submitQuizAttempt(
    @Req() req: Request,
    @Param('quizId') quizId: string,
    @Body() dto: SubmitQuizAttemptDto,
  ) {
    return this.learning.submitQuizAttempt(this.getUserId(req), quizId, dto);
  }

  @Get('quizzes/:quizId/attempts/me')
  getMyQuizAttempts(@Req() req: Request, @Param('quizId') quizId: string) {
    return this.learning.getMyQuizAttempts(this.getUserId(req), quizId);
  }
}
