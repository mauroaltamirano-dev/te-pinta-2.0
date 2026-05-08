import { describe, expect, it } from 'vitest';

import { calculateItemPrice, createOrderSchema, PACKAGE_NAME } from './index';

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
  });
});
