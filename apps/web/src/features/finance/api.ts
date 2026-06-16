import {
  cancelFinancePurchaseSchema,
  createFinanceBaseCostRuleSchema,
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  updateFinanceProductSchema,
  createFinanceStockAdjustmentSchema,
  createFinanceWalletAdjustmentSchema,
  financeCostingPreviewOrderSchema,
  financeWalletMovementFiltersSchema,
  updateFinanceBaseCostRuleSchema,
  updateFinancePurchaseSchema,
  updateFinanceRecipeSchema,
} from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

import type {
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  CreateFinanceWalletAdjustmentInput,
  CancelFinancePurchaseInput,
  CreateFinanceBaseCostRuleInput,
  FinanceCostingPreviewOrderInput,
  FinanceBaseCostRule,
  FinanceOrderCostBreakdown,
  FinanceProductFilters,
  FinancePurchaseFilters,
  FinanceWalletMovement,
  FinanceWalletMovementFilters,
  FinanceWalletMovementLedger,
  FinanceProductWithMetrics,
  FinanceProductHistoryItem,
  FinancePurchaseDetail,
  FinanceRecipe,
  FinanceStockFilters,
  FinanceStockItem,
  FinanceStockMovement,
  UpdateFinanceBaseCostRuleInput,
  UpdateFinanceProductInput,
  UpdateFinancePurchaseInput,
  UpdateFinanceRecipeInput,
} from './types';

export const listFinanceProducts = async (
  filters: FinanceProductFilters = {},
): Promise<FinanceProductWithMetrics[]> => {
  const response = await apiClient.get<{ products: FinanceProductWithMetrics[] }>(
    '/finance/products',
    { params: filters },
  );

  return response.data.products;
};

export const createFinanceProduct = async (
  input: CreateFinanceProductInput,
): Promise<FinanceProductWithMetrics> => {
  const payload = createFinanceProductSchema.parse(input);
  const response = await apiClient.post<{ product: FinanceProductWithMetrics }>(
    '/finance/products',
    payload,
  );

  return response.data.product;
};

export const updateFinanceProduct = async (
  id: string,
  input: UpdateFinanceProductInput,
): Promise<FinanceProductWithMetrics> => {
  const payload = updateFinanceProductSchema.parse(input);
  const response = await apiClient.put<{ product: FinanceProductWithMetrics }>(
    `/finance/products/${id}`,
    payload,
  );

  return response.data.product;
};

export const getFinanceProductHistory = async (
  id: string,
): Promise<FinanceProductHistoryItem[]> => {
  const response = await apiClient.get<{ purchaseHistory: FinanceProductHistoryItem[] }>(
    `/finance/products/${id}/history`,
  );

  return response.data.purchaseHistory;
};

export const createFinancePurchase = async (
  input: CreateFinancePurchaseInput,
): Promise<FinancePurchaseDetail> => {
  const payload = createFinancePurchaseSchema.parse(input);
  const response = await apiClient.post<{ purchase: FinancePurchaseDetail }>(
    '/finance/purchases',
    payload,
  );

  return response.data.purchase;
};

export const updateFinancePurchase = async (
  id: string,
  input: UpdateFinancePurchaseInput,
): Promise<FinancePurchaseDetail> => {
  const payload = updateFinancePurchaseSchema.parse(input);
  const response = await apiClient.put<{ purchase: FinancePurchaseDetail }>(
    `/finance/purchases/${id}`,
    payload,
  );

  return response.data.purchase;
};

export const listFinancePurchases = async (
  filters: FinancePurchaseFilters = {},
): Promise<FinancePurchaseDetail[]> => {
  const response = await apiClient.get<{ purchases: FinancePurchaseDetail[] }>(
    '/finance/purchases',
    { params: filters },
  );

  return response.data.purchases;
};

export const cancelFinancePurchase = async (
  id: string,
  input: CancelFinancePurchaseInput = {},
): Promise<FinancePurchaseDetail> => {
  const payload = cancelFinancePurchaseSchema.parse(input);
  const response = await apiClient.delete<{ purchase: FinancePurchaseDetail }>(
    `/finance/purchases/${id}`,
    { data: payload },
  );

  return response.data.purchase;
};

export const listFinanceBaseCostRules = async (): Promise<FinanceBaseCostRule[]> => {
  const response = await apiClient.get<{ rules: FinanceBaseCostRule[] }>(
    '/finance/base-cost-rules',
  );

  return response.data.rules;
};

export const createFinanceBaseCostRule = async (
  input: CreateFinanceBaseCostRuleInput,
): Promise<FinanceBaseCostRule> => {
  const payload = createFinanceBaseCostRuleSchema.parse(input);
  const response = await apiClient.post<{ rule: FinanceBaseCostRule }>(
    '/finance/base-cost-rules',
    payload,
  );

  return response.data.rule;
};

export const updateFinanceBaseCostRule = async (
  id: string,
  input: UpdateFinanceBaseCostRuleInput,
): Promise<FinanceBaseCostRule> => {
  const payload = updateFinanceBaseCostRuleSchema.parse(input);
  const response = await apiClient.put<{ rule: FinanceBaseCostRule }>(
    `/finance/base-cost-rules/${id}`,
    payload,
  );

  return response.data.rule;
};

export const deleteFinanceBaseCostRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/finance/base-cost-rules/${id}`);
};

export const listFinanceRecipes = async (): Promise<FinanceRecipe[]> => {
  const response = await apiClient.get<{ recipes: FinanceRecipe[] }>('/finance/recipes');

  return response.data.recipes;
};

export const updateFinanceRecipe = async (
  menuItemId: string,
  input: UpdateFinanceRecipeInput,
): Promise<FinanceRecipe> => {
  const payload = updateFinanceRecipeSchema.parse(input);
  const response = await apiClient.put<{ recipe: FinanceRecipe }>(
    `/finance/recipes/${menuItemId}`,
    payload,
  );

  return response.data.recipe;
};

export const listFinanceStock = async (
  filters: FinanceStockFilters = {},
): Promise<FinanceStockItem[]> => {
  const response = await apiClient.get<{ stock: FinanceStockItem[] }>('/finance/stock', {
    params: filters,
  });

  return response.data.stock;
};

export const createFinanceStockAdjustment = async (
  input: CreateFinanceStockAdjustmentInput,
): Promise<FinanceStockMovement> => {
  const payload = createFinanceStockAdjustmentSchema.parse(input);
  const response = await apiClient.post<{ movement: FinanceStockMovement }>(
    '/finance/stock/adjustments',
    payload,
  );

  return response.data.movement;
};

export const listFinanceWalletMovements = async (
  filters: FinanceWalletMovementFilters = {},
): Promise<FinanceWalletMovementLedger> => {
  const params = financeWalletMovementFiltersSchema.parse(filters);
  const response = await apiClient.get<FinanceWalletMovementLedger>('/finance/wallet-movements', {
    params,
  });

  return response.data;
};

export const createFinanceWalletAdjustment = async (
  input: CreateFinanceWalletAdjustmentInput,
): Promise<FinanceWalletMovement> => {
  const payload = createFinanceWalletAdjustmentSchema.parse(input);
  const response = await apiClient.post<{ movement: FinanceWalletMovement }>(
    '/finance/wallet-adjustments',
    payload,
  );

  return response.data.movement;
};

export const previewFinanceOrderCost = async (
  input: FinanceCostingPreviewOrderInput,
): Promise<FinanceOrderCostBreakdown> => {
  const payload = financeCostingPreviewOrderSchema.parse(input);
  const response = await apiClient.post<{ breakdown: FinanceOrderCostBreakdown }>(
    '/finance/costing/preview-order',
    payload,
  );

  return response.data.breakdown;
};
