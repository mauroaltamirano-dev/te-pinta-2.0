import { and, asc, eq } from 'drizzle-orm';

import type { UpdateMenuItemInput } from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import { menuItems } from '../../db/schema';
import type { MenuItem, MenuItemRepository } from './menu-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type MenuItemInsert = typeof menuItems.$inferInsert;

type MenuItemRow = typeof menuItems.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const moneyToDb = (value: number): string => value.toFixed(2);

const mapMenuItem = (row: MenuItemRow): MenuItem => ({
  id: row.id,
  name: row.name,
  priceUnit: Number(row.priceUnit),
  priceHalfDozen: Number(row.priceHalfDozen),
  priceDozen: Number(row.priceDozen),
  costPerDozen: Number(row.costPerDozen),
  isActive: row.isActive,
  isArchived: row.isArchived,
});

const toMenuItemUpdate = (updates: UpdateMenuItemInput): Partial<MenuItemInsert> => ({
  ...(updates.name !== undefined ? { name: updates.name } : {}),
  ...(updates.priceUnit !== undefined ? { priceUnit: moneyToDb(updates.priceUnit) } : {}),
  ...(updates.priceHalfDozen !== undefined
    ? { priceHalfDozen: moneyToDb(updates.priceHalfDozen) }
    : {}),
  ...(updates.priceDozen !== undefined ? { priceDozen: moneyToDb(updates.priceDozen) } : {}),
  ...(updates.costPerDozen !== undefined ? { costPerDozen: moneyToDb(updates.costPerDozen) } : {}),
  ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
  ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
  updatedAt: new Date(),
});

export const createMenuItemRepository = (db: DbClient): MenuItemRepository => ({
  async list(options = {}): Promise<MenuItem[]> {
    const rows = options.includeInactive
      ? await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.isArchived, false))
          .orderBy(asc(menuItems.name))
      : await db
          .select()
          .from(menuItems)
          .where(and(eq(menuItems.isActive, true), eq(menuItems.isArchived, false)))
          .orderBy(asc(menuItems.name));

    return rows.map(mapMenuItem);
  },

  async create(item): Promise<MenuItem> {
    const [row] = await db
      .insert(menuItems)
      .values({
        id: item.id,
        name: item.name,
        priceUnit: moneyToDb(item.priceUnit),
        priceHalfDozen: moneyToDb(item.priceHalfDozen),
        priceDozen: moneyToDb(item.priceDozen),
        costPerDozen: moneyToDb(item.costPerDozen),
        isActive: item.isActive,
        isArchived: item.isArchived,
      })
      .returning();

    return mapMenuItem(requireReturnedRow(row));
  },

  async update(id, updates): Promise<MenuItem | null> {
    const [row] = await db
      .update(menuItems)
      .set(toMenuItemUpdate(updates))
      .where(eq(menuItems.id, id))
      .returning();

    return row ? mapMenuItem(row) : null;
  },

  async delete(id): Promise<boolean> {
    const [row] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning({ id: menuItems.id });

    return Boolean(row);
  },
});
