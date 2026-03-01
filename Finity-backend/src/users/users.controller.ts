import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Delete,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UsersController {
  constructor(private users: UsersService) {}

  private getUserId(req: Request): bigint {
    const sub = (req.user as { sub?: string })?.sub;
    if (!sub) throw new UnauthorizedException();
    return BigInt(sub);
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.users.getSafeUser(this.getUserId(req));
  }

  @Get('profile')
  profile(@Req() req: Request) {
    return this.users.getProfile(this.getUserId(req));
  }

  @Patch('profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(this.getUserId(req), dto);
  }

  @Get('settings')
  settings(@Req() req: Request) {
    return this.users.getSettings(this.getUserId(req));
  }

  @Patch('settings')
  updateSettings(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(this.getUserId(req), dto);
  }

  @Roles('admin')
  @Delete(':id')
  deleteUserById(@Param('id') id: string) {
    return this.users.deleteById(BigInt(id));
  }
}
