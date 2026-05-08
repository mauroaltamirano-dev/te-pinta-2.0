import { asc, eq } from 'drizzle-orm';

import type { IngredientUnit, UpdateIngredientInput } from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import { ingredients } from '../../db/schema';
import type { Ingredient, IngredientRepository } from './ingredient-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type IngredientInsert = typeof ingredients.$inferInsert;
type IngredientRow = typeof ingredients.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const moneyToDb = (value: number): string => value.toFixed(2);

const mapIngredient = (row: IngredientRow): Ingredient => ({
  id: row.id,
  name: row.name,
  unit: row.unit as IngredientUnit,
  purchasePrice: Number(row.purchasePrice),
});

const toIngredientUpdate = (updates: UpdateIngredientInput): Partial<IngredientInsert> => ({
  ...(updates.name !== undefined ? { name: updates.name } : {}),
  ...(updates.unit !== undefined ? { unit: updates.unit } : {}),
  ...(updates.purchasePrice !== undefined
    ? { purchasePrice: moneyToDb(updates.purchasePrice) }
    : {}),
  updatedAt: new Date(),
});

export const createIngredientRepository = (db: DbClient): IngredientRepository => ({
  async list(): Promise<Ingredient[]> {
    const rows = await db.select().from(ingredients).orderBy(asc(ingredients.name));
    return rows.map(mapIngredient);
  },

  async create(ingredient): Promise<Ingredient> {
    const [row] = await db
      .insert(ingredients)
      .values({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        purchasePrice: moneyToDb(ingredient.purchasePrice),
      })
      .returning();

    return mapIngredient(requireReturnedRow(row));
  },

  async update(id, updates): Promise<Ingredient | null> {
    const [row] = await db
      .update(ingredients)
      .set(toIngredientUpdate(updates))
      .where(eq(ingredients.id, id))
      .returning();

    return row ? mapIngredient(row) : null;
  },

  async delete(id): Promise<boolean> {
    const [row] = await db
      .delete(ingredients)
      .where(eq(ingredients.id, id))
      .returning({ id: ingredients.id });

    return Boolean(row);
  },
});
