import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/lib/api-client';

import {
  createFinanceWalletAdjustment,
  createFinanceBaseCostRule,
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  cancelFinancePurchase,
  deleteFinanceBaseCostRule,
  listFinanceBaseCostRules,
  getFinanceProductHistory,
  listFinanceProducts,
  listFinancePurchases,
  listFinanceRecipes,
  listFinanceStock,
  listFinanceWalletMovements,
  previewFinanceOrderCost,
  updateFinanceBaseCostRule,
  updateFinanceProduct,
  updateFinancePurchase,
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

  it('lists wallet movements and records audited wallet adjustments through the ledger endpoints', async () => {
    const ledger = {
      movements: [
        {
          id: 'sale:order-1:profit',
          wallet: 'profit' as const,
          direction: 'credit' as const,
          amountCents: 900000,
          signedAmountCents: 900000,
          sourceType: 'sale' as const,
          sourceId: 'order-1',
          occurredAt: '2026-06-15',
          reason: undefined,
          actorId: undefined,
          actorName: undefined,
        },
      ],
      balances: { production_cost: 0, services: 0, profit: 900000, reserve: 0 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: ledger });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        movement: {
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
        },
      },
    });

    await expect(
      listFinanceWalletMovements({
        wallet: 'profit',
        direction: 'credit',
        sourceType: 'sale',
        sourceId: 'order-1',
        from: '2026-06-15',
        to: '2026-06-15',
      }),
    ).resolves.toEqual(ledger);
    await expect(
      createFinanceWalletAdjustment({
        wallet: 'services',
        direction: 'debit',
        amountCents: 250000,
        reason: 'Gas bill',
        occurredAt: '2026-06-18T12:30:00.000Z',
      }),
    ).resolves.toMatchObject({
      wallet: 'services',
      signedAmountCents: -250000,
      sourceType: 'adjustment',
      actorName: 'Admin Te Pinta',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/finance/wallet-movements', {
      params: {
        wallet: 'profit',
        direction: 'credit',
        sourceType: 'sale',
        sourceId: 'order-1',
        from: '2026-06-15',
        to: '2026-06-15',
      },
    });
    expect(apiClient.post).toHaveBeenCalledWith('/finance/wallet-adjustments', {
      wallet: 'services',
      direction: 'debit',
      amountCents: 250000,
      reason: 'Gas bill',
      occurredAt: '2026-06-18T12:30:00.000Z',
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

  it('updates products and loads product history through catalog endpoints', async () => {
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { product: { ...product, name: 'Harina premium', stockQuantityBase: 144 } },
    });
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        purchaseHistory: [
          {
            id: 'purchase-item-1',
            purchasedAt: '2026-05-20',
            purchaseQuantity: 2,
            unitsPerPackage: 1,
            totalBaseUnits: 2,
            totalPriceCents: 240000,
            costPerBaseUnitCents: 120000,
          },
        ],
      },
    });

    await expect(
      updateFinanceProduct('product-1', {
        name: 'Harina premium',
        currentStockQuantityBase: 144,
      }),
    ).resolves.toMatchObject({ name: 'Harina premium', stockQuantityBase: 144 });
    await expect(getFinanceProductHistory('product-1')).resolves.toEqual([
      expect.objectContaining({ id: 'purchase-item-1', totalBaseUnits: 2 }),
    ]);

    expect(apiClient.put).toHaveBeenCalledWith('/finance/products/product-1', {
      name: 'Harina premium',
      currentStockQuantityBase: 144,
    });
    expect(apiClient.get).toHaveBeenCalledWith('/finance/products/product-1/history');
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
            fundingSource: 'production_cost',
            canceledAt: null,
            canceledReason: null,
            items: [],
            itemImpacts: [
              {
                purchaseItemId: 'purchase-item-1',
                stockBeforeBase: 10,
                stockAfterBase: 12,
                previousCostPerBaseUnitCents: 100000,
                newCostPerBaseUnitCents: 120000,
                priceDeltaCents: 20000,
                priceDeltaPercent: 20,
              },
            ],
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
        fundingSource: 'production_cost',
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
    ).resolves.toMatchObject({
      id: 'purchase-1',
      itemImpacts: [expect.objectContaining({ priceDeltaCents: 20000 })],
    });

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

  it('lists, updates, and cancels finance purchases through validated endpoints', async () => {
    const purchase = {
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'production_cost',
      canceledAt: null,
      canceledReason: null,
      items: [],
      itemImpacts: [
        {
          purchaseItemId: 'purchase-item-1',
          stockBeforeBase: 10,
          stockAfterBase: 12,
          previousCostPerBaseUnitCents: 100000,
          newCostPerBaseUnitCents: 120000,
          priceDeltaCents: 20000,
          priceDeltaPercent: 20,
        },
      ],
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { purchases: [purchase] } });
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: { purchase: { ...purchase, supplier: 'Molino sur', fundingSource: 'services' } },
    });
    vi.mocked(apiClient.delete).mockResolvedValueOnce({
      data: { purchase: { ...purchase, canceledAt: '2026-05-29T12:00:00.000Z' } },
    });

    await expect(listFinancePurchases()).resolves.toEqual([
      expect.objectContaining({
        id: 'purchase-1',
        itemImpacts: [expect.objectContaining({ stockBeforeBase: 10, stockAfterBase: 12 })],
      }),
    ]);
    await expect(
      updateFinancePurchase('purchase-1', {
        supplier: 'Molino sur',
        fundingSource: 'services',
      }),
    ).resolves.toMatchObject({
      supplier: 'Molino sur',
      fundingSource: 'services',
    });
    await expect(
      cancelFinancePurchase('purchase-1', { reason: 'duplicada' }),
    ).resolves.toMatchObject({
      id: 'purchase-1',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/finance/purchases', { params: {} });
    expect(apiClient.put).toHaveBeenCalledWith('/finance/purchases/purchase-1', {
      supplier: 'Molino sur',
      fundingSource: 'services',
    });
    expect(apiClient.delete).toHaveBeenCalledWith('/finance/purchases/purchase-1', {
      data: { reason: 'duplicada' },
    });
  });
});
