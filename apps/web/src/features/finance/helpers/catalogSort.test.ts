import { describe, expect, it } from 'vitest';

import { buildCatalogSections, sortCatalogProducts, type CatalogSortState } from './catalogSort';
import type { FinanceProductWithMetrics } from '../types';

const product = (
  overrides: Partial<FinanceProductWithMetrics> & Pick<FinanceProductWithMetrics, 'id' | 'name'>,
): FinanceProductWithMetrics => ({
  normalizedName: overrides.name.toLowerCase(),
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: null,
  averageCostPerBaseUnitCents: null,
  purchasedQuantityBase: 0,
  stockQuantityBase: 0,
  purchaseCount: 0,
  warnings: [],
  ...overrides,
  id: overrides.id,
  name: overrides.name,
});

const sortBy = (field: CatalogSortState['field'], direction: CatalogSortState['direction']) => ({
  field,
  direction,
});

describe('catalogSort', () => {
  it('filters by search and groups only categories that have matching products', () => {
    const sections = buildCatalogSections(
      [
        product({ id: 'flour', name: 'Harina 000', category: 'raw_material' }),
        product({ id: 'box', name: 'Caja docena', category: 'packaging', baseUnit: 'unit' }),
        product({ id: 'fuel', name: 'Nafta reparto', category: 'fuel', baseUnit: 'l' }),
      ],
      'caja',
      sortBy('name', 'ascending'),
    );

    expect(sections).toEqual([
      {
        category: 'packaging',
        label: 'Packaging',
        products: [expect.objectContaining({ id: 'box' })],
      },
    ]);
  });

  it('sorts numeric catalog columns with null costs last in both directions', () => {
    const products = [
      product({ id: 'empty', name: 'Sin costo', latestCostPerBaseUnitCents: null, purchaseCount: 0 }),
      product({ id: 'premium', name: 'Premium', latestCostPerBaseUnitCents: 500, purchaseCount: 8 }),
      product({ id: 'basic', name: 'Basic', latestCostPerBaseUnitCents: 100, purchaseCount: 2 }),
    ];

    expect(sortCatalogProducts(products, sortBy('latestCost', 'ascending')).map(({ id }) => id)).toEqual([
      'basic',
      'premium',
      'empty',
    ]);
    expect(sortCatalogProducts(products, sortBy('latestCost', 'descending')).map(({ id }) => id)).toEqual([
      'premium',
      'basic',
      'empty',
    ]);
    expect(sortCatalogProducts(products, sortBy('purchaseCount', 'descending')).map(({ id }) => id)).toEqual([
      'premium',
      'basic',
      'empty',
    ]);
  });
});
