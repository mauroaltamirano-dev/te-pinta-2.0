import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateFinanceBaseCostRuleInput,
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CancelFinancePurchaseInput,
  FinanceCostingPreviewOrderInput,
  FinanceProductFilters,
  FinancePurchaseFilters,
  UpdateFinanceProductInput,
  FinanceStockFilters,
  UpdateFinanceBaseCostRuleInput,
  UpdateFinanceRecipeInput,
} from './types';
import {
  createFinanceBaseCostRule,
  createFinanceProduct,
  createFinancePurchase,
  getFinanceProductHistory,
  createFinanceStockAdjustment,
  cancelFinancePurchase,
  deleteFinanceBaseCostRule,
  listFinanceBaseCostRules,
  listFinanceProducts,
  listFinancePurchases,
  listFinanceRecipes,
  listFinanceStock,
  previewFinanceOrderCost,
  updateFinanceBaseCostRule,
  updateFinanceProduct,
  updateFinanceRecipe,
} from './api';

export const financeQueryKeys = {
  all: ['finance'] as const,
  products: (filters: FinanceProductFilters = {}) =>
    [...financeQueryKeys.all, 'products', filters] as const,
  productHistory: (id: string) => [...financeQueryKeys.all, 'products', id, 'history'] as const,
  stock: (filters: FinanceStockFilters = {}) =>
    [...financeQueryKeys.all, 'stock', filters] as const,
  baseCostRules: () => [...financeQueryKeys.all, 'base-cost-rules'] as const,
  recipes: () => [...financeQueryKeys.all, 'recipes'] as const,
  purchases: (filters: FinancePurchaseFilters = {}) =>
    [...financeQueryKeys.all, 'purchases', filters] as const,
};

export const useFinanceProducts = (filters: FinanceProductFilters = {}) =>
  useQuery({
    queryKey: financeQueryKeys.products(filters),
    queryFn: () => listFinanceProducts(filters),
    staleTime: 20_000,
  });


export const useFinanceProductHistory = (id: string, enabled = true) =>
  useQuery({
    queryKey: financeQueryKeys.productHistory(id),
    queryFn: () => getFinanceProductHistory(id),
    enabled: enabled && Boolean(id),
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

export const useFinancePurchases = (filters: FinancePurchaseFilters = {}) =>
  useQuery({
    queryKey: financeQueryKeys.purchases(filters),
    queryFn: () => listFinancePurchases(filters),
    staleTime: 20_000,
  });

export const useCreateFinanceProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFinanceProductInput) => createFinanceProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};


export const useUpdateFinanceProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateFinanceProductInput }) =>
      updateFinanceProduct(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useCreateFinancePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFinancePurchaseInput) => createFinancePurchase(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.all }),
  });
};

export const useCancelFinancePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: CancelFinancePurchaseInput }) =>
      cancelFinancePurchase(id, input),
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
