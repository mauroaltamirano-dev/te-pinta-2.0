import { describe, expect, it } from 'vitest';

import type { Customer, CustomerRepository } from './customer-service';
import { createCustomer, deleteCustomer } from './customer-service';
import { ApiError } from '../../middlewares/error-handler';

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
      delete: async () => false,
    };

    await expect(deleteCustomer('missing', repository)).rejects.toMatchObject(
      new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'),
    );
  });
});
