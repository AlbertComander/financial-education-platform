import {
  BadRequestException,
  Body,
  Controller,
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
import { DemoAccountService } from './demo-account.service';
import { UpdateDemoInstrumentProfileDto } from './dto/admin-instrument-profile.dto';

@Controller('admin/demo-instruments')
@Roles('admin')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DemoInstrumentAdminController {
  constructor(private readonly demoAccount: DemoAccountService) {}

  @Get()
  getInstruments() {
    return this.demoAccount.getAdminInstruments();
  }

  @Post('market-data/import')
  importMarketData() {
    return this.demoAccount.importInstrumentMarketData();
  }

  @Post('profiles/fill-defaults')
  fillProfileDefaults() {
    return this.demoAccount.fillInstrumentProfileDefaults();
  }

  @Patch(':instrumentId')
  updateInstrument(
    @Param('instrumentId') instrumentId: string,
    @Body() dto: UpdateDemoInstrumentProfileDto,
  ) {
    return this.demoAccount.updateAdminInstrumentProfile(instrumentId, dto);
  }

  @Post(':instrumentId/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  uploadInstrumentLogo(
    @Param('instrumentId') instrumentId: string,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Логотип не передан.');
    }

    return this.demoAccount.saveAdminInstrumentLogo(instrumentId, file);
  }
}
