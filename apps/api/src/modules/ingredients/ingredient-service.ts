import { randomUUID } from 'node:crypto';

import type {
  CreateIngredientInput,
  IngredientUnit,
  UpdateIngredientInput,
} from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

export type Ingredient = {
  id: string;
  name: string;
  unit: IngredientUnit;
  purchasePrice: number;
};

export type IngredientRepository = {
  list(): Promise<Ingredient[]>;
  create(ingredient: Ingredient): Promise<Ingredient>;
  update(id: string, updates: UpdateIngredientInput): Promise<Ingredient | null>;
  delete(id: string): Promise<boolean>;
};

export const listIngredients = (repository: IngredientRepository): Promise<Ingredient[]> =>
  repository.list();

export const createIngredient = (
  input: CreateIngredientInput,
  repository: IngredientRepository,
): Promise<Ingredient> => {
  return repository.create({
    id: randomUUID(),
    name: input.name,
    unit: input.unit,
    purchasePrice: input.purchasePrice,
  });
};

export const updateIngredient = async (
  id: string,
  input: UpdateIngredientInput,
  repository: IngredientRepository,
): Promise<Ingredient> => {
  const updated = await repository.update(id, input);

  if (!updated) {
    throw new ApiError(404, 'Ingredient not found', 'INGREDIENT_NOT_FOUND');
  }

  return updated;
};

export const deleteIngredient = async (
  id: string,
  repository: IngredientRepository,
): Promise<void> => {
  const deleted = await repository.delete(id);

  if (!deleted) {
    throw new ApiError(404, 'Ingredient not found', 'INGREDIENT_NOT_FOUND');
  }
};
