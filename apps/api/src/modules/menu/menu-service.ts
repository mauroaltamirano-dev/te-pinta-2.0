import { randomUUID } from 'node:crypto';

import type { CreateMenuItemInput, UpdateMenuItemInput } from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

export type MenuItem = {
  id: string;
  name: string;
  priceUnit: number;
  priceHalfDozen: number;
  priceDozen: number;
  costPerDozen: number;
  isActive: boolean;
  isArchived: boolean;
};

export type MenuItemRepository = {
  list(options?: { includeInactive?: boolean }): Promise<MenuItem[]>;
  create(item: MenuItem): Promise<MenuItem>;
  update(id: string, updates: UpdateMenuItemInput): Promise<MenuItem | null>;
  delete(id: string): Promise<boolean>;
};

export const listMenuItems = (
  repository: MenuItemRepository,
  options?: { includeInactive?: boolean },
): Promise<MenuItem[]> => repository.list(options);

export const createMenuItem = (
  input: CreateMenuItemInput,
  repository: MenuItemRepository,
): Promise<MenuItem> => {
  return repository.create({
    id: randomUUID(),
    name: input.name,
    priceUnit: input.priceUnit,
    priceHalfDozen: input.priceHalfDozen,
    priceDozen: input.priceDozen,
    costPerDozen: input.costPerDozen ?? 0,
    isActive: input.isActive ?? true,
    isArchived: input.isArchived ?? false,
  });
};

export const updateMenuItem = async (
  id: string,
  input: UpdateMenuItemInput,
  repository: MenuItemRepository,
): Promise<MenuItem> => {
  const updated = await repository.update(id, input);

  if (!updated) {
    throw new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  }

  return updated;
};

export const deleteMenuItem = async (id: string, repository: MenuItemRepository): Promise<void> => {
  const updated = await repository.update(id, { isActive: false, isArchived: true });

  if (!updated) {
    throw new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  }
};
