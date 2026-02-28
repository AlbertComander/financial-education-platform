import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

type RefreshPayload = {
  sub: string;
  email?: string;
  role?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private signAccessToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET')!;
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';

    return this.jwt.signAsync(payload as object, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  private signRefreshToken(payload: JwtPayload): Promise<string> {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET')!;
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    return this.jwt.signAsync(payload as object, {
      secret,
      expiresIn: expiresIn as any,
    });
  }

  private decodeExpToDate(token: string): Date {
    const decoded = this.jwt.decode(token);
    const exp = decoded?.exp;

    if (typeof exp !== 'number') {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    return new Date(exp * 1000);
  }

  private storeRefreshToken(params: {
    userId: bigint;
    refreshToken: string;
    userAgent?: string;
    ip?: string;
  }) {
    const tokenHash = this.sha256(params.refreshToken);
    const expiresAt = this.decodeExpToDate(params.refreshToken);

    return this.prisma.refresh_tokens.create({
      data: {
        user_id: params.userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: params.userAgent,
        ip: params.ip,
      },
    });
  }

  async register(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('User already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.create(email, passwordHash);

    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);

    await this.storeRefreshToken({
      userId: user.id,
      refreshToken,
      userAgent,
      ip,
    });

    return { accessToken, refreshToken };
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordHash = String((user as any).password_hash);
    const ok = await bcrypt.compare(password, passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);

    await this.storeRefreshToken({
      userId: user.id,
      refreshToken,
      userAgent,
      ip,
    });

    return { accessToken, refreshToken };
  }

  async refresh(oldRefreshToken: string, userAgent?: string, ip?: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(oldRefreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const oldHash = this.sha256(oldRefreshToken);
    const stored = await this.prisma.refresh_tokens.findFirst({
      where: {
        token_hash: oldHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });
    if (!stored)
      throw new UnauthorizedException('Refresh token revoked/expired');

    await this.prisma.refresh_tokens.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    const userId = BigInt(payload.sub);
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const newPayload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.signAccessToken(newPayload);
    const refreshToken = await this.signRefreshToken(newPayload);

    const newStored = await this.storeRefreshToken({
      userId: user.id,
      refreshToken,
      userAgent,
      ip,
    });

    await this.prisma.refresh_tokens.update({
      where: { id: stored.id },
      data: { replaced_by: newStored.id },
    });

    return { accessToken, refreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.sha256(refreshToken);
    await this.prisma.refresh_tokens.updateMany({
      where: { token_hash: tokenHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}
