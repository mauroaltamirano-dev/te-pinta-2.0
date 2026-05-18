import { describe, expect, it } from 'vitest';

import { calculateItemPrice, calculateOrderPromotion } from './pricing';

const prices = {
  priceUnit: 1200,
  priceHalfDozen: 6000,
  priceDozen: 11000,
};

describe('calculateItemPrice', () => {
  it('uses unit pricing for 4 units', () => {
    expect(calculateItemPrice({ quantity: 4, ...prices })).toEqual({
      quantity: 4,
      dozens: 0,
      halfDozens: 0,
      units: 4,
      total: 4800,
    });
  });

  it('prioritizes half-dozen plus units for 8 units', () => {
    expect(calculateItemPrice({ quantity: 8, ...prices })).toEqual({
      quantity: 8,
      dozens: 0,
      halfDozens: 1,
      units: 2,
      total: 8400,
    });
  });

  it('uses dozen pricing for 12 units', () => {
    expect(calculateItemPrice({ quantity: 12, ...prices })).toEqual({
      quantity: 12,
      dozens: 1,
      halfDozens: 0,
      units: 0,
      total: 11000,
    });
  });

  it('prioritizes dozen plus unit for 13 units', () => {
    expect(calculateItemPrice({ quantity: 13, ...prices })).toEqual({
      quantity: 13,
      dozens: 1,
      halfDozens: 0,
      units: 1,
      total: 12200,
    });
  });

  it('rejects non-positive quantities', () => {
    expect(() => calculateItemPrice({ quantity: 0, ...prices })).toThrow(
      'Quantity must be positive',
    );
  });
});

describe('calculateOrderPromotion', () => {
  it('applies the combined dozen promo when one dozen is split across varieties', () => {
    expect(
      calculateOrderPromotion({
        items: [
          { quantity: 6, subtotal: 9000 },
          { quantity: 6, subtotal: 9000 },
        ],
      }),
    ).toMatchObject({
      subtotal: 18000,
      totalQuantity: 12,
      promoSubtotal: 15000,
      discount: 0,
      total: 15000,
      appliedPromotions: [{ key: 'combined_dozen', amount: 3000 }],
    });
  });


  it('applies the combined dozen promo to any 12 mixed units across varieties', () => {
    expect(
      calculateOrderPromotion({
        items: [
          { quantity: 5, subtotal: 7750, priceUnit: 1550, priceHalfDozen: 8500 },
          { quantity: 5, subtotal: 7750, priceUnit: 1550, priceHalfDozen: 8500 },
          { quantity: 1, subtotal: 1450, priceUnit: 1450, priceHalfDozen: 8000 },
          { quantity: 1, subtotal: 1550, priceUnit: 1550, priceHalfDozen: 8500 },
        ],
      }),
    ).toMatchObject({
      subtotal: 18500,
      totalQuantity: 12,
      promoSubtotal: 15000,
      discount: 0,
      total: 15000,
      appliedPromotions: [{ key: 'combined_dozen', amount: 3500 }],
    });
  });

  it('applies the combined dozen promo to several split dozens', () => {
    expect(
      calculateOrderPromotion({
        items: [
          { quantity: 6, subtotal: 8000 },
          { quantity: 6, subtotal: 8500 },
          { quantity: 6, subtotal: 9000 },
          { quantity: 6, subtotal: 8500 },
          { quantity: 6, subtotal: 8000 },
          { quantity: 6, subtotal: 8000 },
        ],
      }),
    ).toMatchObject({
      subtotal: 50000,
      totalQuantity: 36,
      promoSubtotal: 45000,
      discountPercent: 10,
      discount: 4500,
      total: 40500,
      appliedPromotions: [
        { key: 'combined_dozen', amount: 5000 },
        { key: 'bulk_dozen', amount: 4500 },
      ],
    });
  });

  it('leaves one half dozen at its own price when split dozens have a remainder', () => {
    expect(
      calculateOrderPromotion({
        items: [
          { quantity: 6, subtotal: 9000 },
          { quantity: 6, subtotal: 8500 },
          { quantity: 6, subtotal: 8500 },
        ],
      }),
    ).toMatchObject({
      subtotal: 26000,
      totalQuantity: 18,
      promoSubtotal: 23500,
      discount: 0,
      total: 23500,
      appliedPromotions: [{ key: 'combined_dozen', amount: 2500 }],
    });
  });

  it('keeps a single half dozen at half-dozen price', () => {
    expect(
      calculateOrderPromotion({
        items: [{ quantity: 6, subtotal: 8000 }],
      }),
    ).toMatchObject({
      subtotal: 8000,
      totalQuantity: 6,
      promoSubtotal: 8000,
      discount: 0,
      total: 8000,
      appliedPromotions: [],
    });
  });

  it('keeps whole-variety dozens separate from combined half-dozen pairs', () => {
    expect(
      calculateOrderPromotion({
        items: [
          { quantity: 12, subtotal: 15000 },
          { quantity: 6, subtotal: 8500 },
          { quantity: 6, subtotal: 9000 },
        ],
      }),
    ).toMatchObject({
      subtotal: 32500,
      totalQuantity: 24,
      promoSubtotal: 30000,
      discount: 0,
      total: 30000,
      appliedPromotions: [{ key: 'combined_dozen', amount: 2500 }],
    });
  });

  it('applies the bulk discount from three dozens onward', () => {
    expect(
      calculateOrderPromotion({
        items: [{ quantity: 36, subtotal: 45000 }],
        deliveryFee: 1000,
      }),
    ).toMatchObject({
      subtotal: 45000,
      totalQuantity: 36,
      discountPercent: 10,
      discount: 4500,
      deliveryFee: 1000,
      total: 41500,
      appliedPromotions: [{ key: 'bulk_dozen', amount: 4500 }],
    });
  });

  it('adds toppings to the order total and discount base', () => {
    expect(
      calculateOrderPromotion({
        items: [{ quantity: 36, subtotal: 45000 }],
        addons: [{ quantity: 2, subtotal: 1500 }],
      }),
    ).toMatchObject({
      subtotal: 46500,
      itemsSubtotal: 45000,
      addonsSubtotal: 1500,
      promoSubtotal: 46500,
      discountPercent: 10,
      discount: 4650,
      total: 41850,
    });
  });

  it('keeps a larger manual discount when it beats the bulk promo', () => {
    expect(
      calculateOrderPromotion({
        items: [{ quantity: 36, subtotal: 45000 }],
        manualDiscountPercent: 15,
      }).discountPercent,
    ).toBe(15);
  });
});
