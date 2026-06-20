import { hash } from 'bcryptjs';

import type { AdminEnv } from '@te-pinta/shared';

import { loadEnvFile } from '../config/dotenv';
import { getEnv } from '../config/env';
import { defaultSettings } from '../modules/settings/settings-service';
import { createDbClientFromEnv } from './index';
import { settings, users } from './schema';

type DbClient = ReturnType<typeof createDbClientFromEnv>['db'];

export type AdminSeedUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

export const initialSettings = defaultSettings;

export const bootstrapInitialSettings = async (db: DbClient): Promise<void> => {
  await db.insert(settings).values(initialSettings).onConflictDoNothing({
    target: settings.key,
  });
};

export const buildAdminSeedUser = async ({
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_NAME,
}: AdminEnv): Promise<AdminSeedUser> => {
  return {
    id: 'admin',
    name: ADMIN_NAME,
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hash(ADMIN_PASSWORD, 12),
  };
};

export const seed = async (): Promise<void> => {
  loadEnvFile();
  const env = getEnv();
  const { db, sql } = createDbClientFromEnv();
  const admin = await buildAdminSeedUser(env);

  try {
    await db
      .insert(users)
      .values(admin)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: admin.name,
          passwordHash: admin.passwordHash,
        },
      });

    await bootstrapInitialSettings(db);
  } finally {
    await sql.end();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('Seed completed');
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
