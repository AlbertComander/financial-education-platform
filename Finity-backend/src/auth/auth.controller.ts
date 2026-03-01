import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { RtAuthGuard } from './rt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/auth' });
  }

  @Public()
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.register(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @UseGuards(RtAuthGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as any).cookies.refresh_token as string; // guard уже гарантирует, что он есть и валиден

    const { accessToken, refreshToken } = await this.auth.refresh(
      token,
      req.headers['user-agent'],
      req.ip,
    );

    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @UseGuards(RtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.refresh_token as string | undefined;
    if (token) await this.auth.logout(token);

    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Get('me')
  getMe(@Req() req: Request) {
    return req.user;
  }
}
