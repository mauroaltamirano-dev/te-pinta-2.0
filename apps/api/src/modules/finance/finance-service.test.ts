import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../middlewares/error-handler';
import type {
  FinanceProduct,
  FinancePurchaseDetail,
  FinanceRepository,
  FinanceStockMovement,
} from './finance-service';
import {
  createFinancePurchase,
  createFinanceStockAdjustment,
  listFinanceProducts,
  previewFinanceOrderCost,
} from './finance-service';

const product = (overrides: Partial<FinanceProduct> = {}): FinanceProduct => ({
  id: 'product-tapa',
  name: 'Tapas de empanadas',
  normalizedName: 'tapas de empanadas',
  category: 'raw_material',
  baseUnit: 'unit',
  stockTracking: true,
  isActive: true,
  ...overrides,
});

const purchaseDetail = (overrides: Partial<FinancePurchaseDetail> = {}): FinancePurchaseDetail => ({
  id: 'purchase-1',
  purchaseDate: '2026-05-27',
  supplier: 'Mayorista Centro',
  receiptNumber: null,
  notes: null,
  items: [],
  ...overrides,
});

const movement = (overrides: Partial<FinanceStockMovement> = {}): FinanceStockMovement => ({
  id: 'movement-1',
  productId: 'product-tapa',
  movementType: 'purchase_in',
  quantityBase: 288,
  sourcePurchaseItemId: 'purchase-item-1',
  notes: null,
  createdAt: new Date('2026-05-27T12:00:00.000Z'),
  ...overrides,
});

const createRepository = (overrides: Partial<FinanceRepository> = {}): FinanceRepository => ({
  listProducts: async () => [],
  createProduct: async (input) => product(input),
  getProductsByIds: async () => [product()],
  createPurchaseWithItems: async (input) => purchaseDetail({ id: input.id, items: input.items }),
  listStock: async () => [],
  createStockMovement: async (input) => movement(input),
  getCostingData: async () => ({
    baseRawMaterialRules: [],
    packagingRules: [],
    recipeItemsByMenuItemId: new Map(),
    menuItemsById: new Map([['menu-humita', { id: 'menu-humita', name: 'Humita' }]]),
  }),
  ...overrides,
});

describe('finance service', () => {
  it('records purchase item costs and stock ledger movements atomically for tracked products', async () => {
    let persisted: Parameters<FinanceRepository['createPurchaseWithItems']>[0] | undefined;
    const repository = createRepository({
      getProductsByIds: async () => [
        product({ id: 'product-tapa', stockTracking: true }),
        product({ id: 'product-servilletas', stockTracking: false }),
      ],
      createPurchaseWithItems: async (input) => {
        persisted = input;
        return purchaseDetail({
          id: input.id,
          items: input.items,
          stockMovements: input.stockMovements.map((item) =>
            movement({ ...item, createdAt: new Date('2026-05-27T12:00:00.000Z') }),
          ),
        });
      },
    });

    const result = await createFinancePurchase(
      {
        purchaseDate: '2026-05-27',
        supplier: 'Mayorista Centro',
        items: [
          {
            productId: 'product-tapa',
            purchaseUnit: 'pack',
            purchaseQuantity: 24,
            unitsPerPackage: 12,
            unitPriceCents: 160_000,
          },
          {
            productId: 'product-servilletas',
            purchaseUnit: 'pack',
            purchaseQuantity: 1,
            unitsPerPackage: 100,
            totalPriceCents: 13_800,
          },
        ],
      },
      repository,
    );

    expect(persisted?.items).toHaveLength(2);
    expect(persisted?.items[0]).toMatchObject({
      productId: 'product-tapa',
      totalBaseUnits: 288,
      totalPriceCents: 3_840_000,
      costPerBaseUnitCents: 13_333,
    });
    expect(persisted?.items[1]).toMatchObject({
      productId: 'product-servilletas',
      unitPriceCents: null,
      totalPriceCents: 13_800,
      costPerBaseUnitCents: 138,
    });
    expect(persisted?.stockMovements).toHaveLength(1);
    expect(persisted?.stockMovements[0]).toMatchObject({
      productId: 'product-tapa',
      movementType: 'purchase_in',
      quantityBase: 288,
      sourcePurchaseItemId: persisted?.items[0]?.id,
    });
    expect(result.stockMovements).toHaveLength(1);
  });

  it('rejects reserved stock adjustment movement types and non-stock-tracked products', async () => {
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>();
    const repository = createRepository({
      getProductsByIds: async () => [
        product({ id: 'product-tapa', stockTracking: true }),
        product({ id: 'product-servilletas', stockTracking: false }),
      ],
      createStockMovement,
    });

    await expect(
      createFinanceStockAdjustment(
        {
          productId: 'product-tapa',
          movementType: 'purchase_in',
          quantity: 6,
        } as unknown as Parameters<typeof createFinanceStockAdjustment>[0],
        repository,
      ),
    ).rejects.toMatchObject(
      new ApiError(
        400,
        'Stock adjustments only support manual movement types',
        'FINANCE_STOCK_ADJUSTMENT_TYPE_INVALID',
      ),
    );
    await expect(
      createFinanceStockAdjustment(
        {
          productId: 'product-servilletas',
          movementType: 'manual_out',
          quantity: 6,
        },
        repository,
      ),
    ).rejects.toMatchObject(
      new ApiError(
        400,
        'Finance product does not track stock',
        'FINANCE_PRODUCT_NOT_STOCK_TRACKED',
      ),
    );
    expect(createStockMovement).not.toHaveBeenCalled();
  });

  it('records waste stock adjustments as negative auditable ledger movements', async () => {
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>(
      async (input) => movement({ ...input, createdAt: new Date('2026-05-28T10:00:00.000Z') }),
    );
    const repository = createRepository({
      getProductsByIds: async () => [product({ id: 'product-tapa', stockTracking: true })],
      createStockMovement,
    });

    const result = await createFinanceStockAdjustment(
      {
        productId: 'product-tapa',
        movementType: 'waste',
        quantity: 18,
        notes: '  Broken tray during prep  ',
      },
      repository,
    );

    expect(createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-tapa',
        movementType: 'waste',
        quantityBase: -18,
        sourcePurchaseItemId: null,
        notes: 'Broken tray during prep',
      }),
    );
    expect(result).toMatchObject({
      productId: 'product-tapa',
      movementType: 'waste',
      quantityBase: -18,
      sourcePurchaseItemId: null,
      notes: 'Broken tray during prep',
    });
  });

  it('uses the latest purchase cost as source of truth while exposing average as a metric', async () => {
    const repository = createRepository({
      listProducts: async () => [
        {
          product: product(),
          purchaseHistory: [
            {
              purchaseQuantity: 1,
              unitsPerPackage: 12,
              totalBaseUnits: 12,
              totalPriceCents: 1_920_000,
              costPerBaseUnitCents: 160_000,
              purchasedAt: '2026-05-01',
            },
            {
              purchaseQuantity: 1,
              unitsPerPackage: 12,
              totalBaseUnits: 12,
              totalPriceCents: 1_500_000,
              costPerBaseUnitCents: 125_000,
              purchasedAt: '2026-05-10',
            },
          ],
          stockQuantityBase: 24,
        },
      ],
    });

    const [result] = await listFinanceProducts(repository);

    expect(result).toMatchObject({
      id: 'product-tapa',
      latestCostPerBaseUnitCents: 125_000,
      averageCostPerBaseUnitCents: 142_500,
      stockQuantityBase: 24,
      purchasedQuantityBase: 24,
      purchaseCount: 2,
    });
  });

  it('returns partial costing preview warnings instead of failing when finance data is incomplete', async () => {
    const result = await previewFinanceOrderCost(
      {
        saleTotalCents: 1_500_000,
        items: [{ menuItemId: 'menu-humita', quantity: 6 }],
      },
      createRepository(),
    );

    expect(result.totalCostCents).toBe(0);
    expect(result.packagingUnits).toBe(1);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'missing_base_raw_material_rules',
      'missing_packaging_rules',
      'missing_recipe_cost',
    ]);
  });
});
