import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
    sourcePurchaseItemId: text('source_purchase_item_id').references(() => financePurchaseItems.id),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
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
    menuItemId: text('menu_item_id')
      .notNull()
      .references(() => financeRecipes.menuItemId),
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
    index('finance_recipe_items_menu_item_id_idx').on(table.menuItemId),
    index('finance_recipe_items_product_id_idx').on(table.productId),
  ],
);
