import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  FinanceCostingPreviewOrderInput,
  FinanceProductFilters,
  FinanceStockFilters,
} from './types';
import {
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  listFinanceProducts,
  listFinanceStock,
  previewFinanceOrderCost,
} from './api';

export const financeQueryKeys = {
  all: ['finance'] as const,
  products: (filters: FinanceProductFilters = {}) =>
    [...financeQueryKeys.all, 'products', filters] as const,
  stock: (filters: FinanceStockFilters = {}) => [...financeQueryKeys.all, 'stock', filters] as const,
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

export const usePreviewFinanceOrderCost = () =>
  useMutation({
    mutationFn: (input: FinanceCostingPreviewOrderInput) => previewFinanceOrderCost(input),
  });
