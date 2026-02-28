import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type User = Awaited<ReturnType<PrismaService['users']['findUnique']>>;
type UserNonNull = NonNullable<User>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string): Promise<User> {
    return this.prisma.users.findUnique({ where: { email } });
  }

  findById(id: bigint): Promise<User> {
    return this.prisma.users.findUnique({ where: { id } });
  }

  create(email: string, passwordHash: string): Promise<UserNonNull> {
    return this.prisma.users.create({
      data: {
        email,
        password_hash: passwordHash,
        role: 'user',
      },
    });
  }
}
