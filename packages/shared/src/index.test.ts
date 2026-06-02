import { describe, expect, it } from 'vitest';

import {
  calculateItemPrice,
  calculatePackagingUnits,
  createOrderSchema,
  financeAssumptionsSchema,
  financePurchaseItemImpactSchema,
  getBusinessDateIso,
  PACKAGE_NAME,
  updateFinanceProductSchema,
} from './index';

describe('shared package exports', () => {
  it('exposes the Te Pinta shared package name', () => {
    expect(PACKAGE_NAME).toBe('@te-pinta/shared');
  });

  it('exports schemas and utilities from the root package entrypoint', () => {
    expect(
      calculateItemPrice({ quantity: 12, priceUnit: 1, priceHalfDozen: 5, priceDozen: 9 }).total,
    ).toBe(9);
    expect(
      createOrderSchema.parse({
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-06',
        deliveryTime: 'mediodia',
        deliveryType: 'retiro',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      }).deliveryFee,
    ).toBe(0);
    expect(getBusinessDateIso(new Date('2026-05-31T00:00:00.000Z'))).toBe('2026-05-30');
  });

  it('exports finance costing helpers from the root package entrypoint', () => {
    expect(calculatePackagingUnits(25)).toBe(3);
  });

  it('exports finance UI contract schemas from the root package entrypoint', () => {
    expect(
      updateFinanceProductSchema.parse({ name: 'Tapa', currentStockQuantityBase: 12 }),
    ).toEqual({
      name: 'Tapa',
      currentStockQuantityBase: 12,
    });
    expect(financeAssumptionsSchema.parse({ servicePercent: 20, targetMarginPercent: 50 })).toEqual(
      {
        servicePercent: 20,
        targetMarginPercent: 50,
      },
    );
    expect(
      financePurchaseItemImpactSchema.parse({
        purchaseItemId: 'purchase-item-1',
        stockBeforeBase: 0,
        stockAfterBase: 12,
        previousCostPerBaseUnitCents: null,
        newCostPerBaseUnitCents: 100,
        priceDeltaCents: null,
        priceDeltaPercent: null,
      }).stockAfterBase,
    ).toBe(12);
  });
});
