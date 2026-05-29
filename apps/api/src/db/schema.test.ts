import { getTableName } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  customers,
  financeBaseCostRules,
  financeProducts,
  financePurchaseItems,
  financePurchases,
  financeRecipeItems,
  financeRecipes,
  financeStockMovements,
  ingredients,
  menuItems,
  orderItems,
  orders,
  settings,
  users,
} from './schema';

const currentDir = dirname(fileURLToPath(import.meta.url));

describe('database schema', () => {
  it('defines the MVP tables and excludes deferred reports tables', () => {
    expect([
      getTableName(users),
      getTableName(customers),
      getTableName(menuItems),
      getTableName(ingredients),
      getTableName(orders),
      getTableName(orderItems),
      getTableName(settings),
      getTableName(financeProducts),
      getTableName(financePurchases),
      getTableName(financePurchaseItems),
      getTableName(financeStockMovements),
      getTableName(financeBaseCostRules),
      getTableName(financeRecipes),
      getTableName(financeRecipeItems),
    ]).toEqual([
      'users',
      'customers',
      'menu_items',
      'ingredients',
      'orders',
      'order_items',
      'settings',
      'finance_products',
      'finance_purchases',
      'finance_purchase_items',
      'finance_stock_movements',
      'finance_base_cost_rules',
      'finance_recipes',
      'finance_recipe_items',
    ]);
  });

  it('keeps the initial migration aligned with MVP seed and order requirements', async () => {
    const migration = await readFile(
      join(currentDir, 'migrations', '0000_faulty_iron_man.sql'),
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE "users"');
    expect(migration).toContain('CONSTRAINT "users_email_unique" UNIQUE("email")');
    expect(migration).toContain('CREATE TABLE "settings"');
    expect(migration).toContain('"key" varchar(120) PRIMARY KEY NOT NULL');
    expect(migration).toContain('CREATE TABLE "orders"');
    expect(migration).toContain('"subtotal" numeric(12, 2) NOT NULL');
    expect(migration).toContain('"total" numeric(12, 2) NOT NULL');
    expect(migration).toContain('CREATE TABLE "order_items"');
    expect(migration).toContain('"unit_price" numeric(12, 2) NOT NULL');
    expect(migration).toContain('"subtotal" numeric(12, 2) NOT NULL');
  });
  it('adds payment state in the follow-up migration for active/finalized order filters', async () => {
    const migration = await readFile(
      join(currentDir, 'migrations', '0001_orders_is_paid.sql'),
      'utf8',
    );

    expect(migration).toContain(
      'ALTER TABLE "orders" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL',
    );
  });

  it('adds finance tables and nullable order snapshot columns in migration 0006', async () => {
    const migration = await readFile(
      join(currentDir, 'migrations', '0006_finance_mvp.sql'),
      'utf8',
    );

    expect(migration).toContain('CREATE TYPE "public"."finance_product_category"');
    expect(migration).toContain('CREATE TABLE "finance_products"');
    expect(migration).toContain('"normalized_name" varchar(180) NOT NULL');
    expect(migration).toContain('CREATE TABLE "finance_purchase_items"');
    expect(migration).toContain('"total_price_cents" integer NOT NULL');
    expect(migration).toContain('CREATE TABLE "finance_stock_movements"');
    expect(migration).toContain('CREATE TABLE "finance_base_cost_rules"');
    expect(migration).toContain('CREATE TABLE "finance_recipe_items"');
    expect(migration).toContain('ALTER TABLE "orders" ADD COLUMN "cost_total_cents" integer');
    expect(migration).toContain('ALTER TABLE "orders" ADD COLUMN "cost_snapshot_json" jsonb');
  });

  it('adds menu item archival in migration 0008', async () => {
    const migration = await readFile(
      join(currentDir, 'migrations', '0008_menu_item_archival.sql'),
      'utf8',
    );

    expect(migration).toContain(
      'ALTER TABLE "menu_items" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL',
    );
  });

  it('registers latest migrations in the Drizzle journal', async () => {
    const journal = JSON.parse(
      await readFile(join(currentDir, 'migrations', 'meta', '_journal.json'), 'utf8'),
    ) as {
      entries: Array<{
        idx: number;
        version: string;
        tag: string;
        breakpoints: boolean;
      }>;
    };

    expect(journal.entries.at(-3)).toMatchObject({
      idx: 6,
      version: '7',
      tag: '0006_finance_mvp',
      breakpoints: true,
    });
    expect(journal.entries.at(-2)).toMatchObject({
      idx: 7,
      version: '7',
      tag: '0007_finance_purchase_cancellation',
      breakpoints: true,
    });
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 8,
      version: '7',
      tag: '0008_menu_item_archival',
      breakpoints: true,
    });
  });
});
