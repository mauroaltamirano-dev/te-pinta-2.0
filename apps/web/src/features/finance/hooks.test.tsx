import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { createQueryClient } from '@/lib/query-client';

import {
  cancelFinancePurchase,
  createFinanceWalletAdjustment,
  createFinanceProduct,
  createFinancePurchase,
  getFinanceProductHistory,
  listFinanceWalletMovements,
  updateFinanceProduct,
  updateFinancePurchase,
} from './api';
import { dashboardQueryKeys } from '../dashboard/dashboard-hooks';
import {
  financeQueryKeys,
  useCancelFinancePurchase,
  useCreateFinanceWalletAdjustment,
  useCreateFinanceProduct,
  useCreateFinancePurchase,
  useFinanceProductHistory,
  useFinanceWalletMovements,
  useUpdateFinanceProduct,
  useUpdateFinancePurchase,
} from './hooks';

vi.mock('./api', () => ({
  cancelFinancePurchase: vi.fn(),
  createFinanceWalletAdjustment: vi.fn(),
  createFinanceProduct: vi.fn(),
  createFinancePurchase: vi.fn(),
  getFinanceProductHistory: vi.fn(),
  listFinanceWalletMovements: vi.fn(),
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

  it('loads wallet movements with filters under a dedicated ledger query key', async () => {
    vi.mocked(listFinanceWalletMovements).mockResolvedValueOnce({
      movements: [
        {
          id: 'sale:order-1:profit',
          wallet: 'profit',
          direction: 'credit',
          amountCents: 900000,
          signedAmountCents: 900000,
          sourceType: 'sale',
          sourceId: 'order-1',
          occurredAt: '2026-06-15',
        },
      ],
      balances: { production_cost: 0, services: 0, profit: 900000, reserve: 0 },
    });
    const { wrapper } = createWrapper();
    const filters = { wallet: 'profit' as const, sourceType: 'sale' as const };

    const { result } = renderHook(() => useFinanceWalletMovements(filters), { wrapper });

    await waitFor(() => expect(result.current.data?.movements).toHaveLength(1));
    expect(listFinanceWalletMovements).toHaveBeenCalledWith(filters);
    expect(financeQueryKeys.walletMovements(filters)).toEqual([
      'finance',
      'wallet-movements',
      filters,
    ]);
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

  it('invalidates finance and dashboard queries after creating a wallet adjustment', async () => {
    vi.mocked(createFinanceWalletAdjustment).mockResolvedValueOnce({
      id: 'adjustment:adjustment-1',
      wallet: 'services',
      direction: 'debit',
      amountCents: 250000,
      signedAmountCents: -250000,
      sourceType: 'adjustment',
      sourceId: 'adjustment-1',
      occurredAt: '2026-06-18T12:30:00.000Z',
      reason: 'Gas bill',
      actorId: 'admin',
      actorName: 'Admin Te Pinta',
    });
    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateFinanceWalletAdjustment(), { wrapper });

    result.current.mutate({
      wallet: 'services',
      direction: 'debit',
      amountCents: 250000,
      reason: 'Gas bill',
      occurredAt: '2026-06-18T12:30:00.000Z',
    });

    await waitFor(() => expect(createFinanceWalletAdjustment).toHaveBeenCalled());
    expect(createFinanceWalletAdjustment).toHaveBeenCalledWith({
      wallet: 'services',
      direction: 'debit',
      amountCents: 250000,
      reason: 'Gas bill',
      occurredAt: '2026-06-18T12:30:00.000Z',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: financeQueryKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.all });
  });
});
