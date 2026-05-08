import type { CreateMenuItemInput, UpdateMenuItemInput } from '@te-pinta/shared';
import { createMenuItemSchema, updateMenuItemSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type MenuItem = {
  id: string;
  name: string;
  priceUnit: number;
  priceHalfDozen: number;
  priceDozen: number;
  costPerDozen: number;
  isActive: boolean;
};

export const listMenuItems = async (): Promise<MenuItem[]> => {
  const response = await apiClient.get<{ items: MenuItem[] }>('/menu-items', {
    params: { includeInactive: true },
  });

  return response.data.items;
};

export const createMenuItem = async (input: CreateMenuItemInput): Promise<MenuItem> => {
  const payload = createMenuItemSchema.parse(input);
  const response = await apiClient.post<{ item: MenuItem }>('/menu-items', payload);

  return response.data.item;
};

export const updateMenuItem = async (id: string, input: UpdateMenuItemInput): Promise<MenuItem> => {
  const payload = updateMenuItemSchema.parse(input);
  const response = await apiClient.patch<{ item: MenuItem }>(`/menu-items/${id}`, payload);

  return response.data.item;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  await apiClient.delete(`/menu-items/${id}`);
};
