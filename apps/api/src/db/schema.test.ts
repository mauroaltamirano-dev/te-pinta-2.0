import { getTableName } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { customers, ingredients, menuItems, orderItems, orders, settings, users } from './schema';

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
    ]).toEqual([
      'users',
      'customers',
      'menu_items',
      'ingredients',
      'orders',
      'order_items',
      'settings',
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

    expect(migration).toContain('ALTER TABLE "orders" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL');
  });

});
