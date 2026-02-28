import {
  Controller,
  Get,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const sub = (req.user as any)?.sub;
    if (!sub) throw new UnauthorizedException();
    const user = await this.users.findById(BigInt(sub));
    if (!user) throw new UnauthorizedException();
    const { ...safe } = user as any;
    return safe;
  }
}
