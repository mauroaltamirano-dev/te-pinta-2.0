import { randomUUID } from 'node:crypto';

import {
  calculateAverageProductCost,
  calculateLatestProductCost,
  calculateOrderCostBreakdown,
  calculatePurchaseItemCost,
  calculateRecipeCostPerUnit,
  type CancelFinancePurchaseInput,
  type CreateFinanceBaseCostRuleInput,
  type CreateFinanceProductInput,
  type CreateFinancePurchaseInput,
  type CreateFinanceStockAdjustmentInput,
  type FinanceBaseUnit,
  type FinanceCostComponentType,
  type FinanceCostRule,
  type FinanceCostRuleAppliesTo,
  type FinanceCostWarning,
  type FinanceCostingPreviewOrderInput,
  type FinanceOrderCostBreakdown,
  type FinanceProductCategory,
  type FinanceProductFilters,
  type FinanceProductCostHistoryItem,
  type FinancePurchaseFundingSource,
  type FinancePurchaseItemImpact,
  type FinancePurchaseFilters,
  type FinanceRecipeCostItem,
  type FinanceRoundingMode,
  type FinanceStockFilters,
  type FinanceStockMovementType,
  type UpdateFinanceBaseCostRuleInput,
  type UpdateFinanceProductInput,
  type UpdateFinanceRecipeInput,
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

export type FinanceProductUpdateResult = FinanceProduct & {
  stockQuantityBase: number;
  stockMovement: FinanceStockMovement | null;
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
  fundingSource: FinancePurchaseFundingSource;
  items: PersistFinancePurchaseItem[];
  stockMovements: PersistFinanceStockMovement[];
};

export type FinancePurchaseDetail = {
  id: string;
  purchaseDate: string;
  supplier: string | null;
  receiptNumber: string | null;
  notes: string | null;
  fundingSource: FinancePurchaseFundingSource;
  canceledAt: Date | null;
  canceledReason: string | null;
  items: PersistFinancePurchaseItem[];
  stockMovements?: FinanceStockMovement[];
  itemImpacts?: FinancePurchaseItemImpact[];
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

export type FinanceBaseCostRuleDetail = {
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

export type PersistFinanceBaseCostRuleInput = {
  id: string;
  productId: string;
  name: string;
  componentType: FinanceCostComponentType;
  appliesTo: FinanceCostRuleAppliesTo;
  quantity: number;
  groupSizeUnits: number;
  roundingMode: FinanceRoundingMode;
  isActive: boolean;
};

export type FinanceRecipeItemDetail = FinanceRecipeCostItem & {
  id: string;
  menuItemId: string;
  quantityPerDozen: number;
  unit: FinanceBaseUnit;
  notes: string | null;
};

export type FinanceRecipeDetail = {
  menuItemId: string;
  menuItemName: string;
  items: FinanceRecipeItemDetail[];
  totalCostPerDozenCents: number;
  totalCostPerUnitCents: number;
  warnings: FinanceCostWarning[];
};

export type PersistFinanceRecipeInput = {
  menuItemId: string;
  items: Array<{
    id: string;
    menuItemId: string;
    productId: string;
    quantityPerDozen: number;
    unit: FinanceBaseUnit;
    quantityBase: number;
    notes: string | null;
  }>;
};

export type FinanceRepository = {
  listProducts(filters?: FinanceProductFilters): Promise<FinanceProductRecord[]>;
  createProduct(product: FinanceProduct): Promise<FinanceProduct>;
  updateProduct(
    id: string,
    updates: Partial<Omit<FinanceProduct, 'id'>>,
  ): Promise<FinanceProduct | null>;
  getProductsByIds(ids: string[]): Promise<FinanceProduct[]>;
  listProductPurchaseHistory(
    productIds: string[],
  ): Promise<Map<string, FinanceProductCostHistoryItem[]>>;
  listStockMovementsByProducts(productIds: string[]): Promise<FinanceStockMovement[]>;
  createPurchaseWithItems(input: PersistFinancePurchaseInput): Promise<FinancePurchaseDetail>;
  listPurchases(filters?: FinancePurchaseFilters): Promise<FinancePurchaseDetail[]>;
  getPurchase(id: string): Promise<FinancePurchaseDetail | null>;
  cancelPurchase(input: {
    id: string;
    canceledAt: Date;
    canceledReason: string | null;
    reversalMovements: PersistFinanceStockMovement[];
  }): Promise<FinancePurchaseDetail | null>;
  listStock(filters?: FinanceStockFilters): Promise<FinanceStockItem[]>;
  createStockMovement(input: PersistFinanceStockMovement): Promise<FinanceStockMovement>;
  getCostingData(input: FinanceCostingPreviewOrderInput): Promise<FinanceCostingData>;
  listBaseCostRules(): Promise<FinanceBaseCostRuleDetail[]>;
  createBaseCostRule(input: PersistFinanceBaseCostRuleInput): Promise<FinanceBaseCostRuleDetail>;
  updateBaseCostRule(
    id: string,
    updates: UpdateFinanceBaseCostRuleInput,
  ): Promise<FinanceBaseCostRuleDetail | null>;
  deleteBaseCostRule(id: string): Promise<boolean>;
  listRecipes(): Promise<FinanceRecipeDetail[]>;
  getRecipe(menuItemId: string): Promise<FinanceRecipeDetail | null>;
  replaceRecipe(input: PersistFinanceRecipeInput): Promise<FinanceRecipeDetail | null>;
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

export const updateFinanceProduct = async (
  id: string,
  input: UpdateFinanceProductInput,
  repository: FinanceRepository,
): Promise<FinanceProductUpdateResult> => {
  const products = await getProductsById(repository, [id]);
  const currentProduct = products.get(id);
  if (!currentProduct) {
    throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
  }

  const productUpdates = toProductUpdates(input);
  const updatedProduct =
    Object.keys(productUpdates).length > 0
      ? await repository.updateProduct(id, productUpdates)
      : currentProduct;
  if (!updatedProduct) {
    throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
  }

  const currentStockQuantityBase = await getCurrentStockQuantity(repository, id);
  const stockMovement =
    input.currentStockQuantityBase === undefined
      ? null
      : await createCurrentStockCorrection(
          input.currentStockQuantityBase,
          currentProduct,
          currentStockQuantityBase,
          repository,
        );

  return {
    ...updatedProduct,
    stockQuantityBase:
      input.currentStockQuantityBase === undefined
        ? currentStockQuantityBase
        : input.currentStockQuantityBase,
    stockMovement,
  };
};

export const getFinanceProductHistory = async (
  productId: string,
  repository: FinanceRepository,
): Promise<FinanceProductCostHistoryItem[]> => {
  await ensureFinanceProductExists(repository, productId);
  const historyByProduct = await repository.listProductPurchaseHistory([productId]);

  return historyByProduct.get(productId) ?? [];
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
    fundingSource: input.fundingSource,
    items,
    stockMovements,
  });
};

export const listFinancePurchases = async (
  repository: FinanceRepository,
  filters?: FinancePurchaseFilters,
): Promise<FinancePurchaseDetail[]> =>
  enrichPurchaseDetailsWithImpacts(await repository.listPurchases(filters), repository);

export const getFinancePurchase = async (
  id: string,
  repository: FinanceRepository,
): Promise<FinancePurchaseDetail> => {
  const purchase = await repository.getPurchase(id);
  if (!purchase) {
    throw new ApiError(404, 'Finance purchase not found', 'FINANCE_PURCHASE_NOT_FOUND');
  }

  return enrichPurchaseDetailWithImpacts(purchase, repository);
};

export const cancelFinancePurchase = async (
  id: string,
  input: CancelFinancePurchaseInput,
  repository: FinanceRepository,
): Promise<FinancePurchaseDetail> => {
  const purchase = await repository.getPurchase(id);
  if (!purchase) {
    throw new ApiError(404, 'Finance purchase not found', 'FINANCE_PURCHASE_NOT_FOUND');
  }
  if (purchase.canceledAt) {
    return purchase;
  }

  const reversalMovements = (purchase.stockMovements ?? [])
    .filter((movement) => movement.movementType === 'purchase_in' && movement.quantityBase !== 0)
    .map<PersistFinanceStockMovement>((movement) => ({
      id: randomUUID(),
      productId: movement.productId,
      movementType: 'adjustment',
      quantityBase: -movement.quantityBase,
      sourcePurchaseItemId: movement.sourcePurchaseItemId,
      notes: `Purchase cancellation ${purchase.id}`,
    }));

  const canceled = await repository.cancelPurchase({
    id,
    canceledAt: new Date(),
    canceledReason: normalizeOptionalText(input.reason),
    reversalMovements,
  });
  if (!canceled) {
    throw new ApiError(404, 'Finance purchase not found', 'FINANCE_PURCHASE_NOT_FOUND');
  }

  return canceled;
};

export const listFinanceStock = (
  repository: FinanceRepository,
  filters?: FinanceStockFilters,
): Promise<FinanceStockItem[]> => repository.listStock(filters);

export const listFinanceBaseCostRules = (
  repository: FinanceRepository,
): Promise<FinanceBaseCostRuleDetail[]> => repository.listBaseCostRules();

export const createFinanceBaseCostRule = async (
  input: CreateFinanceBaseCostRuleInput,
  repository: FinanceRepository,
): Promise<FinanceBaseCostRuleDetail> => {
  await ensureFinanceProductExists(repository, input.productId);

  return repository.createBaseCostRule({
    id: randomUUID(),
    productId: input.productId,
    name: input.name,
    componentType: input.componentType,
    appliesTo: input.appliesTo,
    quantity: input.quantity,
    groupSizeUnits: input.groupSizeUnits,
    roundingMode: input.roundingMode,
    isActive: input.isActive,
  });
};

export const updateFinanceBaseCostRule = async (
  id: string,
  input: UpdateFinanceBaseCostRuleInput,
  repository: FinanceRepository,
): Promise<FinanceBaseCostRuleDetail> => {
  if (input.productId) {
    await ensureFinanceProductExists(repository, input.productId);
  }

  const updated = await repository.updateBaseCostRule(id, input);
  if (!updated) {
    throw new ApiError(404, 'Finance base cost rule not found', 'FINANCE_BASE_COST_RULE_NOT_FOUND');
  }

  return updated;
};

export const deleteFinanceBaseCostRule = async (
  id: string,
  repository: FinanceRepository,
): Promise<void> => {
  const deleted = await repository.deleteBaseCostRule(id);
  if (!deleted) {
    throw new ApiError(404, 'Finance base cost rule not found', 'FINANCE_BASE_COST_RULE_NOT_FOUND');
  }
};

export const listFinanceRecipes = async (
  repository: FinanceRepository,
): Promise<FinanceRecipeDetail[]> => repository.listRecipes();

export const getFinanceRecipe = async (
  menuItemId: string,
  repository: FinanceRepository,
): Promise<FinanceRecipeDetail> => {
  const recipe = await repository.getRecipe(menuItemId);
  if (!recipe) {
    throw new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  }

  return recipe;
};

export const updateFinanceRecipe = async (
  menuItemId: string,
  input: UpdateFinanceRecipeInput,
  repository: FinanceRepository,
): Promise<FinanceRecipeDetail> => {
  if (input.menuItemId !== menuItemId) {
    throw new ApiError(400, 'Recipe menu item mismatch', 'FINANCE_RECIPE_MENU_ITEM_MISMATCH');
  }

  const productsById = await getProductsById(
    repository,
    input.items.map((item) => item.productId),
  );
  for (const item of input.items) {
    if (!productsById.has(item.productId)) {
      throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
    }
  }

  const recipe = await repository.replaceRecipe({
    menuItemId,
    items: input.items.map((item) => ({
      ...item,
      id: randomUUID(),
      menuItemId,
      notes: normalizeOptionalText(item.notes),
    })),
  });
  if (!recipe) {
    throw new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  }

  return recipe;
};

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

const toProductUpdates = (
  input: UpdateFinanceProductInput,
): Partial<Omit<FinanceProduct, 'id'>> => ({
  ...(input.name !== undefined
    ? { name: input.name.trim(), normalizedName: normalizeProductName(input.name) }
    : {}),
  ...(input.category !== undefined ? { category: input.category } : {}),
  ...(input.baseUnit !== undefined ? { baseUnit: input.baseUnit } : {}),
  ...(input.stockTracking !== undefined ? { stockTracking: input.stockTracking } : {}),
  ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
});

const getCurrentStockQuantity = async (
  repository: FinanceRepository,
  productId: string,
): Promise<number> => {
  const movements = await repository.listStockMovementsByProducts([productId]);

  return movements
    .filter((movement) => movement.productId === productId)
    .reduce((total, movement) => total + movement.quantityBase, 0);
};

const createCurrentStockCorrection = async (
  desiredStockQuantityBase: number,
  product: FinanceProduct,
  currentStockQuantityBase: number,
  repository: FinanceRepository,
): Promise<FinanceStockMovement | null> => {
  if (!product.stockTracking) {
    throw new ApiError(
      400,
      'Finance product does not track stock',
      'FINANCE_PRODUCT_NOT_STOCK_TRACKED',
    );
  }

  const delta = desiredStockQuantityBase - currentStockQuantityBase;
  if (delta === 0) {
    return null;
  }

  return repository.createStockMovement({
    id: randomUUID(),
    productId: product.id,
    movementType: 'adjustment',
    quantityBase: delta,
    sourcePurchaseItemId: null,
    notes: `Stock correction to ${desiredStockQuantityBase}`,
  });
};

const enrichPurchaseDetailWithImpacts = async (
  purchase: FinancePurchaseDetail,
  repository: FinanceRepository,
): Promise<FinancePurchaseDetail> => {
  const [enriched] = await enrichPurchaseDetailsWithImpacts([purchase], repository);
  return enriched ?? { ...purchase, itemImpacts: [] };
};

const enrichPurchaseDetailsWithImpacts = async (
  purchases: FinancePurchaseDetail[],
  repository: FinanceRepository,
): Promise<FinancePurchaseDetail[]> => {
  const productIds = [
    ...new Set(purchases.flatMap((purchase) => purchase.items.map((item) => item.productId))),
  ];
  if (productIds.length === 0) {
    return purchases.map((purchase) => ({ ...purchase, itemImpacts: [] }));
  }

  const [historyByProduct, stockMovements] = await Promise.all([
    repository.listProductPurchaseHistory(productIds),
    repository.listStockMovementsByProducts(productIds),
  ]);
  const sortedStockMovementsByProduct = groupSortedStockMovements(stockMovements);

  return purchases.map((purchase) => ({
    ...purchase,
    itemImpacts: purchase.items.map((item) =>
      calculatePurchaseItemImpact(
        item,
        historyByProduct.get(item.productId) ?? [],
        sortedStockMovementsByProduct.get(item.productId) ?? [],
      ),
    ),
  }));
};

const calculatePurchaseItemImpact = (
  item: PersistFinancePurchaseItem,
  history: FinanceProductCostHistoryItem[],
  stockMovements: FinanceStockMovement[],
): FinancePurchaseItemImpact => {
  const currentHistoryIndex = history.findIndex((historyItem) => historyItem.id === item.id);
  const previousCostPerBaseUnitCents =
    currentHistoryIndex > 0
      ? (history[currentHistoryIndex - 1]?.costPerBaseUnitCents ?? null)
      : null;
  const priceDeltaCents =
    previousCostPerBaseUnitCents === null
      ? null
      : item.costPerBaseUnitCents - previousCostPerBaseUnitCents;

  const movementIndex = stockMovements.findIndex(
    (movement) =>
      movement.sourcePurchaseItemId === item.id && movement.movementType === 'purchase_in',
  );
  const stockBeforeBase =
    movementIndex === -1
      ? null
      : stockMovements
          .slice(0, movementIndex)
          .reduce((total, movement) => total + movement.quantityBase, 0);
  const stockAfterBase =
    stockBeforeBase === null
      ? null
      : stockBeforeBase + (stockMovements[movementIndex]?.quantityBase ?? 0);

  return {
    purchaseItemId: item.id,
    stockBeforeBase,
    stockAfterBase,
    previousCostPerBaseUnitCents,
    newCostPerBaseUnitCents: item.costPerBaseUnitCents,
    priceDeltaCents,
    priceDeltaPercent: calculatePriceDeltaPercent(priceDeltaCents, previousCostPerBaseUnitCents),
  };
};

const groupSortedStockMovements = (
  stockMovements: FinanceStockMovement[],
): Map<string, FinanceStockMovement[]> => {
  const grouped = new Map<string, FinanceStockMovement[]>();
  for (const movement of stockMovements) {
    grouped.set(movement.productId, [...(grouped.get(movement.productId) ?? []), movement]);
  }

  for (const [productId, movements] of grouped) {
    grouped.set(
      productId,
      [...movements].sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id),
      ),
    );
  }

  return grouped;
};

const calculatePriceDeltaPercent = (
  priceDeltaCents: number | null,
  previousCostPerBaseUnitCents: number | null,
): number | null => {
  if (priceDeltaCents === null || previousCostPerBaseUnitCents === null) {
    return null;
  }
  if (previousCostPerBaseUnitCents === 0) {
    return null;
  }

  return Math.round((priceDeltaCents / previousCostPerBaseUnitCents) * 10_000) / 100;
};

const getProductsById = async (
  repository: FinanceRepository,
  productIds: string[],
): Promise<Map<string, FinanceProduct>> => {
  const uniqueProductIds = [...new Set(productIds)];
  const products = await repository.getProductsByIds(uniqueProductIds);
  return new Map(products.map((product) => [product.id, product]));
};

const ensureFinanceProductExists = async (
  repository: FinanceRepository,
  productId: string,
): Promise<void> => {
  const products = await getProductsById(repository, [productId]);
  if (!products.has(productId)) {
    throw new ApiError(404, 'Finance product not found', 'FINANCE_PRODUCT_NOT_FOUND');
  }
};
