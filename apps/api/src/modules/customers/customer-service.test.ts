import { describe, expect, it } from 'vitest';

import { ApiError } from '../../middlewares/error-handler';
import type { Customer, CustomerRepository } from './customer-service';
import { createCustomer, deleteCustomer } from './customer-service';

const customer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'customer-1',
  name: 'Ana',
  phone: '1122334455',
  address: null,
  ...overrides,
});

describe('customer service', () => {
  it('creates customers with generated ids', async () => {
    const repository: CustomerRepository = {
      list: async () => [],
      create: async (input) => customer(input),
      update: async () => null,
      countOrders: async () => 0,
      delete: async () => false,
    };

    const result = await createCustomer({ name: 'Ana', phone: '1122334455' }, repository);

    expect(result).toMatchObject({ name: 'Ana', phone: '1122334455', address: null });
    expect(result.id).toHaveLength(36);
  });

  it('throws 404 when deleting a missing customer', async () => {
    const repository: CustomerRepository = {
      list: async () => [],
      create: async (input) => customer(input),
      update: async () => null,
      countOrders: async () => 0,
      delete: async () => false,
    };

    await expect(deleteCustomer('missing', repository)).rejects.toMatchObject(
      new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'),
    );
  });

  it('throws 409 when deleting a customer with orders', async () => {
    const repository: CustomerRepository = {
      list: async () => [],
      create: async (input) => customer(input),
      update: async () => null,
      countOrders: async () => 2,
      delete: async () => true,
    };

    await expect(deleteCustomer('customer-1', repository)).rejects.toMatchObject(
      new ApiError(409, 'Customer has orders and cannot be deleted directly', 'CUSTOMER_HAS_ORDERS'),
    );
  });
});
