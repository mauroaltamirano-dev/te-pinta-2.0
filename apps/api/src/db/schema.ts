import {
  boolean,
  date,
  integer,
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
  phone: varchar('phone', { length: 64 }).notNull().unique(),
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

export const orders = pgTable('orders', {
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
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').notNull().default('confirmado'),
  isPaid: boolean('is_paid').notNull().default(false),
  ...timestamps,
});

export const orderItems = pgTable('order_items', {
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
});

export const settings = pgTable('settings', {
  key: varchar('key', { length: 120 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
