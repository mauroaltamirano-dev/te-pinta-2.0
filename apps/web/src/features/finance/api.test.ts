import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import {
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  listFinanceProducts,
  listFinanceStock,
  previewFinanceOrderCost,
} from './api';
import type { FinanceProductWithMetrics, FinanceStockItem } from './types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const product: FinanceProductWithMetrics = {
  id: 'product-1',
  name: 'Harina 000',
  normalizedName: 'harina 000',
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: 120000,
  averageCostPerBaseUnitCents: 115000,
  purchasedQuantityBase: 48,
  stockQuantityBase: 30,
  purchaseCount: 2,
  warnings: [],
};

const stockItem: FinanceStockItem = {
  product,
  quantityBase: 30,
};

describe('finance api client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists finance products and stock through the PR2 endpoints', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { products: [product] } })
      .mockResolvedValueOnce({ data: { stock: [stockItem] } });

    await expect(listFinanceProducts({ search: 'harina', category: 'raw_material' })).resolves.toEqual([
      product,
    ]);
    await expect(listFinanceStock({ search: 'harina' })).resolves.toEqual([stockItem]);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/finance/products', {
      params: { search: 'harina', category: 'raw_material' },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/finance/stock', {
      params: { search: 'harina' },
    });
  });

  it('creates products, purchases, and costing previews with validated payloads', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { product } })
      .mockResolvedValueOnce({
        data: {
          purchase: {
            id: 'purchase-1',
            purchaseDate: '2026-05-27',
            supplier: 'Molino norte',
            receiptNumber: null,
            notes: null,
            items: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          movement: {
            id: 'movement-1',
            productId: 'product-1',
            movementType: 'manual_in',
            quantityBase: 3,
            sourcePurchaseItemId: null,
            notes: 'Ajuste inicial',
            createdAt: '2026-05-27T12:00:00.000Z',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          breakdown: {
            totalEmpanadas: 12,
            packagingUnits: 1,
            baseRawMaterialCostCents: 0,
            packagingCostCents: 0,
            recipeCostCents: 0,
            totalCostCents: 0,
            profitSummary: {
              saleTotalCents: 2400000,
              totalCostCents: 0,
              grossProfitCents: 2400000,
              profitMarginPercent: 100,
              costRatioPercent: 0,
            },
            warnings: [
              {
                code: 'missing_recipe_cost',
                message: 'Recipe cost is missing for Jamón y queso.',
              },
            ],
          },
        },
      });

    await expect(
      createFinanceProduct({
        name: 'Harina 000',
        category: 'raw_material',
        baseUnit: 'kg',
        stockTracking: true,
        isActive: true,
      }),
    ).resolves.toEqual(product);

    await expect(
      createFinancePurchase({
        purchaseDate: '2026-05-27',
        supplier: 'Molino norte',
        items: [
          {
            productId: 'product-1',
            purchaseUnit: 'pack',
            purchaseQuantity: 24,
            unitsPerPackage: 12,
            unitPriceCents: 160000,
          },
        ],
      }),
    ).resolves.toMatchObject({ id: 'purchase-1' });

    await expect(
      createFinanceStockAdjustment({
        productId: 'product-1',
        movementType: 'manual_in',
        quantity: 3,
        notes: 'Ajuste inicial',
      }),
    ).resolves.toMatchObject({ id: 'movement-1' });

    await expect(
      previewFinanceOrderCost({
        saleTotalCents: 2400000,
        items: [{ menuItemId: 'menu-1', quantity: 12 }],
      }),
    ).resolves.toMatchObject({
      warnings: [{ code: 'missing_recipe_cost' }],
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/finance/products', {
      name: 'Harina 000',
      category: 'raw_material',
      baseUnit: 'kg',
      stockTracking: true,
      isActive: true,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/finance/purchases',
      expect.objectContaining({ purchaseDate: '2026-05-27' }),
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(3, '/finance/stock/adjustments', {
      productId: 'product-1',
      movementType: 'manual_in',
      quantity: 3,
      notes: 'Ajuste inicial',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(4, '/finance/costing/preview-order', {
      saleTotalCents: 2400000,
      items: [{ menuItemId: 'menu-1', quantity: 12 }],
    });
  });
});
