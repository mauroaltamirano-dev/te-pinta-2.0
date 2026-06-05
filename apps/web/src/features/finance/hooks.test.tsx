import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { createQueryClient } from '@/lib/query-client';

import {
  cancelFinancePurchase,
  createFinanceProduct,
  createFinancePurchase,
  getFinanceProductHistory,
  updateFinanceProduct,
  updateFinancePurchase,
} from './api';
import {
  financeQueryKeys,
  useCancelFinancePurchase,
  useCreateFinanceProduct,
  useCreateFinancePurchase,
  useFinanceProductHistory,
  useUpdateFinanceProduct,
  useUpdateFinancePurchase,
} from './hooks';

vi.mock('./api', () => ({
  cancelFinancePurchase: vi.fn(),
  createFinanceProduct: vi.fn(),
  createFinancePurchase: vi.fn(),
  getFinanceProductHistory: vi.fn(),
  updateFinanceProduct: vi.fn(),
  updateFinancePurchase: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, wrapper };
};

describe('finance catalog hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads product history by product id', async () => {
    vi.mocked(getFinanceProductHistory).mockResolvedValueOnce([
      {
        id: 'purchase-item-1',
        purchasedAt: '2026-05-20',
        purchaseQuantity: 2,
        unitsPerPackage: 1,
        totalBaseUnits: 2,
        totalPriceCents: 240000,
        costPerBaseUnitCents: 120000,
      },
    ]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useFinanceProductHistory('product-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(getFinanceProductHistory).toHaveBeenCalledWith('product-1');
  });

  it('updates products and invalidates the finance workspace queries', async () => {
    vi.mocked(updateFinanceProduct).mockResolvedValueOnce({
      id: 'product-1',
      name: 'Harina',
      normalizedName: 'harina',
      category: 'raw_material',
      baseUnit: 'kg',
      stockTracking: true,
      isActive: true,
      latestCostPerBaseUnitCents: null,
      averageCostPerBaseUnitCents: null,
      purchasedQuantityBase: 0,
      stockQuantityBase: 144,
      purchaseCount: 0,
      warnings: [],
    });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => {
        const mutation = useUpdateFinanceProduct();
        const client = useQueryClient();
        return { mutation, client };
      },
      { wrapper },
    );

    result.current.mutation.mutate({
      id: 'product-1',
      updates: { name: 'Harina', currentStockQuantityBase: 144 },
    });

    await waitFor(() => expect(updateFinanceProduct).toHaveBeenCalled());
    expect(updateFinanceProduct).toHaveBeenCalledWith('product-1', {
      name: 'Harina',
      currentStockQuantityBase: 144,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: financeQueryKeys.all });
  });

  it('invalidates the finance workspace after creating, updating, and canceling purchases', async () => {
    const savedProduct = {
      id: 'product-1',
      name: 'Harina',
      normalizedName: 'harina',
      category: 'raw_material' as const,
      baseUnit: 'kg' as const,
      stockTracking: true,
      isActive: true,
      latestCostPerBaseUnitCents: null,
      averageCostPerBaseUnitCents: null,
      purchasedQuantityBase: 0,
      stockQuantityBase: 0,
      purchaseCount: 0,
      warnings: [],
    };
    const savedPurchase = {
      id: 'purchase-1',
      purchaseDate: '2026-06-01',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'production_cost' as const,
      canceledAt: null,
      canceledReason: null,
      items: [],
      itemImpacts: [],
    };
    vi.mocked(createFinanceProduct).mockResolvedValue(savedProduct);
    vi.mocked(createFinancePurchase).mockResolvedValue(savedPurchase);
    vi.mocked(updateFinancePurchase).mockResolvedValue({
      ...savedPurchase,
      supplier: 'Molino sur',
      fundingSource: 'services',
    });
    vi.mocked(cancelFinancePurchase).mockResolvedValue({
      ...savedPurchase,
      canceledAt: '2026-06-01T12:00:00.000Z',
      canceledReason: 'Anulación manual desde Gestión',
    });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => ({
        createProduct: useCreateFinanceProduct(),
        createPurchase: useCreateFinancePurchase(),
        updatePurchase: useUpdateFinancePurchase(),
        cancelPurchase: useCancelFinancePurchase(),
      }),
      { wrapper },
    );

    result.current.createProduct.mutate({
      name: 'Harina',
      category: 'raw_material',
      baseUnit: 'kg',
      stockTracking: true,
      isActive: true,
    });
    await waitFor(() => expect(createFinanceProduct).toHaveBeenCalled());
    result.current.createPurchase.mutate({
      purchaseDate: '2026-06-01',
      supplier: 'Molino norte',
      fundingSource: 'production_cost',
      items: [
        {
          productId: 'product-1',
          purchaseUnit: 'kg',
          purchaseQuantity: 2,
          unitsPerPackage: 1,
          unitPriceCents: 120000,
        },
      ],
    });
    await waitFor(() => expect(createFinancePurchase).toHaveBeenCalled());
    result.current.updatePurchase.mutate({
      id: 'purchase-1',
      input: { supplier: 'Molino sur', fundingSource: 'services' },
    });
    await waitFor(() => expect(updateFinancePurchase).toHaveBeenCalled());
    result.current.cancelPurchase.mutate({
      id: 'purchase-1',
      input: { reason: 'duplicada' },
    });
    await waitFor(() => expect(cancelFinancePurchase).toHaveBeenCalled());

    expect(createFinancePurchase).toHaveBeenCalledWith({
      purchaseDate: '2026-06-01',
      supplier: 'Molino norte',
      fundingSource: 'production_cost',
      items: [
        {
          productId: 'product-1',
          purchaseUnit: 'kg',
          purchaseQuantity: 2,
          unitsPerPackage: 1,
          unitPriceCents: 120000,
        },
      ],
    });
    expect(cancelFinancePurchase).toHaveBeenCalledWith('purchase-1', { reason: 'duplicada' });
    expect(updateFinancePurchase).toHaveBeenCalledWith('purchase-1', {
      supplier: 'Molino sur',
      fundingSource: 'services',
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(4);
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: financeQueryKeys.all });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: financeQueryKeys.all });
    expect(invalidateSpy).toHaveBeenNthCalledWith(3, { queryKey: financeQueryKeys.all });
    expect(invalidateSpy).toHaveBeenNthCalledWith(4, { queryKey: financeQueryKeys.all });
  });

});
