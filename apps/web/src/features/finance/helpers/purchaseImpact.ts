import type {
  FinanceProductWithMetrics,
  FinancePurchaseDetail,
  FinancePurchaseItem,
  FinancePurchaseItemImpact,
} from '../types';

export type PurchaseSortField = 'date' | 'supplier' | 'total' | 'items' | 'status';
export type PurchaseSortDirection = 'ascending' | 'descending';

export type PurchaseSortState = {
  field: PurchaseSortField;
  direction: PurchaseSortDirection;
};

export type PurchaseStatusFilter = 'active' | 'canceled' | 'all';

export type PurchaseRow = FinancePurchaseDetail & {
  productNames: string[];
  totalCents: number;
  totalBaseUnits: number;
  itemCount: number;
  status: 'active' | 'canceled';
};

export type PriceDeltaSummary = {
  tone: 'positive' | 'negative' | 'neutral';
  label: string;
  deltaCents: number | null;
  deltaPercent: number | null;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const compareValues = (left: string | number, right: string | number) => {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), 'es-AR', { sensitivity: 'base' });
};

const productNameById = (products: FinanceProductWithMetrics[]) =>
  new Map(products.map((product) => [product.id, product.name]));

const toRow = (
  purchase: FinancePurchaseDetail,
  productNames: Map<string, string>,
): PurchaseRow => {
  const names = purchase.items.map((item) => productNames.get(item.productId) ?? item.productId);

  return {
    ...purchase,
    productNames: names,
    totalCents: purchase.items.reduce((total, item) => total + item.totalPriceCents, 0),
    totalBaseUnits: purchase.items.reduce((total, item) => total + item.totalBaseUnits, 0),
    itemCount: purchase.items.length,
    status: purchase.canceledAt ? 'canceled' : 'active',
  };
};

export const buildPurchaseRows = (
  purchases: FinancePurchaseDetail[],
  products: FinanceProductWithMetrics[],
  search: string,
  sort: PurchaseSortState,
  statusFilter: PurchaseStatusFilter = 'active',
): PurchaseRow[] => {
  const productNames = productNameById(products);
  const query = normalize(search);

  return purchases
    .map((purchase) => toRow(purchase, productNames))
    .filter((row) => statusFilter === 'all' || row.status === statusFilter)
    .filter((row) => {
      if (!query) {
        return true;
      }

      const haystack = normalize(
        [
          row.supplier,
          row.receiptNumber,
          row.notes,
          row.status,
          row.purchaseDate,
          ...row.productNames,
        ].join(' '),
      );

      return haystack.includes(query);
    })
    .sort((left, right) => {
      const multiplier = sort.direction === 'ascending' ? 1 : -1;
      const compared = compareValues(sortValue(left, sort.field), sortValue(right, sort.field));

      return compared * multiplier;
    });
};

const sortValue = (row: PurchaseRow, field: PurchaseSortField): string | number => {
  switch (field) {
    case 'date':
      return row.purchaseDate;
    case 'supplier':
      return row.supplier ?? '';
    case 'total':
      return row.totalCents;
    case 'items':
      return row.itemCount;
    case 'status':
      return row.status;
  }
};

export const getPurchaseItemImpact = (
  purchase: FinancePurchaseDetail,
  item: FinancePurchaseItem,
): FinancePurchaseItemImpact | undefined =>
  purchase.itemImpacts?.find((impact) => impact.purchaseItemId === item.id);

export const summarizePriceDelta = (
  impact: FinancePurchaseItemImpact | undefined,
): PriceDeltaSummary => {
  if (!impact || impact.priceDeltaCents === null) {
    return {
      tone: 'neutral',
      label: 'Sin comparación',
      deltaCents: null,
      deltaPercent: null,
    };
  }

  if (impact.priceDeltaCents > 0) {
    return {
      tone: 'positive',
      label: 'Subió',
      deltaCents: impact.priceDeltaCents,
      deltaPercent: impact.priceDeltaPercent,
    };
  }

  if (impact.priceDeltaCents < 0) {
    return {
      tone: 'negative',
      label: 'Bajó',
      deltaCents: impact.priceDeltaCents,
      deltaPercent: impact.priceDeltaPercent,
    };
  }

  return {
    tone: 'neutral',
    label: 'Sin cambio',
    deltaCents: 0,
    deltaPercent: impact.priceDeltaPercent,
  };
};
