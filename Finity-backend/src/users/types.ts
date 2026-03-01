import type { Prisma } from '@prisma/client';

export type SafeUser = Prisma.usersGetPayload<{
  select: { id: true; email: true; role: true; created_at: true };
}>;

export type UserProfile = Prisma.user_profileGetPayload<Record<string, never>>;
export type UserSettings = Prisma.user_settingsGetPayload<
  Record<string, never>
>;
