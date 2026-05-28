import { describe, expect, it } from 'vitest';

import {
  adminEnvSchema,
  createCustomerSchema,
  createFinanceBaseCostRuleSchema,
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  createFinanceStockAdjustmentSchema,
  createIngredientSchema,
  createMenuItemSchema,
  createOrderSchema,
  deliveryTimeSchema,
  deliveryTypeSchema,
  financeBaseUnitSchema,
  financeCostingPreviewOrderSchema,
  financeProductCategorySchema,
  orderStatusSchema,
  updateFinanceBaseCostRuleSchema,
  updateFinanceRecipeSchema,
  updateSettingSchema,
} from './index';

describe('shared domain schemas', () => {
  it('validates admin env credentials for seed/bootstrap', () => {
    expect(
      adminEnvSchema.parse({
        ADMIN_EMAIL: 'admin@tepinta.com',
        ADMIN_PASSWORD: 'super-secret',
        ADMIN_NAME: 'Admin Te Pinta',
      }),
    ).toEqual({
      ADMIN_EMAIL: 'admin@tepinta.com',
      ADMIN_PASSWORD: 'super-secret',
      ADMIN_NAME: 'Admin Te Pinta',
    });
  });

  it('validates menu item prices and active flag', () => {
    expect(
      createMenuItemSchema.parse({
        name: 'Carne suave',
        priceUnit: 1200,
        priceHalfDozen: 6000,
        priceDozen: 11000,
        costPerDozen: 4500,
      }),
    ).toMatchObject({ name: 'Carne suave', isActive: true });
  });

  it('validates customer, ingredient, setting, and order contracts', () => {
    expect(createCustomerSchema.parse({ name: 'Mauro', phone: '+5491112345678' }).phone).toBe(
      '+5491112345678',
    );
    expect(
      createIngredientSchema.parse({ name: 'Harina', unit: 'kg', purchasePrice: 1000 }).unit,
    ).toBe('kg');
    expect(updateSettingSchema.parse({ key: 'delivery_fee', value: '500' }).key).toBe(
      'delivery_fee',
    );
    expect(
      createOrderSchema.parse({
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-06',
        deliveryTime: 'noche',
        deliveryType: 'envio',
        cooked: false,
        discountPercent: 10,
        deliveryFee: 500,
        items: [{ menuItemId: 'item-1', quantity: 13 }],
        addons: [{ addonId: 'yasgua_salsa', quantity: 2 }],
      }).items[0]?.quantity,
    ).toBe(13);
  });

  it('exposes enum values used by API and web', () => {
    expect(orderStatusSchema.options).toEqual(['confirmado', 'preparado', 'entregado']);
    expect(deliveryTimeSchema.options).toEqual(['mediodia', 'tarde', 'noche']);
    expect(deliveryTypeSchema.options).toEqual(['retiro', 'envio']);
  });

  it('validates finance product catalog and purchase contracts', () => {
    expect(
      createFinanceProductSchema.parse({
        name: ' Tapas de empanadas ',
        category: 'raw_material',
        baseUnit: 'unit',
        stockTracking: true,
      }),
    ).toMatchObject({
      name: 'Tapas de empanadas',
      category: 'raw_material',
      baseUnit: 'unit',
      stockTracking: true,
      isActive: true,
    });

    const purchase = createFinancePurchaseSchema.parse({
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
      ],
    });

    expect(purchase.items[0]).toMatchObject({
      productId: 'product-tapa',
      purchaseQuantity: 24,
      unitsPerPackage: 12,
      unitPriceCents: 160_000,
    });

    expect(
      createFinancePurchaseSchema.safeParse({
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
      }).success,
    ).toBe(false);
    expect(
      createFinancePurchaseSchema.safeParse({
        purchaseDate: '2026-05-27',
        items: [
          {
            productId: 'product-tapa',
            purchaseUnit: 'pack',
            purchaseQuantity: 24,
            unitsPerPackage: 12,
            unitPriceCents: 0,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      createFinancePurchaseSchema.safeParse({
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
      }).success,
    ).toBe(false);
  });

  it('validates finance rules, recipes, stock adjustments, and costing previews', () => {
    expect(financeProductCategorySchema.options).toContain('investment');
    expect(financeBaseUnitSchema.options).toEqual(['unit', 'g', 'kg', 'ml', 'l', 'pack']);
    expect(
      createFinanceBaseCostRuleSchema.parse({
        productId: 'product-box',
        name: 'Caja delivery',
        componentType: 'packaging',
        appliesTo: 'per_started_dozen',
        quantity: 1,
      }),
    ).toMatchObject({ groupSizeUnits: 12, roundingMode: 'ceil', isActive: true });
    expect(updateFinanceBaseCostRuleSchema.parse({ isActive: false })).toEqual({
      isActive: false,
    });
    expect(
      updateFinanceRecipeSchema.parse({
        menuItemId: 'menu-saltena',
        items: [
          {
            productId: 'product-roast-beef',
            quantityPerDozen: 1_000,
            unit: 'g',
            quantityBase: 1_000,
          },
        ],
      }).items[0]?.quantityBase,
    ).toBe(1_000);
    expect(
      createFinanceStockAdjustmentSchema.parse({
        productId: 'product-tapa',
        movementType: 'waste',
        quantity: 6,
      }).movementType,
    ).toBe('waste');
    expect(
      createFinanceStockAdjustmentSchema.safeParse({
        productId: 'product-tapa',
        movementType: 'purchase_in',
        quantity: 6,
      }).success,
    ).toBe(false);
    expect(
      createFinanceStockAdjustmentSchema.safeParse({
        productId: 'product-tapa',
        movementType: 'order_consumption',
        quantity: 6,
      }).success,
    ).toBe(false);
    expect(
      financeCostingPreviewOrderSchema.parse({
        saleTotalCents: 1_500_000,
        items: [{ menuItemId: 'menu-saltena', quantity: 12 }],
      }).items[0]?.quantity,
    ).toBe(12);
  });
});
