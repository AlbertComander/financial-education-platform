import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningAdminController } from './learning-admin.controller';
import { LearningService } from './learning.service';

@Module({
  controllers: [LearningController, LearningAdminController],
  providers: [LearningService],
})
export class LearningModule {}
