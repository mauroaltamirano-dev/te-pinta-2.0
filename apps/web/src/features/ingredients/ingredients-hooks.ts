import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateIngredientInput } from '@te-pinta/shared';

import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from './ingredients-api';

export const ingredientQueryKeys = {
  all: ['ingredients'] as const,
  list: () => [...ingredientQueryKeys.all, 'list'] as const,
};

export const useIngredients = () =>
  useQuery({
    queryKey: ingredientQueryKeys.list(),
    queryFn: listIngredients,
  });

export const useCreateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIngredient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.all }),
  });
};

export const useUpdateIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateIngredientInput }) =>
      updateIngredient(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.all }),
  });
};

export const useDeleteIngredient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteIngredient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ingredientQueryKeys.all }),
  });
};
