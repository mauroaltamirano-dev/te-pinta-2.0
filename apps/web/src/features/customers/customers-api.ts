import type { CreateCustomerInput, UpdateCustomerInput } from '@te-pinta/shared';
import { createCustomerSchema, updateCustomerSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
};

export const listCustomers = async (): Promise<Customer[]> => {
  const response = await apiClient.get<{ customers: Customer[] }>('/customers');

  return response.data.customers;
};

export const createCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
  const payload = createCustomerSchema.parse(input);
  const response = await apiClient.post<{ customer: Customer }>('/customers', payload);

  return response.data.customer;
};

export const updateCustomer = async (id: string, input: UpdateCustomerInput): Promise<Customer> => {
  const payload = updateCustomerSchema.parse(input);
  const response = await apiClient.patch<{ customer: Customer }>(`/customers/${id}`, payload);

  return response.data.customer;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await apiClient.delete(`/customers/${id}`);
};
