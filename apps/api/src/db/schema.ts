import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const deliveryTimeEnum = pgEnum('delivery_time', ['mediodia', 'tarde', 'noche']);
export const deliveryTypeEnum = pgEnum('delivery_type', ['retiro', 'envio']);
export const ingredientUnitEnum = pgEnum('ingredient_unit', ['g', 'kg', 'ml', 'l', 'u']);
export const orderStatusEnum = pgEnum('order_status', ['confirmado', 'preparado', 'entregado']);
export const financeProductCategoryEnum = pgEnum('finance_product_category', [
  'raw_material',
  'packaging',
  'operating_expense',
  'service',
  'fuel',
  'investment',
  'other',
]);
export const financeBaseUnitEnum = pgEnum('finance_base_unit', [
  'unit',
  'g',
  'kg',
  'ml',
  'l',
  'pack',
]);
export const financePurchaseFundingSourceEnum = pgEnum('finance_purchase_funding_source', [
  'production_cost',
  'profit',
  'services',
]);
export const financeWalletMovementDirectionEnum = pgEnum('finance_wallet_movement_direction', [
  'credit',
  'debit',
]);
export const financeStockMovementTypeEnum = pgEnum('finance_stock_movement_type', [
  'purchase_in',
  'manual_in',
  'manual_out',
  'waste',
  'order_consumption',
  'adjustment',
]);
export const financeCostComponentTypeEnum = pgEnum('finance_cost_component_type', [
  'base_raw_material',
  'packaging',
]);
export const financeCostRuleAppliesToEnum = pgEnum('finance_cost_rule_applies_to', [
  'per_empanada',
  'per_started_dozen',
]);
export const financeRoundingModeEnum = pgEnum('finance_rounding_mode', ['exact', 'ceil']);
export const financeLedgerEventTypeEnum = pgEnum('finance_ledger_event_type', [
  'sale_confirmed',
  'order_canceled',
  'payment_received',
  'payment_reversed',
  'purchase_recorded',
  'purchase_canceled',
  'wallet_adjustment',
  'stock_movement',
  'correction',
]);
export const financeLedgerOriginEnum = pgEnum('finance_ledger_origin', [
  'live',
  'manual',
  'backfill',
  'system',
]);
export const financeLedgerSourceTypeEnum = pgEnum('finance_ledger_source_type', [
  'order',
  'purchase',
  'wallet_adjustment',
  'stock_movement',
]);
export const financeLedgerEntryKindEnum = pgEnum('finance_ledger_entry_kind', [
  'income',
  'expense',
  'adjustment',
  'reversal',
]);
export const financeLedgerCategoryEnum = pgEnum('finance_ledger_category', [
  'sale',
  'purchase',
  'wallet_adjustment',
  'stock_valuation',
  'correction',
]);

const id = (name = 'id') => text(name).primaryKey();
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: id(),
  name: varchar('name', { length: 160 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable('customers', {
  id: id(),
  name: varchar('name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 64 }).unique(),
  address: text('address'),
  ...timestamps,
});

export const menuItems = pgTable('menu_items', {
  id: id(),
  name: varchar('name', { length: 160 }).notNull(),
  priceUnit: numeric('price_unit', { precision: 12, scale: 2 }).notNull(),
  priceHalfDozen: numeric('price_half_dozen', { precision: 12, scale: 2 }).notNull(),
  priceDozen: numeric('price_dozen', { precision: 12, scale: 2 }).notNull(),
  costPerDozen: numeric('cost_per_dozen', { precision: 12, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  ...timestamps,
});

export const ingredients = pgTable('ingredients', {
  id: id(),
  name: varchar('name', { length: 160 }).notNull(),
  unit: ingredientUnitEnum('unit').notNull(),
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
});

export const orders = pgTable(
  'orders',
  {
    id: id(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    deliveryDate: date('delivery_date').notNull(),
    deliveryTime: deliveryTimeEnum('delivery_time').notNull(),
    deliveryType: deliveryTypeEnum('delivery_type').notNull(),
    cooked: boolean('cooked').notNull().default(false),
    notes: text('notes'),
    discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
    deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    cookingFee: numeric('cooking_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    costTotalCents: integer('cost_total_cents'),
    grossProfitCents: integer('gross_profit_cents'),
    profitMarginPercent: numeric('profit_margin_percent', { precision: 7, scale: 2 }),
    costSnapshotJson: jsonb('cost_snapshot_json'),
    status: orderStatusEnum('status').notNull().default('confirmado'),
    isPaid: boolean('is_paid').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index('orders_delivery_date_idx').on(table.deliveryDate),
    index('orders_status_is_paid_idx').on(table.status, table.isPaid),
    index('orders_created_at_idx').on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id),
    menuItemId: text('menu_item_id')
      .notNull()
      .references(() => menuItems.id),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
);

export const orderAddons = pgTable(
  'order_addons',
  {
    id: id(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id),
    addonId: varchar('addon_id', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [index('order_addons_order_id_idx').on(table.orderId)],
);

export const settings = pgTable('settings', {
  key: varchar('key', { length: 120 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const financeProducts = pgTable(
  'finance_products',
  {
    id: id(),
    name: varchar('name', { length: 180 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 180 }).notNull().unique(),
    category: financeProductCategoryEnum('category').notNull(),
    baseUnit: financeBaseUnitEnum('base_unit').notNull(),
    stockTracking: boolean('stock_tracking').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('finance_products_category_idx').on(table.category),
    index('finance_products_active_idx').on(table.isActive),
  ],
);

export const financePurchases = pgTable(
  'finance_purchases',
  {
    id: id(),
    purchaseDate: date('purchase_date').notNull(),
    supplier: varchar('supplier', { length: 180 }),
    receiptNumber: varchar('receipt_number', { length: 120 }),
    notes: text('notes'),
    fundingSource: financePurchaseFundingSourceEnum('funding_source')
      .notNull()
      .default('production_cost'),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    canceledReason: text('canceled_reason'),
    ...timestamps,
  },
  (table) => [
    index('finance_purchases_purchase_date_idx').on(table.purchaseDate),
    index('finance_purchases_supplier_idx').on(table.supplier),
  ],
);

export const financePurchaseItems = pgTable(
  'finance_purchase_items',
  {
    id: id(),
    purchaseId: text('purchase_id')
      .notNull()
      .references(() => financePurchases.id),
    productId: text('product_id')
      .notNull()
      .references(() => financeProducts.id),
    purchaseUnit: financeBaseUnitEnum('purchase_unit').notNull(),
    purchaseQuantity: numeric('purchase_quantity', { precision: 14, scale: 3 }).notNull(),
    unitsPerPackage: numeric('units_per_package', { precision: 14, scale: 3 }).notNull(),
    totalBaseUnits: numeric('total_base_units', { precision: 14, scale: 3 }).notNull(),
    unitPriceCents: integer('unit_price_cents'),
    totalPriceCents: integer('total_price_cents').notNull(),
    costPerBaseUnitCents: integer('cost_per_base_unit_cents').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    index('finance_purchase_items_purchase_id_idx').on(table.purchaseId),
    index('finance_purchase_items_product_id_idx').on(table.productId),
  ],
);

export const financeStockMovements = pgTable(
  'finance_stock_movements',
  {
    id: id(),
    productId: text('product_id')
      .notNull()
      .references(() => financeProducts.id),
    movementType: financeStockMovementTypeEnum('movement_type').notNull(),
    quantityBase: numeric('quantity_base', { precision: 14, scale: 3 }).notNull(),
    sourcePurchaseItemId: text('source_purchase_item_id'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'finance_stock_movements_source_purchase_item_id_finance_purchas',
      columns: [table.sourcePurchaseItemId],
      foreignColumns: [financePurchaseItems.id],
    }),
    index('finance_stock_movements_product_id_idx').on(table.productId),
    index('finance_stock_movements_source_purchase_item_id_idx').on(table.sourcePurchaseItemId),
  ],
);

export const financeBaseCostRules = pgTable(
  'finance_base_cost_rules',
  {
    id: id(),
    productId: text('product_id')
      .notNull()
      .references(() => financeProducts.id),
    name: varchar('name', { length: 180 }).notNull(),
    componentType: financeCostComponentTypeEnum('component_type').notNull(),
    appliesTo: financeCostRuleAppliesToEnum('applies_to').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    groupSizeUnits: integer('group_size_units').notNull().default(12),
    roundingMode: financeRoundingModeEnum('rounding_mode').notNull().default('ceil'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index('finance_base_cost_rules_product_id_idx').on(table.productId),
    index('finance_base_cost_rules_active_idx').on(table.isActive),
  ],
);

export const financeRecipes = pgTable('finance_recipes', {
  menuItemId: text('menu_item_id')
    .primaryKey()
    .references(() => menuItems.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const financeRecipeItems = pgTable(
  'finance_recipe_items',
  {
    id: id(),
    menuItemId: text('menu_item_id').notNull(),
    productId: text('product_id')
      .notNull()
      .references(() => financeProducts.id),
    quantityPerDozen: numeric('quantity_per_dozen', { precision: 14, scale: 3 }).notNull(),
    unit: financeBaseUnitEnum('unit').notNull(),
    quantityBase: numeric('quantity_base', { precision: 14, scale: 3 }).notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      name: 'finance_recipe_items_menu_item_id_finance_recipes_menu_item_id_',
      columns: [table.menuItemId],
      foreignColumns: [financeRecipes.menuItemId],
    }),
    index('finance_recipe_items_menu_item_id_idx').on(table.menuItemId),
    index('finance_recipe_items_product_id_idx').on(table.productId),
  ],
);

export const financeWalletAdjustments = pgTable(
  'finance_wallet_adjustments',
  {
    id: id(),
    wallet: financePurchaseFundingSourceEnum('wallet').notNull(),
    direction: financeWalletMovementDirectionEnum('direction').notNull(),
    amountCents: integer('amount_cents').notNull(),
    reason: text('reason').notNull(),
    actorId: text('actor_id').notNull(),
    actorName: varchar('actor_name', { length: 160 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('finance_wallet_adjustments_wallet_idx').on(table.wallet),
    index('finance_wallet_adjustments_occurred_at_idx').on(table.occurredAt),
    index('finance_wallet_adjustments_actor_id_idx').on(table.actorId),
    check('finance_wallet_adjustments_amount_positive', sql`${table.amountCents} > 0`),
  ],
);

export const financeLedgerEvents = pgTable(
  'finance_ledger_events',
  {
    id: id(),
    eventType: financeLedgerEventTypeEnum('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    origin: financeLedgerOriginEnum('origin').notNull(),
    sourceType: financeLedgerSourceTypeEnum('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    createdById: text('created_by_id'),
    createdByName: varchar('created_by_name', { length: 160 }),
    reversesEventId: text('reverses_event_id'),
    metadataJson: jsonb('metadata_json'),
  },
  (table) => [
    foreignKey({
      name: 'finance_ledger_events_reverses_event_fk',
      columns: [table.reversesEventId],
      foreignColumns: [table.id],
    }).onDelete('restrict'),
    uniqueIndex('finance_ledger_events_idempotency_key_unique').on(table.idempotencyKey),
    index('finance_ledger_events_source_idx').on(table.sourceType, table.sourceId),
    index('finance_ledger_events_occurred_at_idx').on(table.occurredAt),
    index('finance_ledger_events_event_type_idx').on(table.eventType),
    check(
      'finance_ledger_events_actor_pair',
      sql`(${table.createdById} IS NULL) = (${table.createdByName} IS NULL)`,
    ),
    check(
      'finance_ledger_events_metadata_object',
      sql`${table.metadataJson} IS NULL OR jsonb_typeof(${table.metadataJson}) = 'object'`,
    ),
  ],
);

export const financeLedgerEntries = pgTable(
  'finance_ledger_entries',
  {
    id: id(),
    eventId: text('event_id').notNull(),
    lineKey: varchar('line_key', { length: 120 }).notNull(),
    entryKind: financeLedgerEntryKindEnum('entry_kind').notNull(),
    direction: financeWalletMovementDirectionEnum('direction').notNull(),
    wallet: financePurchaseFundingSourceEnum('wallet'),
    category: financeLedgerCategoryEnum('category').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('ARS'),
    description: text('description').notNull(),
    reversesEntryId: text('reverses_entry_id'),
    metadataJson: jsonb('metadata_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'finance_ledger_entries_event_fk',
      columns: [table.eventId],
      foreignColumns: [financeLedgerEvents.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'finance_ledger_entries_reverses_entry_fk',
      columns: [table.reversesEntryId],
      foreignColumns: [table.id],
    }).onDelete('restrict'),
    uniqueIndex('finance_ledger_entries_event_line_unique').on(table.eventId, table.lineKey),
    uniqueIndex('finance_ledger_entries_reverses_entry_unique')
      .on(table.reversesEntryId)
      .where(sql`${table.reversesEntryId} IS NOT NULL`),
    index('finance_ledger_entries_event_id_idx').on(table.eventId),
    index('finance_ledger_entries_wallet_idx').on(table.wallet),
    index('finance_ledger_entries_category_idx').on(table.category),
    index('finance_ledger_entries_created_at_idx').on(table.createdAt),
    check('finance_ledger_entries_amount_positive', sql`${table.amountCents} > 0`),
    check(
      'finance_ledger_entries_not_self_reversal',
      sql`${table.reversesEntryId} IS NULL OR ${table.reversesEntryId} <> ${table.id}`,
    ),
    check(
      'finance_ledger_entries_metadata_object',
      sql`${table.metadataJson} IS NULL OR jsonb_typeof(${table.metadataJson}) = 'object'`,
    ),
  ],
);
