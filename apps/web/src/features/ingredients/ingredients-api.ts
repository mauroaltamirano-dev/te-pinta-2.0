import type {
  CreateIngredientInput,
  IngredientUnit,
  UpdateIngredientInput,
} from '@te-pinta/shared';
import { createIngredientSchema, updateIngredientSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type Ingredient = {
  id: string;
  name: string;
  unit: IngredientUnit;
  purchasePrice: number;
};

export const listIngredients = async (): Promise<Ingredient[]> => {
  const response = await apiClient.get<{ ingredients: Ingredient[] }>('/ingredients');

  return response.data.ingredients;
};

export const createIngredient = async (input: CreateIngredientInput): Promise<Ingredient> => {
  const payload = createIngredientSchema.parse(input);
  const response = await apiClient.post<{ ingredient: Ingredient }>('/ingredients', payload);

  return response.data.ingredient;
};

export const updateIngredient = async (
  id: string,
  input: UpdateIngredientInput,
): Promise<Ingredient> => {
  const payload = updateIngredientSchema.parse(input);
  const response = await apiClient.patch<{ ingredient: Ingredient }>(`/ingredients/${id}`, payload);

  return response.data.ingredient;
};

export const deleteIngredient = async (id: string): Promise<void> => {
  await apiClient.delete(`/ingredients/${id}`);
};
