import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateCustomerInput } from '@te-pinta/shared';

import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from './customers-api';

export const customerQueryKeys = {
  all: ['customers'] as const,
  list: () => [...customerQueryKeys.all, 'list'] as const,
};

export const useCustomers = () =>
  useQuery({
    queryKey: customerQueryKeys.list(),
    queryFn: listCustomers,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.all }),
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateCustomerInput }) =>
      updateCustomer(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.all }),
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerQueryKeys.all }),
  });
};
