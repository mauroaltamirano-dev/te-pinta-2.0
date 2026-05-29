import {
  cancelFinancePurchaseSchema,
  createFinanceBaseCostRuleSchema,
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  createFinanceStockAdjustmentSchema,
  financeCostingPreviewOrderSchema,
  updateFinanceBaseCostRuleSchema,
  updateFinanceRecipeSchema,
} from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

import type {
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  CancelFinancePurchaseInput,
  CreateFinanceBaseCostRuleInput,
  FinanceCostingPreviewOrderInput,
  FinanceBaseCostRule,
  FinanceOrderCostBreakdown,
  FinanceProductFilters,
  FinancePurchaseFilters,
  FinanceProductWithMetrics,
  FinancePurchaseDetail,
  FinanceRecipe,
  FinanceStockFilters,
  FinanceStockItem,
  FinanceStockMovement,
  UpdateFinanceBaseCostRuleInput,
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
