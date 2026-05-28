import { randomUUID } from 'node:crypto';

import {
  calculateAverageProductCost,
  calculateLatestProductCost,
  calculateOrderCostBreakdown,
  calculatePurchaseItemCost,
  calculateRecipeCostPerUnit,
  type CreateFinanceProductInput,
  type CreateFinancePurchaseInput,
  type CreateFinanceStockAdjustmentInput,
  type FinanceBaseUnit,
  type FinanceCostRule,
  type FinanceCostWarning,
  type FinanceCostingPreviewOrderInput,
  type FinanceOrderCostBreakdown,
  type FinanceProductCategory,
  type FinanceProductFilters,
  type FinanceProductCostHistoryItem,
  type FinanceRecipeCostItem,
  type FinanceStockFilters,
  type FinanceStockMovementType,
} from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

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

export type FinanceProductRecord = {
  product: FinanceProduct;
  purchaseHistory: FinanceProductCostHistoryItem[];
  stockQuantityBase: number;
};

export type PersistFinancePurchaseItem = {
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

export type PersistFinanceStockMovement = {
  id: string;
  productId: string;
  movementType: FinanceStockMovementType;
  quantityBase: number;
  sourcePurchaseItemId: string | null;
  notes: string | null;
};

export type PersistFinancePurchaseInput = {
  id: string;
  purchaseDate: string;
  supplier: string | null;
  receiptNumber: string | null;
  notes: string | null;
  items: PersistFinancePurchaseItem[];
  stockMovements: PersistFinanceStockMovement[];
};

export type FinancePurchaseDetail = {
  id: string;
  purchaseDate: string;
  supplier: string | null;
  receiptNumber: string | null;
  notes: string | null;
  items: PersistFinancePurchaseItem[];
  stockMovements?: FinanceStockMovement[];
};

export type FinanceStockMovement = PersistFinanceStockMovement & {
  createdAt: Date;
};

export type FinanceStockItem = {
  product: FinanceProduct;
  quantityBase: number;
};

export type FinanceCostingData = {
  baseRawMaterialRules: FinanceCostRule[];
  packagingRules: FinanceCostRule[];
  recipeItemsByMenuItemId: Map<string, FinanceRecipeCostItem[]>;
  menuItemsById: Map<string, { id: string; name: string }>;
};

export type FinanceRepository = {
  listProducts(filters?: FinanceProductFilters): Promise<FinanceProductRecord[]>;
  createProduct(product: FinanceProduct): Promise<FinanceProduct>;
  getProductsByIds(ids: string[]): Promise<FinanceProduct[]>;
  createPurchaseWithItems(input: PersistFinancePurchaseInput): Promise<FinancePurchaseDetail>;
  listStock(filters?: FinanceStockFilters): Promise<FinanceStockItem[]>;
  createStockMovement(input: PersistFinanceStockMovement): Promise<FinanceStockMovement>;
  getCostingData(input: FinanceCostingPreviewOrderInput): Promise<FinanceCostingData>;
};

const normalizeOptionalText = (value: string | undefined): string | null => value?.trim() || null;
const normalizeProductName = (name: string): string => name.trim().toLocaleLowerCase('es-AR');

const stockOutTypes = new Set<FinanceStockMovementType>([
  'manual_out',
  'waste',
  'order_consumption',
]);
const manualStockAdjustmentTypes = new Set<FinanceStockMovementType>([
  'manual_in',
  'manual_out',
  'waste',
  'adjustment',
]);

export const listFinanceProducts = async (
  repository: FinanceRepository,
  filters?: FinanceProductFilters,
): Promise<FinanceProductWithMetrics[]> => {
  const records = await repository.listProducts(filters);

  return records.map(({ product, purchaseHistory, stockQuantityBase }) => {
    const latest = calculateLatestProductCost(purchaseHistory);
    const averageCostPerBaseUnitCents = calculateAverageProductCost(purchaseHistory);
    const purchasedQuantityBase = purchaseHistory.reduce(
      (total, item) => total + item.totalBaseUnits,
      0,
    );

    return {
      ...product,
      latestCostPerBaseUnitCents: latest.costPerBaseUnitCents,
      averageCostPerBaseUnitCents,
      purchasedQuantityBase,
      stockQuantityBase,
      purchaseCount: purchaseHistory.length,
      warnings: latest.costPerBaseUnitCents === null ? latest.warnings : [],
    };
  });
};

export const createFinanceProduct = (
  input: CreateFinanceProductInput,
  repository: FinanceRepository,
): Promise<FinanceProduct> => {
  return repository.createProduct({
    id: randomUUID(),
    name: input.name,
    normalizedName: normalizeProductName(input.name),
    category: input.category,
    baseUnit: input.baseUnit,
    stockTracking: input.stockTracking,
    isActive: input.isActive,
  });
};

export const createFinancePurchase = async (
  input: CreateFinancePurchaseInput,
  repository: FinanceRepository,
): Promise<FinancePurchaseDetail> => {
  const productsById = await getProductsById(
    repository,
    input.items.map((item) => item.productId),
  );
  const purchaseId = randomUUID();
  const items = input.items.map<PersistFinancePurchaseItem>((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
    }

    const calculated = calculatePurchaseItemCost({
      purchaseQuantity: item.purchaseQuantity,
      unitsPerPackage: item.unitsPerPackage,
      unitPriceCents: item.unitPriceCents,
      totalPriceCents: item.totalPriceCents,
    });

    return {
      id: randomUUID(),
      purchaseId,
      productId: item.productId,
      purchaseUnit: item.purchaseUnit,
      purchaseQuantity: calculated.purchaseQuantity,
      unitsPerPackage: calculated.unitsPerPackage,
      totalBaseUnits: calculated.totalBaseUnits,
      unitPriceCents: item.unitPriceCents ?? null,
      totalPriceCents: calculated.totalPriceCents,
      costPerBaseUnitCents: calculated.costPerBaseUnitCents,
      notes: normalizeOptionalText(item.notes),
    };
  });
  const stockMovements = items.flatMap<PersistFinanceStockMovement>((item) => {
    const product = productsById.get(item.productId);
    if (!product?.stockTracking) {
      return [];
    }

    return [
      {
        id: randomUUID(),
        productId: item.productId,
        movementType: 'purchase_in',
        quantityBase: item.totalBaseUnits,
        sourcePurchaseItemId: item.id,
        notes: `Purchase ${purchaseId}`,
      },
    ];
  });

  return repository.createPurchaseWithItems({
    id: purchaseId,
    purchaseDate: input.purchaseDate,
    supplier: normalizeOptionalText(input.supplier),
    receiptNumber: normalizeOptionalText(input.receiptNumber),
    notes: normalizeOptionalText(input.notes),
    items,
    stockMovements,
  });
};

export const listFinanceStock = (
  repository: FinanceRepository,
  filters?: FinanceStockFilters,
): Promise<FinanceStockItem[]> => repository.listStock(filters);

export const createFinanceStockAdjustment = async (
  input: CreateFinanceStockAdjustmentInput,
  repository: FinanceRepository,
): Promise<FinanceStockMovement> => {
  if (!manualStockAdjustmentTypes.has(input.movementType)) {
    throw new ApiError(
      400,
      'Stock adjustments only support manual movement types',
      'FINANCE_STOCK_ADJUSTMENT_TYPE_INVALID',
    );
  }

  const products = await getProductsById(repository, [input.productId]);
  const product = products.get(input.productId);
  if (!product) {
    throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
  }
  if (!product.stockTracking) {
    throw new ApiError(
      400,
      'Finance product does not track stock',
      'FINANCE_PRODUCT_NOT_STOCK_TRACKED',
    );
  }

  const quantityBase = stockOutTypes.has(input.movementType) ? -input.quantity : input.quantity;

  return repository.createStockMovement({
    id: randomUUID(),
    productId: input.productId,
    movementType: input.movementType,
    quantityBase,
    sourcePurchaseItemId: null,
    notes: normalizeOptionalText(input.notes),
  });
};

export const previewFinanceOrderCost = async (
  input: FinanceCostingPreviewOrderInput,
  repository: FinanceRepository,
): Promise<FinanceOrderCostBreakdown> => {
  const data = await repository.getCostingData(input);
  const recipeWarnings: FinanceCostWarning[] = [];
  const items = input.items.map((item) => {
    const recipeItems = data.recipeItemsByMenuItemId.get(item.menuItemId) ?? [];
    const recipeCost = recipeItems.length ? calculateRecipeCostPerUnit({ recipeItems }) : null;
    if (recipeCost) {
      recipeWarnings.push(...recipeCost.warnings);
    }
    const menuItem = data.menuItemsById.get(item.menuItemId);

    return {
      menuItemId: item.menuItemId,
      name: menuItem?.name,
      quantity: item.quantity,
      recipeCostPerUnitCents: recipeCost?.totalCostCents ?? null,
    };
  });
  const breakdown = calculateOrderCostBreakdown({
    saleTotalCents: input.saleTotalCents,
    items,
    baseRawMaterialRules: data.baseRawMaterialRules,
    packagingRules: data.packagingRules,
  });

  return {
    ...breakdown,
    warnings: [...breakdown.warnings, ...recipeWarnings],
  };
};

const getProductsById = async (
  repository: FinanceRepository,
  productIds: string[],
): Promise<Map<string, FinanceProduct>> => {
  const uniqueProductIds = [...new Set(productIds)];
  const products = await repository.getProductsByIds(uniqueProductIds);
  return new Map(products.map((product) => [product.id, product]));
};
