import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app';
import { signAccessToken } from '../auth/jwt';
import { createFinanceRouter } from './finance-routes';
import type { FinanceRepository } from './finance-service';

const secrets = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
};

const accessToken = signAccessToken(
  { userId: 'admin', email: 'admin@tepinta.local', name: 'Admin Te Pinta' },
  secrets,
);

const createRepository = (overrides: Partial<FinanceRepository> = {}): FinanceRepository => ({
  listProducts: async () => [],
  createProduct: async (input) => ({
    ...input,
    normalizedName: input.name.toLocaleLowerCase('es-AR'),
  }),
  updateProduct: async (id, updates) => ({
    id,
    name: updates.name ?? 'Tapas de empanadas',
    normalizedName: updates.normalizedName ?? 'tapas de empanadas',
    category: updates.category ?? 'raw_material',
    baseUnit: updates.baseUnit ?? 'unit',
    stockTracking: updates.stockTracking ?? true,
    isActive: updates.isActive ?? true,
  }),
  getProductsByIds: async () => [],
  listProductPurchaseHistory: async () => new Map(),
  listStockMovementsByProducts: async () => [],
  createPurchaseWithItems: async (input) => ({
    id: input.id,
    purchaseDate: input.purchaseDate,
    supplier: input.supplier,
    receiptNumber: input.receiptNumber,
    notes: input.notes,
    fundingSource: input.fundingSource,
    canceledAt: null,
    canceledReason: null,
    items: input.items,
    stockMovements: input.stockMovements.map((item) => ({
      ...item,
      createdAt: new Date('2026-05-27T12:00:00.000Z'),
    })),
  }),
  updatePurchaseWithItems: async (input) => ({
    id: input.id,
    purchaseDate: input.purchaseDate,
    supplier: input.supplier,
    receiptNumber: input.receiptNumber,
    notes: input.notes,
    fundingSource: input.fundingSource,
    canceledAt: null,
    canceledReason: null,
    items: input.items ?? [],
    stockMovements:
      input.stockMovements?.map((item) => ({
        ...item,
        createdAt: new Date('2026-05-27T12:00:00.000Z'),
      })) ?? [],
  }),
  listPurchases: async () => [],
  getPurchase: async () => null,
  cancelPurchase: async () => null,
  listStock: async () => [],
  createStockMovement: async (input) => ({
    id: input.id,
    productId: input.productId,
    movementType: input.movementType,
    quantityBase: input.quantityBase,
    sourcePurchaseItemId: input.sourcePurchaseItemId,
    notes: input.notes,
    createdAt: new Date('2026-05-27T12:00:00.000Z'),
  }),
  listBaseCostRules: async () => [],
  createBaseCostRule: async (input) => ({
    ...input,
    productName: 'Tapas de empanadas',
    latestCostCents: 13_333,
  }),
  updateBaseCostRule: async (id, updates) => ({
    id,
    productId: updates.productId ?? 'product-tapa',
    productName: 'Tapas de empanadas',
    name: updates.name ?? 'Tapa por empanada',
    componentType: updates.componentType ?? 'base_raw_material',
    appliesTo: updates.appliesTo ?? 'per_empanada',
    quantity: updates.quantity ?? 1,
    groupSizeUnits: updates.groupSizeUnits ?? 12,
    roundingMode: updates.roundingMode ?? 'exact',
    latestCostCents: 13_333,
    isActive: updates.isActive ?? true,
  }),
  deleteBaseCostRule: async () => true,
  listRecipes: async () => [],
  getRecipe: async (menuItemId) => ({
    menuItemId,
    menuItemName: 'Humita',
    items: [],
    totalCostPerDozenCents: 0,
    totalCostPerUnitCents: 0,
    warnings: [],
  }),
  replaceRecipe: async (input) => ({
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
  }),
  getCostingData: async () => ({
    baseRawMaterialRules: [],
    packagingRules: [],
    recipeItemsByMenuItemId: new Map(),
    menuItemsById: new Map(),
  }),
  ...overrides,
});

const createFinanceApp = (repository: FinanceRepository) => {
  const apiRouter = Router();
  apiRouter.use('/finance', createFinanceRouter({ repository, secrets }));

  return createApp({
    allowedOrigin: 'http://localhost:5173',
    apiRouter,
  });
};

describe('finance routes', () => {
  it('protects finance endpoints with the existing bearer auth middleware', async () => {
    const response = await request(createFinanceApp(createRepository())).get(
      '/api/v1/finance/products',
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  });

  it('returns the standard validation error and does not persist partial purchases', async () => {
    const createPurchaseWithItems = vi.fn<FinanceRepository['createPurchaseWithItems']>();
    const app = createFinanceApp(
      createRepository({
        getProductsByIds: async () => [
          {
            id: 'product-tapa',
            name: 'Tapas de empanadas',
            normalizedName: 'tapas de empanadas',
            category: 'raw_material',
            baseUnit: 'unit',
            stockTracking: true,
            isActive: true,
          },
        ],
        createPurchaseWithItems,
      }),
    );

    const invalidQuantityResponse = await request(app)
      .post('/api/v1/finance/purchases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseDate: '2026-05-27',
        items: [
          {
            productId: 'product-tapa',
            purchaseUnit: 'pack',
            purchaseQuantity: 0,
            unitsPerPackage: 12,
            unitPriceCents: 160_000,
          },
        ],
      });
    const contradictoryPricesResponse = await request(app)
      .post('/api/v1/finance/purchases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseDate: '2026-05-27',
        items: [
          {
            productId: 'product-tapa',
            purchaseUnit: 'pack',
            purchaseQuantity: 24,
            unitsPerPackage: 12,
            unitPriceCents: 160_000,
            totalPriceCents: 3_840_000,
          },
        ],
      });
    const zeroPriceResponse = await request(app)
      .post('/api/v1/finance/purchases')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        purchaseDate: '2026-05-27',
        items: [
          {
            productId: 'product-tapa',
            purchaseUnit: 'pack',
            purchaseQuantity: 24,
            unitsPerPackage: 12,
            totalPriceCents: 0,
          },
        ],
      });

    expect([
      invalidQuantityResponse.status,
      contradictoryPricesResponse.status,
      zeroPriceResponse.status,
    ]).toEqual([400, 400, 400]);
    expect([
      invalidQuantityResponse.body,
      contradictoryPricesResponse.body,
      zeroPriceResponse.body,
    ]).toEqual([
      { error: 'Validation error', code: 'VALIDATION_ERROR' },
      { error: 'Validation error', code: 'VALIDATION_ERROR' },
      { error: 'Validation error', code: 'VALIDATION_ERROR' },
    ]);
    expect(createPurchaseWithItems).not.toHaveBeenCalled();
  });

  it('lists and safely cancels purchases through finance endpoints', async () => {
    const listPurchases = vi.fn<FinanceRepository['listPurchases']>().mockResolvedValue([
      {
        id: 'purchase-1',
        purchaseDate: '2026-05-27',
        supplier: 'Molino norte',
        receiptNumber: null,
        notes: null,
        fundingSource: 'profit',
        canceledAt: null,
        canceledReason: null,
        items: [],
        stockMovements: [],
      },
    ]);
    const getPurchase = vi.fn<FinanceRepository['getPurchase']>().mockResolvedValue({
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'profit',
      canceledAt: null,
      canceledReason: null,
      items: [],
      stockMovements: [],
    });
    const cancelPurchase = vi.fn<FinanceRepository['cancelPurchase']>().mockResolvedValue({
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'profit',
      canceledAt: new Date('2026-05-29T12:00:00.000Z'),
      canceledReason: 'duplicada',
      items: [],
      stockMovements: [],
    });
    const updatePurchaseWithItems = vi
      .fn<FinanceRepository['updatePurchaseWithItems']>()
      .mockResolvedValue({
        id: 'purchase-1',
        purchaseDate: '2026-05-28',
        supplier: 'Molino sur',
        receiptNumber: null,
        notes: null,
        fundingSource: 'services',
        canceledAt: null,
        canceledReason: null,
        items: [],
        stockMovements: [],
      });
    const app = createFinanceApp(
      createRepository({ listPurchases, getPurchase, updatePurchaseWithItems, cancelPurchase }),
    );

    const listResponse = await request(app)
      .get('/api/v1/finance/purchases')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.purchases[0]).toMatchObject({
      id: 'purchase-1',
      fundingSource: 'profit',
    });

    const updateResponse = await request(app)
      .put('/api/v1/finance/purchases/purchase-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        supplier: 'Molino sur',
        fundingSource: 'services',
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.purchase).toMatchObject({
      id: 'purchase-1',
      supplier: 'Molino sur',
      fundingSource: 'services',
    });
    expect(updatePurchaseWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ supplier: 'Molino sur', fundingSource: 'services' }),
    );

    const cancelResponse = await request(app)
      .delete('/api/v1/finance/purchases/purchase-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'duplicada' });
    expect(cancelResponse.status).toBe(200);
    expect(cancelPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'purchase-1', canceledReason: 'duplicada' }),
    );
  });

  it('updates products, exposes product history, and returns purchase impact details', async () => {
    const updateProduct = vi.fn<FinanceRepository['updateProduct']>(async (id, updates) => ({
      id,
      name: updates.name ?? 'Tapas de empanadas',
      normalizedName: updates.normalizedName ?? 'tapas de empanadas',
      category: 'raw_material',
      baseUnit: 'unit',
      stockTracking: true,
      isActive: true,
    }));
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>(async (input) => ({
      ...input,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
    }));
    const repository = createRepository({
      getProductsByIds: async () => [
        {
          id: 'product-tapa',
          name: 'Tapas de empanadas',
          normalizedName: 'tapas de empanadas',
          category: 'raw_material',
          baseUnit: 'unit',
          stockTracking: true,
          isActive: true,
        },
      ],
      listProductPurchaseHistory: async () =>
        new Map([
          [
            'product-tapa',
            [
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
            ],
          ],
        ]),
      listStockMovementsByProducts: async () => [
        {
          id: 'movement-previous',
          productId: 'product-tapa',
          movementType: 'purchase_in',
          quantityBase: 12,
          sourcePurchaseItemId: 'purchase-item-1',
          notes: null,
          createdAt: new Date('2026-05-10T10:00:00.000Z'),
        },
        {
          id: 'movement-current',
          productId: 'product-tapa',
          movementType: 'purchase_in',
          quantityBase: 24,
          sourcePurchaseItemId: 'purchase-item-2',
          notes: null,
          createdAt: new Date('2026-05-20T10:00:00.000Z'),
        },
      ],
      updateProduct,
      createStockMovement,
      listPurchases: async () => [
        {
          id: 'purchase-2',
          purchaseDate: '2026-05-20',
          supplier: 'Molino norte',
          receiptNumber: null,
          notes: null,
          fundingSource: 'production_cost',
          canceledAt: null,
          canceledReason: null,
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
          ],
          stockMovements: [],
        },
      ],
    });
    const app = createFinanceApp(repository);

    const updateResponse = await request(app)
      .put('/api/v1/finance/products/product-tapa')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: ' Tapas premium ', currentStockQuantityBase: 48 });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.product).toMatchObject({
      id: 'product-tapa',
      name: 'Tapas premium',
      stockQuantityBase: 48,
    });
    expect(createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'adjustment',
        quantityBase: 12,
        notes: 'Stock correction to 48',
      }),
    );

    const historyResponse = await request(app)
      .get('/api/v1/finance/products/product-tapa/history')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.purchaseHistory).toHaveLength(2);

    const purchasesResponse = await request(app)
      .get('/api/v1/finance/purchases')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(purchasesResponse.status).toBe(200);
    expect(purchasesResponse.body.purchases[0].itemImpacts).toEqual([
      {
        purchaseItemId: 'purchase-item-2',
        stockBeforeBase: 12,
        stockAfterBase: 36,
        previousCostPerBaseUnitCents: 100,
        newCostPerBaseUnitCents: 150,
        priceDeltaCents: 50,
        priceDeltaPercent: 50,
      },
    ]);
    expect(updateProduct).toHaveBeenCalledWith(
      'product-tapa',
      expect.objectContaining({ normalizedName: 'tapas premium' }),
    );
  });

  it('rejects purchase-created stock movement types on manual stock adjustment routes', async () => {
    const createStockMovement = vi.fn<FinanceRepository['createStockMovement']>();
    const app = createFinanceApp(createRepository({ createStockMovement }));

    const purchaseInResponse = await request(app)
      .post('/api/v1/finance/stock/adjustments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: 'product-tapa',
        movementType: 'purchase_in',
        quantity: 6,
      });
    const orderConsumptionResponse = await request(app)
      .post('/api/v1/finance/stock/adjustments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: 'product-tapa',
        movementType: 'order_consumption',
        quantity: 6,
      });

    expect([purchaseInResponse.status, orderConsumptionResponse.status]).toEqual([400, 400]);
    expect([purchaseInResponse.body, orderConsumptionResponse.body]).toEqual([
      { error: 'Validation error', code: 'VALIDATION_ERROR' },
      { error: 'Validation error', code: 'VALIDATION_ERROR' },
    ]);
    expect(createStockMovement).not.toHaveBeenCalled();
  });

  it('returns costing warnings instead of a server error for incomplete finance data', async () => {
    const app = createFinanceApp(
      createRepository({
        getCostingData: async () => ({
          baseRawMaterialRules: [],
          packagingRules: [],
          recipeItemsByMenuItemId: new Map(),
          menuItemsById: new Map([['menu-humita', { id: 'menu-humita', name: 'Humita' }]]),
        }),
      }),
    );

    const response = await request(app)
      .post('/api/v1/finance/costing/preview-order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        saleTotalCents: 1_500_000,
        items: [{ menuItemId: 'menu-humita', quantity: 6 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.breakdown.totalCostCents).toBe(0);
    expect(
      response.body.breakdown.warnings.map((warning: { code: string }) => warning.code),
    ).toEqual([
      'missing_base_raw_material_rules',
      'missing_packaging_rules',
      'missing_recipe_cost',
    ]);
  });

  it('exposes protected base-cost-rule CRUD endpoints', async () => {
    const createBaseCostRule = vi.fn<FinanceRepository['createBaseCostRule']>(async (input) => ({
      ...input,
      productName: 'Tapas de empanadas',
      latestCostCents: 13_333,
    }));
    const deleteBaseCostRule = vi.fn<FinanceRepository['deleteBaseCostRule']>(async () => true);
    const app = createFinanceApp(
      createRepository({
        getProductsByIds: async () => [
          {
            id: 'product-tapa',
            name: 'Tapas de empanadas',
            normalizedName: 'tapas de empanadas',
            category: 'raw_material',
            baseUnit: 'unit',
            stockTracking: true,
            isActive: true,
          },
        ],
        listBaseCostRules: async () => [
          {
            id: 'rule-1',
            productId: 'product-tapa',
            productName: 'Tapas de empanadas',
            name: 'Tapa por empanada',
            componentType: 'base_raw_material',
            appliesTo: 'per_empanada',
            quantity: 1,
            groupSizeUnits: 12,
            roundingMode: 'exact',
            latestCostCents: 13_333,
            isActive: true,
          },
        ],
        createBaseCostRule,
        deleteBaseCostRule,
      }),
    );

    const listResponse = await request(app)
      .get('/api/v1/finance/base-cost-rules')
      .set('Authorization', `Bearer ${accessToken}`);
    const createResponse = await request(app)
      .post('/api/v1/finance/base-cost-rules')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: 'product-tapa',
        name: 'Tapa por empanada',
        componentType: 'base_raw_material',
        appliesTo: 'per_empanada',
        quantity: 1,
        groupSizeUnits: 12,
        roundingMode: 'exact',
        isActive: true,
      });
    const deleteResponse = await request(app)
      .delete('/api/v1/finance/base-cost-rules/rule-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.rules[0]).toMatchObject({ id: 'rule-1', latestCostCents: 13_333 });
    expect(createResponse.status).toBe(201);
    expect(createBaseCostRule).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'product-tapa', quantity: 1 }),
    );
    expect(deleteResponse.status).toBe(204);
    expect(deleteBaseCostRule).toHaveBeenCalledWith('rule-1');
  });

  it('replaces recipes through the finance recipe endpoints', async () => {
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
    const app = createFinanceApp(
      createRepository({
        getProductsByIds: async () => [
          {
            id: 'product-cebolla',
            name: 'Cebolla',
            normalizedName: 'cebolla',
            category: 'raw_material',
            baseUnit: 'kg',
            stockTracking: true,
            isActive: true,
          },
        ],
        replaceRecipe,
      }),
    );

    const response = await request(app)
      .put('/api/v1/finance/recipes/menu-humita')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        menuItemId: 'menu-humita',
        items: [
          {
            productId: 'product-cebolla',
            quantityPerDozen: 0.25,
            unit: 'kg',
            quantityBase: 0.25,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.recipe.totalCostPerUnitCents).toBe(21);
    expect(replaceRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        menuItemId: 'menu-humita',
        items: [expect.objectContaining({ productId: 'product-cebolla', notes: null })],
      }),
    );
  });
});
