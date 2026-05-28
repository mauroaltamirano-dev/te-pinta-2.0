import type {
  CreateFinanceBaseCostRuleInput,
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  FinanceBaseUnit,
  FinanceCostComponentType,
  FinanceCostingPreviewOrderInput,
  FinanceCostRuleAppliesTo,
  FinanceCostWarning,
  FinanceOrderCostBreakdown,
  FinanceProductCategory,
  FinanceProductFilters,
  FinanceRoundingMode,
  FinanceStockFilters,
  FinanceStockMovementType,
  UpdateFinanceBaseCostRuleInput,
  UpdateFinanceRecipeInput,
} from '@te-pinta/shared';

export type {
  CreateFinanceBaseCostRuleInput,
  CreateFinanceProductInput,
  CreateFinancePurchaseInput,
  CreateFinanceStockAdjustmentInput,
  FinanceBaseUnit,
  FinanceCostComponentType,
  FinanceCostingPreviewOrderInput,
  FinanceCostRuleAppliesTo,
  FinanceCostWarning,
  FinanceOrderCostBreakdown,
  FinanceProductCategory,
  FinanceProductFilters,
  FinanceRoundingMode,
  FinanceStockFilters,
  FinanceStockMovementType,
  UpdateFinanceBaseCostRuleInput,
  UpdateFinanceRecipeInput,
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

export type FinanceBaseCostRule = {
  id: string;
  productId: string;
  productName?: string;
  name: string;
  componentType: FinanceCostComponentType;
  appliesTo: FinanceCostRuleAppliesTo;
  quantity: number;
  groupSizeUnits: number;
  roundingMode: FinanceRoundingMode;
  latestCostCents: number | null;
  isActive: boolean;
};

export type FinanceRecipeItem = {
  id: string;
  menuItemId: string;
  productId: string;
  name?: string;
  quantityPerDozen: number;
  unit: FinanceBaseUnit;
  quantityBase: number;
  latestCostCents: number | null;
  notes: string | null;
};

export type FinanceRecipe = {
  menuItemId: string;
  menuItemName: string;
  items: FinanceRecipeItem[];
  totalCostPerDozenCents: number;
  totalCostPerUnitCents: number;
  warnings: FinanceCostWarning[];
};
