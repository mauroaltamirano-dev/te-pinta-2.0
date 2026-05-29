import { describe, expect, it } from 'vitest';

import type { MenuItem, MenuItemRepository } from './menu-service';
import { createMenuItem, deleteMenuItem, updateMenuItem } from './menu-service';
import { ApiError } from '../../middlewares/error-handler';

const menuItem = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: 'menu-1',
  name: 'Carne suave',
  priceUnit: 1500,
  priceHalfDozen: 8000,
  priceDozen: 15000,
  costPerDozen: 6000,
  isActive: true,
  isArchived: false,
  ...overrides,
});

describe('menu service', () => {
  it('creates menu items with generated ids and active defaults', async () => {
    const created: MenuItem[] = [];
    const repository: MenuItemRepository = {
      list: async () => created,
      create: async (item) => {
        const saved = menuItem(item);
        created.push(saved);
        return saved;
      },
      update: async () => null,
      delete: async () => false,
    };

    const result = await createMenuItem(
      {
        name: 'Carne suave',
        priceUnit: 1500,
        priceHalfDozen: 8000,
        priceDozen: 15000,
        costPerDozen: 0,
        isActive: true,
        isArchived: false,
      },
      repository,
    );

    expect(result).toMatchObject({ name: 'Carne suave', costPerDozen: 0, isActive: true });
    expect(result.id).toHaveLength(36);
  });

  it('soft deletes menu items by archiving them away from operational lists', async () => {
    let stored = menuItem();
    const repository: MenuItemRepository = {
      list: async () => [stored],
      create: async (item) => menuItem(item),
      update: async (_id, updates) => {
        stored = { ...stored, ...updates };
        return stored;
      },
      delete: async () => false,
    };

    await deleteMenuItem('menu-1', repository);

    expect(stored.isActive).toBe(false);
    expect(stored.isArchived).toBe(true);
  });

  it('throws 404 when updating a missing menu item', async () => {
    const repository: MenuItemRepository = {
      list: async () => [],
      create: async (item) => menuItem(item),
      update: async () => null,
      delete: async () => false,
    };

    await expect(updateMenuItem('missing', { name: 'Nueva' }, repository)).rejects.toMatchObject(
      new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND'),
    );
  });
});
