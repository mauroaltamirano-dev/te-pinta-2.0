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
  getProductsByIds: async () => [],
  createPurchaseWithItems: async (input) => ({
    id: input.id,
    purchaseDate: input.purchaseDate,
    supplier: input.supplier,
    receiptNumber: input.receiptNumber,
    notes: input.notes,
    items: input.items,
    stockMovements: input.stockMovements.map((item) => ({
      ...item,
      createdAt: new Date('2026-05-27T12:00:00.000Z'),
    })),
  }),
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
});
