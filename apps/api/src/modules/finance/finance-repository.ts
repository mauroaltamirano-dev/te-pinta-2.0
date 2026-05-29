import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, type SQL } from 'drizzle-orm';

import {
  calculateLatestProductCost,
  calculateRecipeCostPerDozen,
  calculateRecipeCostPerUnit,
  type FinanceProductCategory,
  type FinanceProductCostHistoryItem,
  type FinanceProductFilters,
  type FinanceRecipeCostItem,
  type FinanceStockFilters,
} from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import {
  financeBaseCostRules,
  financeProducts,
  financePurchaseItems,
  financePurchases,
  financeRecipeItems,
  financeRecipes,
  financeStockMovements,
  menuItems,
} from '../../db/schema';
import type {
  FinanceCostingData,
  FinanceBaseCostRuleDetail,
  FinanceProduct,
  FinanceProductRecord,
  FinancePurchaseDetail,
  FinanceRecipeDetail,
  FinanceRepository,
  FinanceStockItem,
  FinanceStockMovement,
  PersistFinanceBaseCostRuleInput,
  PersistFinancePurchaseInput,
  PersistFinancePurchaseItem,
  PersistFinanceRecipeInput,
  PersistFinanceStockMovement,
} from './finance-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type FinanceProductRow = typeof financeProducts.$inferSelect;
type FinancePurchaseRow = typeof financePurchases.$inferSelect;
type FinancePurchaseItemRow = typeof financePurchaseItems.$inferSelect;
type FinanceStockMovementRow = typeof financeStockMovements.$inferSelect;
type FinanceBaseCostRuleRow = typeof financeBaseCostRules.$inferSelect;
type FinanceBaseCostRuleInsert = typeof financeBaseCostRules.$inferInsert;
type FinanceRecipeItemRow = typeof financeRecipeItems.$inferSelect;
type MenuItemRow = typeof menuItems.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const quantityToDb = (value: number): string => value.toFixed(3);
const quantityFromDb = (value: string): number => Number(value);

const mapProduct = (row: FinanceProductRow): FinanceProduct => ({
  id: row.id,
  name: row.name,
  normalizedName: row.normalizedName,
  category: row.category,
  baseUnit: row.baseUnit,
  stockTracking: row.stockTracking,
  isActive: row.isActive,
});

const mapPurchaseItem = (row: FinancePurchaseItemRow): PersistFinancePurchaseItem => ({
  id: row.id,
  purchaseId: row.purchaseId,
  productId: row.productId,
  purchaseUnit: row.purchaseUnit,
  purchaseQuantity: quantityFromDb(row.purchaseQuantity),
  unitsPerPackage: quantityFromDb(row.unitsPerPackage),
  totalBaseUnits: quantityFromDb(row.totalBaseUnits),
  unitPriceCents: row.unitPriceCents,
  totalPriceCents: row.totalPriceCents,
  costPerBaseUnitCents: row.costPerBaseUnitCents,
  notes: row.notes,
});

const mapStockMovement = (row: FinanceStockMovementRow): FinanceStockMovement => ({
  id: row.id,
  productId: row.productId,
  movementType: row.movementType,
  quantityBase: quantityFromDb(row.quantityBase),
  sourcePurchaseItemId: row.sourcePurchaseItemId,
  notes: row.notes,
  createdAt: row.createdAt,
});

const toPurchaseValues = (
  input: PersistFinancePurchaseInput,
): typeof financePurchases.$inferInsert => ({
  id: input.id,
  purchaseDate: input.purchaseDate,
  supplier: input.supplier,
  receiptNumber: input.receiptNumber,
  notes: input.notes,
  updatedAt: new Date(),
});

const toPurchaseItemValues = (
  item: PersistFinancePurchaseItem,
): typeof financePurchaseItems.$inferInsert => ({
  id: item.id,
  purchaseId: item.purchaseId,
  productId: item.productId,
  purchaseUnit: item.purchaseUnit,
  purchaseQuantity: quantityToDb(item.purchaseQuantity),
  unitsPerPackage: quantityToDb(item.unitsPerPackage),
  totalBaseUnits: quantityToDb(item.totalBaseUnits),
  unitPriceCents: item.unitPriceCents,
  totalPriceCents: item.totalPriceCents,
  costPerBaseUnitCents: item.costPerBaseUnitCents,
  notes: item.notes,
  updatedAt: new Date(),
});

const toStockMovementValues = (
  movement: PersistFinanceStockMovement,
): typeof financeStockMovements.$inferInsert => ({
  id: movement.id,
  productId: movement.productId,
  movementType: movement.movementType,
  quantityBase: quantityToDb(movement.quantityBase),
  sourcePurchaseItemId: movement.sourcePurchaseItemId,
  notes: movement.notes,
});

const mapPurchaseDetail = (
  purchase: FinancePurchaseRow,
  items: FinancePurchaseItemRow[],
  stockMovements: FinanceStockMovementRow[],
): FinancePurchaseDetail => ({
  id: purchase.id,
  purchaseDate: purchase.purchaseDate,
  supplier: purchase.supplier,
  receiptNumber: purchase.receiptNumber,
  notes: purchase.notes,
  canceledAt: purchase.canceledAt,
  canceledReason: purchase.canceledReason,
  items: items.map(mapPurchaseItem),
  stockMovements: stockMovements.map(mapStockMovement),
});

const productFilterConditions = (
  filters: FinanceProductFilters | FinanceStockFilters = {},
): SQL[] => {
  const conditions: SQL[] = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    const searchCondition = or(
      ilike(financeProducts.name, term),
      ilike(financeProducts.normalizedName, term),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  if (filters.category) {
    conditions.push(eq(financeProducts.category, filters.category as FinanceProductCategory));
  }
  if ('isActive' in filters && typeof filters.isActive === 'boolean') {
    conditions.push(eq(financeProducts.isActive, filters.isActive));
  }

  return conditions;
};

const listProductRows = async (
  db: DbClient,
  filters: FinanceProductFilters | FinanceStockFilters = {},
): Promise<FinanceProductRow[]> => {
  const conditions = productFilterConditions(filters);

  return conditions.length
    ? db
        .select()
        .from(financeProducts)
        .where(and(...conditions))
        .orderBy(asc(financeProducts.name))
    : db.select().from(financeProducts).orderBy(asc(financeProducts.name));
};

const listPurchaseHistoryRows = async (
  db: DbClient,
  productIds: string[],
): Promise<Map<string, FinanceProductCostHistoryItem[]>> => {
  const historyByProduct = new Map<string, FinanceProductCostHistoryItem[]>();
  if (productIds.length === 0) {
    return historyByProduct;
  }

  const rows = await db
    .select({
      item: financePurchaseItems,
      purchaseDate: financePurchases.purchaseDate,
      createdAt: financePurchaseItems.createdAt,
    })
    .from(financePurchaseItems)
    .innerJoin(financePurchases, eq(financePurchaseItems.purchaseId, financePurchases.id))
    .where(
      and(inArray(financePurchaseItems.productId, productIds), isNull(financePurchases.canceledAt)),
    )
    .orderBy(
      asc(financePurchases.purchaseDate),
      asc(financePurchaseItems.createdAt),
      asc(financePurchaseItems.id),
    );

  for (const row of rows) {
    const history = historyByProduct.get(row.item.productId) ?? [];
    history.push({
      id: row.item.id,
      purchaseQuantity: quantityFromDb(row.item.purchaseQuantity),
      unitsPerPackage: quantityFromDb(row.item.unitsPerPackage),
      totalBaseUnits: quantityFromDb(row.item.totalBaseUnits),
      totalPriceCents: row.item.totalPriceCents,
      costPerBaseUnitCents: row.item.costPerBaseUnitCents,
      purchasedAt: row.purchaseDate,
      createdAt: row.createdAt.toISOString(),
    });
    historyByProduct.set(row.item.productId, history);
  }

  return historyByProduct;
};

const listStockQuantityByProduct = async (
  db: DbClient,
  productIds: string[],
): Promise<Map<string, number>> => {
  const stockByProduct = new Map<string, number>();
  if (productIds.length === 0) {
    return stockByProduct;
  }

  const rows = await db
    .select()
    .from(financeStockMovements)
    .where(inArray(financeStockMovements.productId, productIds));

  for (const row of rows) {
    stockByProduct.set(
      row.productId,
      (stockByProduct.get(row.productId) ?? 0) + quantityFromDb(row.quantityBase),
    );
  }

  return stockByProduct;
};

const getPurchaseDetail = async (
  db: DbClient,
  purchaseId: string,
): Promise<FinancePurchaseDetail | null> => {
  const [purchase] = await db
    .select()
    .from(financePurchases)
    .where(eq(financePurchases.id, purchaseId))
    .limit(1);

  if (!purchase) {
    return null;
  }

  const [items, stockMovements] = await Promise.all([
    db
      .select()
      .from(financePurchaseItems)
      .where(eq(financePurchaseItems.purchaseId, purchaseId))
      .orderBy(asc(financePurchaseItems.id)),
    db
      .select()
      .from(financeStockMovements)
      .innerJoin(
        financePurchaseItems,
        eq(financeStockMovements.sourcePurchaseItemId, financePurchaseItems.id),
      )
      .where(eq(financePurchaseItems.purchaseId, purchaseId))
      .orderBy(asc(financeStockMovements.id)),
  ]);

  return mapPurchaseDetail(
    purchase,
    items,
    stockMovements.map((row) => row.finance_stock_movements),
  );
};

const listPurchaseDetails = async (
  db: DbClient,
  filters: Parameters<FinanceRepository['listPurchases']>[0] = {},
): Promise<FinancePurchaseDetail[]> => {
  const conditions: SQL[] = [];

  if (filters.from) {
    conditions.push(gte(financePurchases.purchaseDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(financePurchases.purchaseDate, filters.to));
  }
  if (filters.supplier) {
    conditions.push(ilike(financePurchases.supplier, `%${filters.supplier}%`));
  }

  const purchaseRows = await (conditions.length
    ? db
        .select()
        .from(financePurchases)
        .where(and(...conditions))
        .orderBy(desc(financePurchases.purchaseDate), desc(financePurchases.createdAt))
    : db
        .select()
        .from(financePurchases)
        .orderBy(desc(financePurchases.purchaseDate), desc(financePurchases.createdAt)));
  const purchaseIds = purchaseRows.map((row) => row.id);

  if (purchaseIds.length === 0) {
    return [];
  }

  let allowedPurchaseIds = new Set(purchaseIds);
  if (filters.category) {
    const categoryRows = await db
      .select({ purchaseId: financePurchaseItems.purchaseId })
      .from(financePurchaseItems)
      .innerJoin(financeProducts, eq(financePurchaseItems.productId, financeProducts.id))
      .where(
        and(
          inArray(financePurchaseItems.purchaseId, purchaseIds),
          eq(financeProducts.category, filters.category),
        ),
      );
    allowedPurchaseIds = new Set(categoryRows.map((row) => row.purchaseId));
  }

  const filteredPurchaseRows = purchaseRows.filter((row) => allowedPurchaseIds.has(row.id));
  const filteredPurchaseIds = filteredPurchaseRows.map((row) => row.id);

  if (filteredPurchaseIds.length === 0) {
    return [];
  }

  const [itemRows, stockRows] = await Promise.all([
    db
      .select()
      .from(financePurchaseItems)
      .where(inArray(financePurchaseItems.purchaseId, filteredPurchaseIds))
      .orderBy(asc(financePurchaseItems.id)),
    db
      .select()
      .from(financeStockMovements)
      .innerJoin(
        financePurchaseItems,
        eq(financeStockMovements.sourcePurchaseItemId, financePurchaseItems.id),
      )
      .where(inArray(financePurchaseItems.purchaseId, filteredPurchaseIds))
      .orderBy(asc(financeStockMovements.id)),
  ]);
  const itemsByPurchase = new Map<string, FinancePurchaseItemRow[]>();
  const stockByPurchase = new Map<string, FinanceStockMovementRow[]>();

  for (const item of itemRows) {
    itemsByPurchase.set(item.purchaseId, [...(itemsByPurchase.get(item.purchaseId) ?? []), item]);
  }
  for (const row of stockRows) {
    const purchaseId = row.finance_purchase_items.purchaseId;
    stockByPurchase.set(purchaseId, [
      ...(stockByPurchase.get(purchaseId) ?? []),
      row.finance_stock_movements,
    ]);
  }

  return filteredPurchaseRows.map((purchase) =>
    mapPurchaseDetail(
      purchase,
      itemsByPurchase.get(purchase.id) ?? [],
      stockByPurchase.get(purchase.id) ?? [],
    ),
  );
};

const getLatestCostByProduct = async (
  db: DbClient,
  productIds: string[],
): Promise<Map<string, number | null>> => {
  const history = await listPurchaseHistoryRows(db, productIds);

  return new Map(
    productIds.map((productId) => [
      productId,
      calculateLatestProductCost(history.get(productId) ?? []).costPerBaseUnitCents,
    ]),
  );
};

const getMenuItemsByIds = async (
  db: DbClient,
  menuItemIds: string[],
): Promise<Map<string, MenuItemRow>> => {
  if (menuItemIds.length === 0) {
    return new Map();
  }

  const rows = await db.select().from(menuItems).where(inArray(menuItems.id, menuItemIds));
  return new Map(rows.map((row) => [row.id, row]));
};

const mapBaseCostRuleDetail = (
  row: FinanceBaseCostRuleRow,
  latestCostByProduct: Map<string, number | null>,
  productsById: Map<string, FinanceProductRow>,
): FinanceBaseCostRuleDetail => ({
  id: row.id,
  productId: row.productId,
  productName: productsById.get(row.productId)?.name,
  name: row.name,
  componentType: row.componentType,
  appliesTo: row.appliesTo,
  quantity: quantityFromDb(row.quantity),
  groupSizeUnits: row.groupSizeUnits,
  roundingMode: row.roundingMode,
  latestCostCents: latestCostByProduct.get(row.productId) ?? null,
  isActive: row.isActive,
});

const toBaseCostRuleValues = (
  input: PersistFinanceBaseCostRuleInput,
): FinanceBaseCostRuleInsert => ({
  id: input.id,
  productId: input.productId,
  name: input.name,
  componentType: input.componentType,
  appliesTo: input.appliesTo,
  quantity: quantityToDb(input.quantity),
  groupSizeUnits: input.groupSizeUnits,
  roundingMode: input.roundingMode,
  isActive: input.isActive,
  updatedAt: new Date(),
});

const toBaseCostRuleUpdate = (
  updates: Parameters<FinanceRepository['updateBaseCostRule']>[1],
): Partial<FinanceBaseCostRuleInsert> => ({
  ...(updates.productId !== undefined ? { productId: updates.productId } : {}),
  ...(updates.name !== undefined ? { name: updates.name } : {}),
  ...(updates.componentType !== undefined ? { componentType: updates.componentType } : {}),
  ...(updates.appliesTo !== undefined ? { appliesTo: updates.appliesTo } : {}),
  ...(updates.quantity !== undefined ? { quantity: quantityToDb(updates.quantity) } : {}),
  ...(updates.groupSizeUnits !== undefined ? { groupSizeUnits: updates.groupSizeUnits } : {}),
  ...(updates.roundingMode !== undefined ? { roundingMode: updates.roundingMode } : {}),
  ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
  updatedAt: new Date(),
});

const getBaseCostRuleDetail = async (
  db: DbClient,
  id: string,
): Promise<FinanceBaseCostRuleDetail | null> => {
  const [row] = await db
    .select()
    .from(financeBaseCostRules)
    .where(eq(financeBaseCostRules.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const [latestCostByProduct, productRows] = await Promise.all([
    getLatestCostByProduct(db, [row.productId]),
    db.select().from(financeProducts).where(eq(financeProducts.id, row.productId)),
  ]);

  return mapBaseCostRuleDetail(
    row,
    latestCostByProduct,
    new Map(productRows.map((item) => [item.id, item])),
  );
};

const listRecipeItemRows = async (
  db: DbClient,
  menuItemIds: string[],
): Promise<FinanceRecipeItemRow[]> => {
  if (menuItemIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(financeRecipeItems)
    .where(inArray(financeRecipeItems.menuItemId, menuItemIds))
    .orderBy(asc(financeRecipeItems.createdAt), asc(financeRecipeItems.id));
};

const buildRecipeDetails = async (
  db: DbClient,
  menuRows: MenuItemRow[],
  recipeItemRows: FinanceRecipeItemRow[],
): Promise<FinanceRecipeDetail[]> => {
  const productIds = [...new Set(recipeItemRows.map((row) => row.productId))];
  const [latestCostByProduct, productRows] = await Promise.all([
    getLatestCostByProduct(db, productIds),
    productIds.length
      ? db.select().from(financeProducts).where(inArray(financeProducts.id, productIds))
      : Promise.resolve([]),
  ]);
  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const itemsByMenuItem = new Map<string, FinanceRecipeItemRow[]>();

  for (const row of recipeItemRows) {
    const current = itemsByMenuItem.get(row.menuItemId) ?? [];
    current.push(row);
    itemsByMenuItem.set(row.menuItemId, current);
  }

  return menuRows.map((menuItem) => {
    const items = (itemsByMenuItem.get(menuItem.id) ?? []).map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      productId: item.productId,
      name: productsById.get(item.productId)?.name,
      quantityPerDozen: quantityFromDb(item.quantityPerDozen),
      unit: item.unit,
      quantityBase: quantityFromDb(item.quantityBase),
      latestCostCents: latestCostByProduct.get(item.productId) ?? null,
      notes: item.notes,
    }));
    const dozen = calculateRecipeCostPerDozen({ recipeItems: items });
    const unit = calculateRecipeCostPerUnit({ recipeItems: items });

    return {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      items,
      totalCostPerDozenCents: dozen.totalCostCents,
      totalCostPerUnitCents: unit.totalCostCents,
      warnings: dozen.warnings,
    };
  });
};

export const createFinanceRepository = (db: DbClient): FinanceRepository => ({
  async listProducts(filters = {}): Promise<FinanceProductRecord[]> {
    const productRows = await listProductRows(db, filters);
    const productIds = productRows.map((row) => row.id);
    const [historyByProduct, stockByProduct] = await Promise.all([
      listPurchaseHistoryRows(db, productIds),
      listStockQuantityByProduct(db, productIds),
    ]);

    return productRows.map((row) => ({
      product: mapProduct(row),
      purchaseHistory: historyByProduct.get(row.id) ?? [],
      stockQuantityBase: stockByProduct.get(row.id) ?? 0,
    }));
  },

  async createProduct(product): Promise<FinanceProduct> {
    const [row] = await db.insert(financeProducts).values(product).returning();
    return mapProduct(requireReturnedRow(row));
  },

  async getProductsByIds(ids): Promise<FinanceProduct[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await db
      .select()
      .from(financeProducts)
      .where(inArray(financeProducts.id, uniqueIds));

    return rows.map(mapProduct);
  },

  async createPurchaseWithItems(input): Promise<FinancePurchaseDetail> {
    await db.transaction(async (tx) => {
      await tx.insert(financePurchases).values(toPurchaseValues(input));
      if (input.items.length > 0) {
        await tx.insert(financePurchaseItems).values(input.items.map(toPurchaseItemValues));
      }
      if (input.stockMovements.length > 0) {
        await tx
          .insert(financeStockMovements)
          .values(input.stockMovements.map(toStockMovementValues));
      }
    });

    const purchase = await getPurchaseDetail(db, input.id);
    if (!purchase) {
      throw new Error('Database write did not return a finance purchase detail');
    }

    return purchase;
  },

  async listPurchases(filters = {}): Promise<FinancePurchaseDetail[]> {
    return listPurchaseDetails(db, filters);
  },

  async getPurchase(id): Promise<FinancePurchaseDetail | null> {
    return getPurchaseDetail(db, id);
  },

  async cancelPurchase(input): Promise<FinancePurchaseDetail | null> {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(financePurchases)
        .set({
          canceledAt: input.canceledAt,
          canceledReason: input.canceledReason,
          updatedAt: new Date(),
        })
        .where(and(eq(financePurchases.id, input.id), isNull(financePurchases.canceledAt)))
        .returning({ id: financePurchases.id });

      if (!row) {
        return;
      }

      if (input.reversalMovements.length > 0) {
        await tx
          .insert(financeStockMovements)
          .values(input.reversalMovements.map(toStockMovementValues));
      }
    });

    return getPurchaseDetail(db, input.id);
  },

  async listStock(filters = {}): Promise<FinanceStockItem[]> {
    const productRows = await listProductRows(db, filters);
    const productIds = productRows.map((row) => row.id);
    const stockByProduct = await listStockQuantityByProduct(db, productIds);

    return productRows.map((row) => ({
      product: mapProduct(row),
      quantityBase: stockByProduct.get(row.id) ?? 0,
    }));
  },

  async createStockMovement(input): Promise<FinanceStockMovement> {
    const [row] = await db
      .insert(financeStockMovements)
      .values(toStockMovementValues(input))
      .returning();

    return mapStockMovement(requireReturnedRow(row));
  },

  async listBaseCostRules(): Promise<FinanceBaseCostRuleDetail[]> {
    const rows = await db
      .select()
      .from(financeBaseCostRules)
      .orderBy(asc(financeBaseCostRules.name));
    const productIds = [...new Set(rows.map((row) => row.productId))];
    const [latestCostByProduct, productRows] = await Promise.all([
      getLatestCostByProduct(db, productIds),
      productIds.length
        ? db.select().from(financeProducts).where(inArray(financeProducts.id, productIds))
        : Promise.resolve([]),
    ]);
    const productsById = new Map(productRows.map((row) => [row.id, row]));

    return rows.map((row) => mapBaseCostRuleDetail(row, latestCostByProduct, productsById));
  },

  async createBaseCostRule(input): Promise<FinanceBaseCostRuleDetail> {
    const [row] = await db
      .insert(financeBaseCostRules)
      .values(toBaseCostRuleValues(input))
      .returning({ id: financeBaseCostRules.id });

    const detail = await getBaseCostRuleDetail(db, requireReturnedRow(row).id);
    if (!detail) {
      throw new Error('Database write did not return a finance base cost rule detail');
    }

    return detail;
  },

  async updateBaseCostRule(id, updates): Promise<FinanceBaseCostRuleDetail | null> {
    const [row] = await db
      .update(financeBaseCostRules)
      .set(toBaseCostRuleUpdate(updates))
      .where(eq(financeBaseCostRules.id, id))
      .returning({ id: financeBaseCostRules.id });

    if (!row) {
      return null;
    }

    return getBaseCostRuleDetail(db, row.id);
  },

  async deleteBaseCostRule(id): Promise<boolean> {
    const [row] = await db
      .delete(financeBaseCostRules)
      .where(eq(financeBaseCostRules.id, id))
      .returning({ id: financeBaseCostRules.id });

    return Boolean(row);
  },

  async listRecipes(): Promise<FinanceRecipeDetail[]> {
    const rows = await db.select().from(menuItems).orderBy(asc(menuItems.name));
    const items = await listRecipeItemRows(
      db,
      rows.map((row) => row.id),
    );

    return buildRecipeDetails(db, rows, items);
  },

  async getRecipe(menuItemId): Promise<FinanceRecipeDetail | null> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemId))
      .limit(1);

    if (!menuItem) {
      return null;
    }

    const items = await listRecipeItemRows(db, [menuItemId]);
    const [recipe] = await buildRecipeDetails(db, [menuItem], items);
    return recipe ?? null;
  },

  async replaceRecipe(input: PersistFinanceRecipeInput): Promise<FinanceRecipeDetail | null> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, input.menuItemId))
      .limit(1);

    if (!menuItem) {
      return null;
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(financeRecipes)
        .values({ menuItemId: input.menuItemId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: financeRecipes.menuItemId,
          set: { updatedAt: new Date() },
        });
      await tx
        .delete(financeRecipeItems)
        .where(eq(financeRecipeItems.menuItemId, input.menuItemId));

      if (input.items.length > 0) {
        await tx.insert(financeRecipeItems).values(
          input.items.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            productId: item.productId,
            quantityPerDozen: quantityToDb(item.quantityPerDozen),
            unit: item.unit,
            quantityBase: quantityToDb(item.quantityBase),
            notes: item.notes,
            updatedAt: new Date(),
          })),
        );
      }
    });

    const items = await listRecipeItemRows(db, [input.menuItemId]);
    const [recipe] = await buildRecipeDetails(db, [menuItem], items);
    return recipe ?? null;
  },

  async getCostingData(input): Promise<FinanceCostingData> {
    const menuItemIds = [...new Set(input.items.map((item) => item.menuItemId))];
    const [baseRuleRows, recipeRows, menuItemsById] = await Promise.all([
      db
        .select()
        .from(financeBaseCostRules)
        .where(eq(financeBaseCostRules.isActive, true))
        .orderBy(asc(financeBaseCostRules.name)),
      db
        .select()
        .from(financeRecipeItems)
        .innerJoin(financeRecipes, eq(financeRecipeItems.menuItemId, financeRecipes.menuItemId))
        .where(inArray(financeRecipeItems.menuItemId, menuItemIds)),
      getMenuItemsByIds(db, menuItemIds),
    ]);
    const productIds = [
      ...new Set([
        ...baseRuleRows.map((rule) => rule.productId),
        ...recipeRows.map((row) => row.finance_recipe_items.productId),
      ]),
    ];
    const latestCostByProduct = await getLatestCostByProduct(db, productIds);
    const productRows = productIds.length
      ? await db.select().from(financeProducts).where(inArray(financeProducts.id, productIds))
      : [];
    const productsById = new Map(productRows.map((row) => [row.id, row]));
    const baseRawMaterialRules = baseRuleRows
      .filter((rule) => rule.componentType === 'base_raw_material')
      .map((rule) => mapCostRule(rule, latestCostByProduct));
    const packagingRules = baseRuleRows
      .filter((rule) => rule.componentType === 'packaging')
      .map((rule) => mapCostRule(rule, latestCostByProduct));
    const recipeItemsByMenuItemId = new Map<string, FinanceRecipeCostItem[]>();

    for (const row of recipeRows) {
      const item = row.finance_recipe_items;
      const current = recipeItemsByMenuItemId.get(item.menuItemId) ?? [];
      current.push({
        productId: item.productId,
        name: productsById.get(item.productId)?.name,
        quantityBase: quantityFromDb(item.quantityBase),
        unit: item.unit,
        latestCostCents: latestCostByProduct.get(item.productId) ?? null,
      });
      recipeItemsByMenuItemId.set(item.menuItemId, current);
    }

    return {
      baseRawMaterialRules,
      packagingRules,
      recipeItemsByMenuItemId,
      menuItemsById: new Map(
        [...menuItemsById].map(([id, item]) => [id, { id: item.id, name: item.name }]),
      ),
    };
  },
});

const mapCostRule = (
  row: FinanceBaseCostRuleRow,
  latestCostByProduct: Map<string, number | null>,
) => ({
  id: row.id,
  productId: row.productId,
  name: row.name,
  componentType: row.componentType,
  appliesTo: row.appliesTo,
  quantity: quantityFromDb(row.quantity),
  groupSizeUnits: row.groupSizeUnits,
  roundingMode: row.roundingMode,
  latestCostCents: latestCostByProduct.get(row.productId) ?? null,
  isActive: row.isActive,
});
