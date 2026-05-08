import { eq } from 'drizzle-orm';

import type { AdminUserRepository, AdminUserRecord } from './auth-service';
import type { createDbClient } from '../../db/index';
import { users } from '../../db/schema';

type DbClient = ReturnType<typeof createDbClient>['db'];

export const createAdminUserRepository = (db: DbClient): AdminUserRepository => ({
  async findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    return user ?? null;
  },
});
