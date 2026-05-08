import { describe, expect, it } from 'vitest';

import type { Ingredient, IngredientRepository } from './ingredient-service';
import { createIngredient, updateIngredient } from './ingredient-service';
import { ApiError } from '../../middlewares/error-handler';

const ingredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: 'ingredient-1',
  name: 'Harina',
  unit: 'kg',
  purchasePrice: 1200,
  ...overrides,
});

describe('ingredient service', () => {
  it('creates ingredients with generated ids', async () => {
    const repository: IngredientRepository = {
      list: async () => [],
      create: async (input) => ingredient(input),
      update: async () => null,
      delete: async () => false,
    };

    const result = await createIngredient(
      { name: 'Harina', unit: 'kg', purchasePrice: 1200 },
      repository,
    );

    expect(result).toMatchObject({ name: 'Harina', unit: 'kg', purchasePrice: 1200 });
    expect(result.id).toHaveLength(36);
  });

  it('throws 404 when updating a missing ingredient', async () => {
    const repository: IngredientRepository = {
      list: async () => [],
      create: async (input) => ingredient(input),
      update: async () => null,
      delete: async () => false,
    };

    await expect(
      updateIngredient('missing', { purchasePrice: 1300 }, repository),
    ).rejects.toMatchObject(new ApiError(404, 'Ingredient not found', 'INGREDIENT_NOT_FOUND'));
  });
});
