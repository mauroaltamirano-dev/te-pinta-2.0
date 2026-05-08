import { asc, eq } from 'drizzle-orm';

import type { createDbClient } from '../../db/index';
import { settings } from '../../db/schema';
import type { Setting, SettingsRepository } from './settings-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type SettingRow = typeof settings.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const mapSetting = (row: SettingRow): Setting => ({
  key: row.key,
  value: row.value,
});

export const createSettingsRepository = (db: DbClient): SettingsRepository => ({
  async list(): Promise<Setting[]> {
    const rows = await db.select().from(settings).orderBy(asc(settings.key));
    return rows.map(mapSetting);
  },

  async get(key): Promise<Setting | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return row ? mapSetting(row) : null;
  },

  async update(setting): Promise<Setting> {
    const [row] = await db
      .insert(settings)
      .values({ ...setting, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: setting.value, updatedAt: new Date() },
      })
      .returning();

    return mapSetting(requireReturnedRow(row));
  },
});
