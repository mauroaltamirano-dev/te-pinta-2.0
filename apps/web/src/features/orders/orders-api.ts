import type {
  CreateOrderInput,
  DeliveryTime,
  DeliveryType,
  OrderFilters,
  OrderStatus,
  UpdateOrderInput,
} from '@te-pinta/shared';
import { createOrderSchema, updateOrderSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type CustomerSnapshot = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

export type OrderItemDetail = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderAddonDetail = {
  id: string;
  addonId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type OrderDetail = {
  id: string;
  customer: CustomerSnapshot;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  deliveryType: DeliveryType;
  cooked: boolean;
  notes: string | null;
  discountPercent: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  isPaid: boolean;
  items: OrderItemDetail[];
  addons: OrderAddonDetail[];
};

export type OrderListItem = Omit<OrderDetail, 'items' | 'addons'> & {
  itemCount: number;
  totalQuantity: number;
};

export type OrderListPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type OrderListStats = {
  active: number;
  finalized: number;
};

export type OrderListResponse = {
  orders: OrderListItem[];
  pagination: OrderListPagination;
  stats: OrderListStats;
};

export const listOrders = async (filters: OrderFilters = {}): Promise<OrderListResponse> => {
  const response = await apiClient.get<OrderListResponse>('/orders', {
    params: filters,
  });

  return response.data;
};

export const getOrder = async (id: string): Promise<OrderDetail> => {
  const response = await apiClient.get<{ order: OrderDetail }>(`/orders/${id}`);

  return response.data.order;
};

export const createOrder = async (input: CreateOrderInput): Promise<OrderDetail> => {
  const payload = createOrderSchema.parse(input);
  const response = await apiClient.post<{ order: OrderDetail }>('/orders', payload);

  return response.data.order;
};

export const updateOrder = async (id: string, input: UpdateOrderInput): Promise<OrderDetail> => {
  const payload = updateOrderSchema.parse(input);
  const response = await apiClient.patch<{ order: OrderDetail }>(`/orders/${id}`, payload);

  return response.data.order;
};

export const updateOrderStatus = async (id: string, status: OrderStatus): Promise<OrderDetail> => {
  const response = await apiClient.patch<{ order: OrderDetail }>(`/orders/${id}/status`, {
    status,
  });

  return response.data.order;
};

export const updateOrderPayment = async (id: string, isPaid: boolean): Promise<OrderDetail> => {
  const response = await apiClient.patch<{ order: OrderDetail }>(`/orders/${id}/payment`, {
    isPaid,
  });

  return response.data.order;
};

export const deleteOrder = async (id: string): Promise<void> => {
  await apiClient.delete(`/orders/${id}`);
};
