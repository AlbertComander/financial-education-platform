import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  getSafeUser(id: bigint) {
    return this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, created_at: true },
    });
  }

  getProfile(userId: bigint) {
    return this.prisma.user_profile.findUnique({ where: { user_id: userId } });
  }

  updateProfile(userId: bigint, dto: UpdateProfileDto) {
    return this.prisma.user_profile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...dto,
        updated_at: new Date(),
      },
      update: {
        ...dto,
        updated_at: new Date(),
      },
    });
  }

  getSettings(userId: bigint) {
    return this.prisma.user_settings.findUnique({ where: { user_id: userId } });
  }

  updateSettings(userId: bigint, dto: UpdateSettingsDto) {
    return this.prisma.user_settings.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...dto,
        updated_at: new Date(),
      },
      update: {
        ...dto,
        updated_at: new Date(),
      },
    });
  }

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email } });
  }

  findById(id: bigint) {
    return this.prisma.users.findUnique({ where: { id } });
  }

  create(email: string, passwordHash: string) {
    return this.prisma.users.create({
      data: {
        email,
        password_hash: passwordHash,
        role: 'user',
        created_at: new Date(),
      },
    });
  }

  async deleteById(userId: bigint) {
    const res = await this.prisma.users.deleteMany({ where: { id: userId } });
    return { deleted: res.count };
  }
}
