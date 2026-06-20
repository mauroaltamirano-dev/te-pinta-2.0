import { describe, expect, it } from 'vitest';

import type { Customer } from './customers-api';
import type { OrderListItem } from '../orders/orders-api';
import {
  buildCustomerProfile,
  buildCustomerProfiles,
  formatMoney,
  formatRelativePurchaseDate,
  matchesCustomerFilter,
} from './customers-utils';

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'customer-test',
  name: 'María Gómez',
  phone: '3510000001',
  address: 'Av. Colón 1234',
  ...overrides,
});

const order = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
  id: 'order-1',
  customer: customer(),
  deliveryDate: '2026-06-01',
  deliveryTime: 'tarde',
  deliveryType: 'retiro',
  cooked: false,
  notes: null,
  discountPercent: 0,
  deliveryFee: 0,
  cookingFee: 0,
  subtotal: 15000,
  total: 15000,
  status: 'entregado',
  isPaid: true,
  itemCount: 1,
  totalQuantity: 12,
  ...overrides,
});

describe('customers-utils', () => {
  it('formats money in Argentine style', () => {
    expect(formatMoney(92000)).toBe('$ 92.000');
  });

  it('formats relative purchase dates', () => {
    const reference = new Date(2026, 5, 4);
    expect(formatRelativePurchaseDate('2026-06-04', reference)).toBe('Hoy');
    expect(formatRelativePurchaseDate('2026-06-03', reference)).toBe('Ayer');
    expect(formatRelativePurchaseDate('2026-05-30', reference)).toBe('Hace 5 días');
  });

  it('builds profile metrics from orders', () => {
    const base = customer({ id: 'customer-1', name: 'Ana Pérez' });
    const profile = buildCustomerProfile(
      base,
      [
        order({
          id: 'o1',
          customer: base,
          total: 30000,
          deliveryDate: '2026-06-01',
          isPaid: true,
        }),
        order({
          id: 'o2',
          customer: base,
          total: 15000,
          deliveryDate: '2026-05-20',
          isPaid: false,
        }),
      ],
      new Date(2026, 5, 4),
    );

    expect(profile.orderCount).toBeGreaterThanOrEqual(2);
    expect(profile.totalPurchased).toBe(45000);
    expect(profile.debtAmount).toBe(15000);
    expect(profile.favoriteVariety).toBe('Sin datos');
    expect(matchesCustomerFilter(profile, 'con-deuda')).toBe(true);
  });

  it('does not create demo customers when the API returns an empty list', () => {
    expect(buildCustomerProfiles([], [], new Date(2026, 5, 4))).toEqual([]);
  });
});
