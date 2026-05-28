import type {
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  FinanceBaseUnit,
  FinanceCostingPreviewOrderInput,
  FinanceCostWarning,
  FinanceOrderCostBreakdown,
  FinanceProductCategory,
  FinanceProductFilters,
  FinanceStockFilters,
  FinanceStockMovementType,
} from '@te-pinta/shared';

export type {
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  FinanceBaseUnit,
  FinanceCostingPreviewOrderInput,
  FinanceCostWarning,
  FinanceOrderCostBreakdown,
  FinanceProductCategory,
  FinanceProductFilters,
  FinanceStockFilters,
  FinanceStockMovementType,
};

export type FinanceProduct = {
  id: string;
  name: string;
  normalizedName: string;
  category: FinanceProductCategory;
  baseUnit: FinanceBaseUnit;
  stockTracking: boolean;
  isActive: boolean;
};

export type FinanceProductWithMetrics = FinanceProduct & {
  latestCostPerBaseUnitCents: number | null;
  averageCostPerBaseUnitCents: number | null;
  purchasedQuantityBase: number;
  stockQuantityBase: number;
  purchaseCount: number;
  warnings: FinanceCostWarning[];
};

export type FinancePurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  purchaseUnit: FinanceBaseUnit;
  purchaseQuantity: number;
  unitsPerPackage: number;
  totalBaseUnits: number;
  unitPriceCents: number | null;
  totalPriceCents: number;
  costPerBaseUnitCents: number;
  notes: string | null;
};

export type FinancePurchaseDetail = {
  id: string;
  purchaseDate: string;
  supplier: string | null;
  receiptNumber: string | null;
  notes: string | null;
  items: FinancePurchaseItem[];
};

export type FinanceStockMovement = {
  id: string;
  productId: string;
  movementType: FinanceStockMovementType;
  quantityBase: number;
  sourcePurchaseItemId: string | null;
  notes: string | null;
  createdAt: string | Date;
};

export type FinanceStockItem = {
  product: FinanceProduct;
  quantityBase: number;
};
