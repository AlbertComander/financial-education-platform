import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Get,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth/refresh',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

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

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req as any).cookies?.refresh_token as string | undefined;
    if (!token) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } = await this.auth.refresh(
      token,
      req.headers['user-agent'],
      req.ip,
    );
    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.refresh_token as string | undefined;
    if (token) await this.auth.logout(token);

    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req) {
    return req.user;
  }
}
