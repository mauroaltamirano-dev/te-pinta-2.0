import { describe, expect, it } from 'vitest';

import {
  buildPurchaseRows,
  getPurchaseItemImpact,
  summarizePriceDelta,
  type PurchaseSortState,
} from './purchaseImpact';
import type { FinanceProductWithMetrics, FinancePurchaseDetail } from '../types';

const product = (
  overrides: Partial<FinanceProductWithMetrics> & Pick<FinanceProductWithMetrics, 'id' | 'name'>,
): FinanceProductWithMetrics => ({
  normalizedName: overrides.name.toLowerCase(),
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: 120000,
  averageCostPerBaseUnitCents: 110000,
  purchasedQuantityBase: 10,
  stockQuantityBase: 5,
  purchaseCount: 1,
  warnings: [],
  ...overrides,
  id: overrides.id,
  name: overrides.name,
});

const products = [
  product({ id: 'flour', name: 'Harina 000' }),
  product({ id: 'cheese', name: 'Muzzarella', latestCostPerBaseUnitCents: 220000 }),
];

const purchase = (overrides: Partial<FinancePurchaseDetail>): FinancePurchaseDetail => ({
  id: 'purchase-1',
  purchaseDate: '2026-05-20',
  supplier: 'Molino norte',
  receiptNumber: 'A-0001',
  notes: 'Compra mensual',
  canceledAt: null,
  canceledReason: null,
  items: [
    {
      id: 'item-1',
      purchaseId: 'purchase-1',
      productId: 'flour',
      purchaseUnit: 'kg',
      purchaseQuantity: 2,
      unitsPerPackage: 1,
      totalBaseUnits: 2,
      unitPriceCents: 120000,
      totalPriceCents: 240000,
      costPerBaseUnitCents: 120000,
      notes: null,
    },
  ],
  itemImpacts: [
    {
      purchaseItemId: 'item-1',
      stockBeforeBase: 10,
      stockAfterBase: 12,
      previousCostPerBaseUnitCents: 100000,
      newCostPerBaseUnitCents: 120000,
      priceDeltaCents: 20000,
      priceDeltaPercent: 20,
    },
  ],
  stockMovements: [],
  ...overrides,
});

describe('purchaseImpact helpers', () => {
  it('filters purchases by supplier, receipt, notes, and product names while exposing totals', () => {
    const rows = buildPurchaseRows(
      [
        purchase({ id: 'purchase-1', supplier: 'Molino norte' }),
        purchase({
          id: 'purchase-2',
          supplier: 'Lácteos sur',
          receiptNumber: 'B-200',
          notes: 'Urgente',
          items: [
            {
              id: 'item-2',
              purchaseId: 'purchase-2',
              productId: 'cheese',
              purchaseUnit: 'kg',
              purchaseQuantity: 1,
              unitsPerPackage: 1,
              totalBaseUnits: 1,
              unitPriceCents: 220000,
              totalPriceCents: 220000,
              costPerBaseUnitCents: 220000,
              notes: null,
            },
          ],
          itemImpacts: [],
        }),
      ],
      products,
      'muzzarella',
      { field: 'date', direction: 'descending' },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'purchase-2',
      productNames: ['Muzzarella'],
      totalCents: 220000,
      totalBaseUnits: 1,
      itemCount: 1,
    });
  });

  it('sorts purchases by total amount and hides canceled rows from the purchase list', () => {
    const sort: PurchaseSortState = { field: 'total', direction: 'descending' };
    const rows = buildPurchaseRows(
      [
        purchase({ id: 'small', canceledAt: '2026-05-21T12:00:00.000Z' }),
        purchase({
          id: 'large',
          purchaseDate: '2026-05-22',
          supplier: 'Lácteos sur',
          items: [
            {
              id: 'item-large',
              purchaseId: 'large',
              productId: 'cheese',
              purchaseUnit: 'kg',
              purchaseQuantity: 4,
              unitsPerPackage: 1,
              totalBaseUnits: 4,
              unitPriceCents: 220000,
              totalPriceCents: 880000,
              costPerBaseUnitCents: 220000,
              notes: null,
            },
          ],
          itemImpacts: [],
        }),
      ],
      products,
      '',
      sort,
    );

    expect(rows.map((row) => row.id)).toEqual(['large']);
    expect(rows.some((row) => row.status === 'canceled')).toBe(false);
  });

  it('matches item impact details and labels positive, negative, and missing price deltas', () => {
    const selectedPurchase = purchase({});
    const item = selectedPurchase.items[0]!;

    expect(getPurchaseItemImpact(selectedPurchase, item)).toEqual(
      expect.objectContaining({ stockBeforeBase: 10, stockAfterBase: 12, priceDeltaCents: 20000 }),
    );
    expect(summarizePriceDelta(getPurchaseItemImpact(selectedPurchase, item))).toEqual({
      tone: 'positive',
      label: 'Subió',
      deltaCents: 20000,
      deltaPercent: 20,
    });
    expect(
      summarizePriceDelta({
        purchaseItemId: 'item-2',
        stockBeforeBase: 12,
        stockAfterBase: 14,
        previousCostPerBaseUnitCents: 150000,
        newCostPerBaseUnitCents: 120000,
        priceDeltaCents: -30000,
        priceDeltaPercent: -20,
      }),
    ).toMatchObject({ tone: 'negative', label: 'Bajó' });
    expect(summarizePriceDelta(undefined)).toEqual({
      tone: 'neutral',
      label: 'Sin comparación',
      deltaCents: null,
      deltaPercent: null,
    });
  });
});
