import { describe, expect, it } from 'vitest';

import { calculateItemPrice } from './pricing';

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
