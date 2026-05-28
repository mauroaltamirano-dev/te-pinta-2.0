import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateFinanceBaseCostRuleInput,
  FinanceCostingPreviewOrderInput,
  FinanceProductFilters,
  FinanceStockFilters,
  UpdateFinanceBaseCostRuleInput,
  UpdateFinanceRecipeInput,
} from './types';
import {
  createFinanceBaseCostRule,
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  deleteFinanceBaseCostRule,
  listFinanceBaseCostRules,
  listFinanceProducts,
  listFinanceRecipes,
  listFinanceStock,
  previewFinanceOrderCost,
  updateFinanceBaseCostRule,
  updateFinanceRecipe,
} from './api';

export const financeQueryKeys = {
  all: ['finance'] as const,
  products: (filters: FinanceProductFilters = {}) =>
    [...financeQueryKeys.all, 'products', filters] as const,
  stock: (filters: FinanceStockFilters = {}) =>
    [...financeQueryKeys.all, 'stock', filters] as const,
  baseCostRules: () => [...financeQueryKeys.all, 'base-cost-rules'] as const,
  recipes: () => [...financeQueryKeys.all, 'recipes'] as const,
};

export const useFinanceProducts = (filters: FinanceProductFilters = {}) =>
  useQuery({
    queryKey: financeQueryKeys.products(filters),
    queryFn: () => listFinanceProducts(filters),
    staleTime: 20_000,
  });

export const useFinanceStock = (filters: FinanceStockFilters = {}) =>
  useQuery({
    queryKey: financeQueryKeys.stock(filters),
    queryFn: () => listFinanceStock(filters),
    staleTime: 20_000,
  });

export const useFinanceBaseCostRules = () =>
  useQuery({
    queryKey: financeQueryKeys.baseCostRules(),
    queryFn: listFinanceBaseCostRules,
    staleTime: 20_000,
  });

export const useFinanceRecipes = () =>
  useQuery({
    queryKey: financeQueryKeys.recipes(),
    queryFn: listFinanceRecipes,
    staleTime: 20_000,
  });

export const useCreateFinanceProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFinanceProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useCreateFinancePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFinancePurchase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useCreateFinanceStockAdjustment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFinanceStockAdjustment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useCreateFinanceBaseCostRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFinanceBaseCostRuleInput) => createFinanceBaseCostRule(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useUpdateFinanceBaseCostRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateFinanceBaseCostRuleInput }) =>
      updateFinanceBaseCostRule(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useDeleteFinanceBaseCostRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFinanceBaseCostRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useUpdateFinanceRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ menuItemId, input }: { menuItemId: string; input: UpdateFinanceRecipeInput }) =>
      updateFinanceRecipe(menuItemId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const usePreviewFinanceOrderCost = () =>
  useMutation({
    mutationFn: (input: FinanceCostingPreviewOrderInput) => previewFinanceOrderCost(input),
  });
