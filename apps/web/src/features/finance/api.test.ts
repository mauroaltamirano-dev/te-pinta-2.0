import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

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
import type {
  FinanceBaseCostRule,
  FinanceProductWithMetrics,
  FinanceRecipe,
  FinanceStockItem,
} from './types';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

const baseCostRule: FinanceBaseCostRule = {
  id: 'rule-1',
  productId: 'product-1',
  productName: 'Harina 000',
  name: 'Harina base',
  componentType: 'base_raw_material',
  appliesTo: 'per_empanada',
  quantity: 0.05,
  groupSizeUnits: 12,
  roundingMode: 'exact',
  latestCostCents: 120000,
  isActive: true,
};

const recipe: FinanceRecipe = {
  menuItemId: 'menu-1',
  menuItemName: 'Humita',
  items: [],
  totalCostPerDozenCents: 0,
  totalCostPerUnitCents: 0,
  warnings: [],
};

describe('finance api client', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists finance products and stock through the PR2 endpoints', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { products: [product] } })
      .mockResolvedValueOnce({ data: { stock: [stockItem] } });

    await expect(
      listFinanceProducts({ search: 'harina', category: 'raw_material' }),
    ).resolves.toEqual([product]);
    await expect(listFinanceStock({ search: 'harina' })).resolves.toEqual([stockItem]);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/finance/products', {
      params: { search: 'harina', category: 'raw_material' },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/finance/stock', {
      params: { search: 'harina' },
    });
  });

  it('manages base cost rules and recipes through finance endpoints', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { rules: [baseCostRule] } })
      .mockResolvedValueOnce({ data: { recipes: [recipe] } });
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { rule: baseCostRule } });
    vi.mocked(apiClient.put)
      .mockResolvedValueOnce({ data: { rule: { ...baseCostRule, isActive: false } } })
      .mockResolvedValueOnce({
        data: {
          recipe: {
            ...recipe,
            items: [
              {
                id: 'recipe-item-1',
                menuItemId: 'menu-1',
                productId: 'product-1',
                quantityPerDozen: 0.25,
                unit: 'kg',
                quantityBase: 0.25,
                latestCostCents: 120000,
                notes: null,
              },
            ],
          },
        },
      });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await expect(listFinanceBaseCostRules()).resolves.toEqual([baseCostRule]);
    await expect(listFinanceRecipes()).resolves.toEqual([recipe]);
    await expect(
      createFinanceBaseCostRule({
        productId: 'product-1',
        name: 'Harina base',
        componentType: 'base_raw_material',
        appliesTo: 'per_empanada',
        quantity: 0.05,
        groupSizeUnits: 12,
        roundingMode: 'exact',
        isActive: true,
      }),
    ).resolves.toEqual(baseCostRule);
    await expect(updateFinanceBaseCostRule('rule-1', { isActive: false })).resolves.toMatchObject({
      isActive: false,
    });
    await expect(
      updateFinanceRecipe('menu-1', {
        menuItemId: 'menu-1',
        items: [
          {
            productId: 'product-1',
            quantityPerDozen: 0.25,
            unit: 'kg',
            quantityBase: 0.25,
          },
        ],
      }),
    ).resolves.toMatchObject({ menuItemId: 'menu-1' });
    await expect(deleteFinanceBaseCostRule('rule-1')).resolves.toBeUndefined();

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/finance/base-cost-rules');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/finance/recipes');
    expect(apiClient.post).toHaveBeenCalledWith('/finance/base-cost-rules', {
      productId: 'product-1',
      name: 'Harina base',
      componentType: 'base_raw_material',
      appliesTo: 'per_empanada',
      quantity: 0.05,
      groupSizeUnits: 12,
      roundingMode: 'exact',
      isActive: true,
    });
    expect(apiClient.put).toHaveBeenNthCalledWith(1, '/finance/base-cost-rules/rule-1', {
      isActive: false,
    });
    expect(apiClient.put).toHaveBeenNthCalledWith(
      2,
      '/finance/recipes/menu-1',
      expect.objectContaining({ menuItemId: 'menu-1' }),
    );
    expect(apiClient.delete).toHaveBeenCalledWith('/finance/base-cost-rules/rule-1');
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
