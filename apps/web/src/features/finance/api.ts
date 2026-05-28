import {
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  createFinanceStockAdjustmentSchema,
  financeCostingPreviewOrderSchema,
} from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

import type {
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  FinanceCostingPreviewOrderInput,
  FinanceOrderCostBreakdown,
  FinanceProductFilters,
  FinanceProductWithMetrics,
  FinancePurchaseDetail,
  FinanceStockFilters,
  FinanceStockItem,
  FinanceStockMovement,
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
