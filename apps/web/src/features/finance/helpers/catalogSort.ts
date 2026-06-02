import type { FinanceProductCategory, FinanceProductWithMetrics } from '../types';

export type CatalogSortField =
  | 'name'
  | 'unit'
  | 'latestCost'
  | 'averageCost'
  | 'stock'
  | 'purchaseCount';

export type CatalogSortDirection = 'ascending' | 'descending';

export type CatalogSortState = {
  field: CatalogSortField;
  direction: CatalogSortDirection;
};

export type CatalogCategorySection = {
  category: FinanceProductCategory;
  label: string;
  products: FinanceProductWithMetrics[];
};

export const catalogCategoryLabels: Record<FinanceProductCategory, string> = {
  raw_material: 'Materia prima',
  packaging: 'Packaging',
  operating_expense: 'Gasto operativo',
  service: 'Servicio',
  fuel: 'Combustible',
  investment: 'Inversión',
  other: 'Otro',
};

export const catalogCategoryOrder = Object.keys(
  catalogCategoryLabels,
) as FinanceProductCategory[];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getSortValue = (
  product: FinanceProductWithMetrics,
  field: CatalogSortField,
): string | number | null => {
  switch (field) {
    case 'name':
      return product.name;
    case 'unit':
      return product.baseUnit;
    case 'latestCost':
      return product.latestCostPerBaseUnitCents;
    case 'averageCost':
      return product.averageCostPerBaseUnitCents;
    case 'stock':
      return product.stockQuantityBase;
    case 'purchaseCount':
      return product.purchaseCount;
  }
};

const compareNullableNumber = (
  left: number | null,
  right: number | null,
  direction: CatalogSortDirection,
) => {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === 'ascending' ? left - right : right - left;
};

export const sortCatalogProducts = (
  products: FinanceProductWithMetrics[],
  sort: CatalogSortState,
): FinanceProductWithMetrics[] =>
  [...products].sort((left, right) => {
    const leftValue = getSortValue(left, sort.field);
    const rightValue = getSortValue(right, sort.field);

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      const result = compareNullableNumber(
        typeof leftValue === 'number' ? leftValue : null,
        typeof rightValue === 'number' ? rightValue : null,
        sort.direction,
      );
      return result || left.name.localeCompare(right.name, 'es');
    }

    const result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'es', {
      sensitivity: 'base',
    });

    return sort.direction === 'ascending' ? result : -result;
  });

export const filterCatalogProducts = (
  products: FinanceProductWithMetrics[],
  search: string,
): FinanceProductWithMetrics[] => {
  const term = normalize(search);

  if (!term) {
    return products;
  }

  return products.filter((product) => normalize(product.name).includes(term));
};

export const buildCatalogSections = (
  products: FinanceProductWithMetrics[],
  search: string,
  sort: CatalogSortState,
): CatalogCategorySection[] => {
  const filteredProducts = filterCatalogProducts(products, search);

  return catalogCategoryOrder.flatMap((category) => {
    const categoryProducts = filteredProducts.filter((product) => product.category === category);

    if (categoryProducts.length === 0) {
      return [];
    }

    return [
      {
        category,
        label: catalogCategoryLabels[category],
        products: sortCatalogProducts(categoryProducts, sort),
      },
    ];
  });
};
