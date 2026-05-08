import { asc, eq } from 'drizzle-orm';

import type { UpdateCustomerInput } from '@te-pinta/shared';

import type { createDbClient } from '../../db/index';
import { customers } from '../../db/schema';
import type { Customer, CustomerRepository } from './customer-service';

type DbClient = ReturnType<typeof createDbClient>['db'];
type CustomerInsert = typeof customers.$inferInsert;
type CustomerRow = typeof customers.$inferSelect;

const requireReturnedRow = <T>(row: T | undefined): T => {
  if (!row) {
    throw new Error('Database write did not return a row');
  }

  return row;
};

const mapCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address,
});

const toCustomerUpdate = (updates: UpdateCustomerInput): Partial<CustomerInsert> => ({
  ...(updates.name !== undefined ? { name: updates.name } : {}),
  ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
  ...(updates.address !== undefined ? { address: updates.address || null } : {}),
  updatedAt: new Date(),
});

export const createCustomerRepository = (db: DbClient): CustomerRepository => ({
  async list(): Promise<Customer[]> {
    const rows = await db.select().from(customers).orderBy(asc(customers.name));
    return rows.map(mapCustomer);
  },

  async create(customer): Promise<Customer> {
    const [row] = await db
      .insert(customers)
      .values({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      })
      .returning();

    return mapCustomer(requireReturnedRow(row));
  },

  async update(id, updates): Promise<Customer | null> {
    const [row] = await db
      .update(customers)
      .set(toCustomerUpdate(updates))
      .where(eq(customers.id, id))
      .returning();

    return row ? mapCustomer(row) : null;
  },

  async delete(id): Promise<boolean> {
    const [row] = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning({ id: customers.id });

    return Boolean(row);
  },
});
