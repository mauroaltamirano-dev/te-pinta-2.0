import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderFilters, OrderStatus, UpdateOrderInput } from '@te-pinta/shared';

import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
  updateOrderPayment,
  updateOrderStatus,
} from './orders-api';

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (filters: OrderFilters = {}) => [...orderQueryKeys.all, 'list', filters] as const,
  detail: (id: string) => [...orderQueryKeys.all, 'detail', id] as const,
};

export const useOrders = (filters: OrderFilters = {}) =>
  useQuery({
    queryKey: orderQueryKeys.list(filters),
    queryFn: () => listOrders(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export const useOrderDetail = (id: string | null) =>
  useQuery({
    queryKey: orderQueryKeys.detail(id ?? 'none'),
    queryFn: () => getOrder(id ?? ''),
    enabled: Boolean(id),
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      queryClient.setQueryData(orderQueryKeys.detail(order.id), order);
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateOrderInput }) =>
      updateOrder(id, updates),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      queryClient.setQueryData(orderQueryKeys.detail(order.id), order);
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      queryClient.setQueryData(orderQueryKeys.detail(order.id), order);
    },
  });
};

export const useUpdateOrderPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) =>
      updateOrderPayment(id, isPaid),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all });
      queryClient.setQueryData(orderQueryKeys.detail(order.id), order);
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderQueryKeys.all }),
  });
};
