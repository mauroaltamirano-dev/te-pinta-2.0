import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../middlewares/error-handler';
import type {
  FinanceProduct,
  FinancePurchaseDetail,
  FinanceRepository,
  FinanceStockMovement,
} from './finance-service';
import {
  createFinanceBaseCostRule,
  cancelFinancePurchase,
  createFinancePurchase,
  createFinanceStockAdjustment,
  getFinanceProductHistory,
  listFinanceProducts,
  listFinancePurchases,
  previewFinanceOrderCost,
  updateFinanceProduct,
  updateFinanceRecipe,
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
  canceledAt: null,
  canceledReason: null,
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
  updateProduct: async (id, updates) => product({ id, ...updates }),
  getProductsByIds: async () => [product()],
  listProductPurchaseHistory: async () => new Map(),
  listStockMovementsByProducts: async () => [],
  createPurchaseWithItems: async (input) => purchaseDetail({ id: input.id, items: input.items }),
  listPurchases: async () => [],
  getPurchase: async () => null,
  cancelPurchase: async () => null,
  listStock: async () => [],
  createStockMovement: async (input) => movement(input),
  listBaseCostRules: async () => [],
  createBaseCostRule: async (input) => ({
    ...input,
    productName: 'Tapas de empanadas',
    latestCostCents: 13_333,
  }),
  updateBaseCostRule: async () => null,
  deleteBaseCostRule: async () => false,
  listRecipes: async () => [],
  getRecipe: async () => null,
  replaceRecipe: async (input) => ({
    menuItemId: input.menuItemId,
    menuItemName: 'Humita',
    items: input.items.map((item) => ({
      ...item,
      name: 'Cebolla',
      latestCostCents: 1_000,
    })),
    totalCostPerDozenCents: 1_000,
    totalCostPerUnitCents: 83,
    warnings: [],
  }),
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

  it('cancels purchases with reversing stock movements and excludes repeated cancellation', async () => {
    const activePurchase = purchaseDetail({
      stockMovements: [movement({ quantityBase: 100, sourcePurchaseItemId: 'purchase-item-1' })],
    });
    const cancelPurchase = vi.fn<FinanceRepository['cancelPurchase']>().mockResolvedValue({
      ...activePurchase,
      canceledAt: new Date('2026-05-29T12:00:00.000Z'),
      canceledReason: 'duplicada',
    });
    const repository = createRepository({
      getPurchase: async () => activePurchase,
      cancelPurchase,
    });

    const canceled = await cancelFinancePurchase('purchase-1', { reason: 'duplicada' }, repository);

    expect(canceled.canceledReason).toBe('duplicada');
    expect(cancelPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'purchase-1',
        canceledReason: 'duplicada',
        reversalMovements: [
          expect.objectContaining({
            movementType: 'adjustment',
            quantityBase: -100,
            sourcePurchaseItemId: 'purchase-item-1',
          }),
        ],
      }),
    );
  });

  it('does not create extra stock reversals when purchase is already canceled', async () => {
    const canceledPurchase = purchaseDetail({
      canceledAt: new Date('2026-05-29T12:00:00.000Z'),
      canceledReason: 'duplicada',
      stockMovements: [movement({ quantityBase: 100, sourcePurchaseItemId: 'purchase-item-1' })],
    });
    const cancelPurchase = vi.fn<FinanceRepository['cancelPurchase']>();
    const repository = createRepository({
      getPurchase: async () => canceledPurchase,
      cancelPurchase,
    });

    const result = await cancelFinancePurchase('purchase-1', {}, repository);

    expect(result).toBe(canceledPurchase);
    expect(cancelPurchase).not.toHaveBeenCalled();
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
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>(async (input) =>
      movement({ ...input, createdAt: new Date('2026-05-28T10:00:00.000Z') }),
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

  it('updates finance product names and records current-stock corrections as adjustment deltas', async () => {
    const updateProduct = vi.fn<FinanceRepository['updateProduct']>(async (id, updates) =>
      product({ id, ...updates }),
    );
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>(async (input) =>
      movement({ ...input, createdAt: new Date('2026-05-31T10:00:00.000Z') }),
    );
    const repository = createRepository({
      getProductsByIds: async () => [product({ id: 'product-tapa', stockTracking: true })],
      listStockMovementsByProducts: async () => [
        movement({ productId: 'product-tapa', quantityBase: 100 }),
      ],
      updateProduct,
      createStockMovement,
    });

    const result = await updateFinanceProduct(
      'product-tapa',
      { name: ' Tapas premium ', currentStockQuantityBase: 144 },
      repository,
    );

    expect(updateProduct).toHaveBeenCalledWith(
      'product-tapa',
      expect.objectContaining({
        name: 'Tapas premium',
        normalizedName: 'tapas premium',
      }),
    );
    expect(createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-tapa',
        movementType: 'adjustment',
        quantityBase: 44,
        sourcePurchaseItemId: null,
        notes: 'Stock correction to 144',
      }),
    );
    expect(result).toMatchObject({
      id: 'product-tapa',
      name: 'Tapas premium',
      stockQuantityBase: 144,
    });

    await expect(
      updateFinanceProduct(
        'missing-product',
        { currentStockQuantityBase: 5 },
        createRepository({ getProductsByIds: async () => [] }),
      ),
    ).rejects.toMatchObject(
      new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND'),
    );
  });

  it('returns product purchase history and enriches purchases with stock and price impacts', async () => {
    const purchaseHistory = [
      {
        id: 'purchase-item-1',
        purchaseQuantity: 1,
        unitsPerPackage: 12,
        totalBaseUnits: 12,
        totalPriceCents: 1_200,
        costPerBaseUnitCents: 100,
        purchasedAt: '2026-05-10',
        createdAt: '2026-05-10T10:00:00.000Z',
      },
      {
        id: 'purchase-item-2',
        purchaseQuantity: 2,
        unitsPerPackage: 12,
        totalBaseUnits: 24,
        totalPriceCents: 3_600,
        costPerBaseUnitCents: 150,
        purchasedAt: '2026-05-20',
        createdAt: '2026-05-20T10:00:00.000Z',
      },
      {
        id: 'purchase-item-3',
        purchaseQuantity: 1,
        unitsPerPackage: 12,
        totalBaseUnits: 12,
        totalPriceCents: 960,
        costPerBaseUnitCents: 80,
        purchasedAt: '2026-05-25',
        createdAt: '2026-05-25T10:00:00.000Z',
      },
    ];
    const repository = createRepository({
      getProductsByIds: async () => [product({ id: 'product-tapa' })],
      listProductPurchaseHistory: async () =>
        new Map([
          ['product-tapa', purchaseHistory],
          ['product-harina', []],
        ]),
      listStockMovementsByProducts: async () => [
        movement({
          id: 'movement-previous',
          productId: 'product-tapa',
          quantityBase: 12,
          sourcePurchaseItemId: 'purchase-item-1',
          createdAt: new Date('2026-05-10T10:00:00.000Z'),
        }),
        movement({
          id: 'movement-current',
          productId: 'product-tapa',
          quantityBase: 24,
          sourcePurchaseItemId: 'purchase-item-2',
          createdAt: new Date('2026-05-20T10:00:00.000Z'),
        }),
        movement({
          id: 'movement-price-drop',
          productId: 'product-tapa',
          quantityBase: 12,
          sourcePurchaseItemId: 'purchase-item-3',
          createdAt: new Date('2026-05-25T10:00:00.000Z'),
        }),
      ],
      listPurchases: async () => [
        purchaseDetail({
          id: 'purchase-2',
          items: [
            {
              id: 'purchase-item-2',
              purchaseId: 'purchase-2',
              productId: 'product-tapa',
              purchaseUnit: 'pack',
              purchaseQuantity: 2,
              unitsPerPackage: 12,
              totalBaseUnits: 24,
              unitPriceCents: 1_800,
              totalPriceCents: 3_600,
              costPerBaseUnitCents: 150,
              notes: null,
            },
            {
              id: 'purchase-item-3',
              purchaseId: 'purchase-2',
              productId: 'product-tapa',
              purchaseUnit: 'pack',
              purchaseQuantity: 1,
              unitsPerPackage: 12,
              totalBaseUnits: 12,
              unitPriceCents: 960,
              totalPriceCents: 960,
              costPerBaseUnitCents: 80,
              notes: null,
            },
          ],
        }),
      ],
    });

    await expect(getFinanceProductHistory('product-tapa', repository)).resolves.toEqual(
      purchaseHistory,
    );

    const [purchase] = await listFinancePurchases(repository);

    expect(purchase?.itemImpacts).toEqual([
      {
        purchaseItemId: 'purchase-item-2',
        stockBeforeBase: 12,
        stockAfterBase: 36,
        previousCostPerBaseUnitCents: 100,
        newCostPerBaseUnitCents: 150,
        priceDeltaCents: 50,
        priceDeltaPercent: 50,
      },
      {
        purchaseItemId: 'purchase-item-3',
        stockBeforeBase: 36,
        stockAfterBase: 48,
        previousCostPerBaseUnitCents: 150,
        newCostPerBaseUnitCents: 80,
        priceDeltaCents: -70,
        priceDeltaPercent: -46.67,
      },
    ]);
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

  it('creates base cost rules only for existing finance products', async () => {
    const createBaseCostRule = vi.fn<FinanceRepository['createBaseCostRule']>(async (input) => ({
      ...input,
      productName: 'Tapas de empanadas',
      latestCostCents: 13_333,
    }));
    const repository = createRepository({
      getProductsByIds: async () => [product({ id: 'product-tapa' })],
      createBaseCostRule,
    });

    const rule = await createFinanceBaseCostRule(
      {
        productId: 'product-tapa',
        name: 'Tapa por empanada',
        componentType: 'base_raw_material',
        appliesTo: 'per_empanada',
        quantity: 1,
        groupSizeUnits: 12,
        roundingMode: 'exact',
        isActive: true,
      },
      repository,
    );

    expect(createBaseCostRule).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-tapa',
        quantity: 1,
        roundingMode: 'exact',
      }),
    );
    expect(rule.latestCostCents).toBe(13_333);

    await expect(
      createFinanceBaseCostRule(
        {
          productId: 'missing-product',
          name: 'Missing',
          componentType: 'packaging',
          appliesTo: 'per_started_dozen',
          quantity: 1,
          groupSizeUnits: 12,
          roundingMode: 'ceil',
          isActive: true,
        },
        createRepository({ getProductsByIds: async () => [] }),
      ),
    ).rejects.toMatchObject(
      new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND'),
    );
  });

  it('replaces recipe rows after validating menu/product boundaries', async () => {
    const replaceRecipe = vi.fn<FinanceRepository['replaceRecipe']>(async (input) => ({
      menuItemId: input.menuItemId,
      menuItemName: 'Humita',
      items: input.items.map((item) => ({
        ...item,
        name: 'Cebolla',
        latestCostCents: 1_000,
      })),
      totalCostPerDozenCents: 250,
      totalCostPerUnitCents: 21,
      warnings: [],
    }));
    const repository = createRepository({
      getProductsByIds: async () => [product({ id: 'product-cebolla', baseUnit: 'kg' })],
      replaceRecipe,
    });

    const recipe = await updateFinanceRecipe(
      'menu-humita',
      {
        menuItemId: 'menu-humita',
        items: [
          {
            productId: 'product-cebolla',
            quantityPerDozen: 0.25,
            unit: 'kg',
            quantityBase: 0.25,
          },
        ],
      },
      repository,
    );

    expect(replaceRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        menuItemId: 'menu-humita',
        items: [
          expect.objectContaining({
            productId: 'product-cebolla',
            quantityBase: 0.25,
            notes: null,
          }),
        ],
      }),
    );
    expect(recipe.totalCostPerUnitCents).toBe(21);

    await expect(
      updateFinanceRecipe('menu-humita', { menuItemId: 'menu-salteña', items: [] }, repository),
    ).rejects.toMatchObject(
      new ApiError(400, 'Recipe menu item mismatch', 'FINANCE_RECIPE_MENU_ITEM_MISMATCH'),
    );
  });
});
