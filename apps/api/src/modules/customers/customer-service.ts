import { randomUUID } from 'node:crypto';

import type { CreateCustomerInput, UpdateCustomerInput } from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

export type CustomerRepository = {
  list(): Promise<Customer[]>;
  create(customer: Customer): Promise<Customer>;
  update(id: string, updates: UpdateCustomerInput): Promise<Customer | null>;
  delete(id: string): Promise<boolean>;
};

const normalizeOptionalText = (value: string | undefined): string | null => value?.trim() || null;

export const listCustomers = (repository: CustomerRepository): Promise<Customer[]> =>
  repository.list();

export const createCustomer = (
  input: CreateCustomerInput,
  repository: CustomerRepository,
): Promise<Customer> => {
  return repository.create({
    id: randomUUID(),
    name: input.name,
    phone: normalizeOptionalText(input.phone),
    address: normalizeOptionalText(input.address),
  });
};

export const updateCustomer = async (
  id: string,
  input: UpdateCustomerInput,
  repository: CustomerRepository,
): Promise<Customer> => {
  const updated = await repository.update(id, input);

  if (!updated) {
    throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  return updated;
};

export const deleteCustomer = async (id: string, repository: CustomerRepository): Promise<void> => {
  const deleted = await repository.delete(id);

  if (!deleted) {
    throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }
};
