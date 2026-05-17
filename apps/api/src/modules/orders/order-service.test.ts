import { describe, expect, it } from 'vitest';

import { ApiError } from '../../middlewares/error-handler';
import type {
  CustomerSnapshot,
  MenuItemPricing,
  OrderDetail,
  OrderRepository,
} from './order-service';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
  updateOrderPayment,
  updateOrderStatus,
} from './order-service';

const customer = (overrides: Partial<CustomerSnapshot> = {}): CustomerSnapshot => ({
  id: 'customer-1',
  name: 'Ana',
  phone: '1122334455',
  address: null,
  ...overrides,
});

const menuItem = (overrides: Partial<MenuItemPricing> = {}): MenuItemPricing => ({
  id: 'menu-1',
  name: 'Carne suave',
  priceUnit: 1500,
  priceHalfDozen: 8000,
  priceDozen: 15000,
  isActive: true,
  ...overrides,
});

const orderDetail = (overrides: Partial<OrderDetail> = {}): OrderDetail => ({
  id: 'order-1',
  customer: customer(),
  deliveryDate: '2026-05-10',
  deliveryTime: 'noche',
  deliveryType: 'envio',
  cooked: false,
  notes: null,
  discountPercent: 10,
  deliveryFee: 1000,
  subtotal: 16500,
  total: 15850,
  status: 'confirmado',
  isPaid: false,
  addons: [],
  items: [
    {
      id: 'order-item-1',
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 13,
      unitPrice: 16500,
      subtotal: 16500,
    },
  ],
  ...overrides,
});

const createRepository = (overrides: Partial<OrderRepository> = {}): OrderRepository => ({
  list: async () => ({
    orders: [],
    pagination: {
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    stats: { active: 0, finalized: 0 },
  }),
  getById: async () => orderDetail(),
  findCustomerById: async () => customer(),
  findCustomerByPhone: async () => null,
  createCustomer: async (input) => customer(input),
  getMenuItemsByIds: async () => [menuItem()],
  getSetting: async (key) => {
    const settings: Record<string, string> = {
      delivery_fee: '1000',
      promo_bulk_dozen_threshold: '3',
      promo_bulk_discount_percent: '10',
      promo_combined_dozen_quantity: '12',
      promo_combined_dozen_price: '15000',
      addon_yasgua_salsa_price: '500',
      addon_yasgua_cremosa_price: '1000',
    };
    return settings[key] ?? null;
  },
  createOrderWithItems: async (input) => orderDetail(input),
  replaceOrder: async (id, input) => orderDetail({ ...input, id }),
  updateStatus: async (id, status) => orderDetail({ id, status }),
  updatePayment: async (id, isPaid) => orderDetail({ id, isPaid }),
  delete: async () => true,
  ...overrides,
});

describe('order service', () => {
  it('passes list filters through to the repository and returns pagination metadata', async () => {
    const repository = createRepository({
      list: async (filters) => ({
        orders: [{ ...orderDetail(), itemCount: 1, totalQuantity: 13 }],
        pagination: {
          page: filters?.page ?? 1,
          pageSize: filters?.pageSize ?? 25,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        stats: { active: 1, finalized: 0 },
      }),
    });

    const result = await listOrders(repository, {
      visibility: 'active',
      sortBy: 'deliveryDate',
      sortDir: 'asc',
      page: 2,
      pageSize: 10,
    });

    expect(result.orders).toHaveLength(1);
    expect(result.pagination).toMatchObject({ page: 2, pageSize: 10, total: 1 });
    expect(result.stats.active).toBe(1);
  });

  it('auto-creates new customers once, snapshots menu pricing, applies discount, and adds delivery fee', async () => {
    const createdCustomers: CustomerSnapshot[] = [];
    let persisted: Parameters<OrderRepository['createOrderWithItems']>[0] | undefined;
    const repository = createRepository({
      findCustomerByPhone: async () => null,
      createCustomer: async (input) => {
        const saved = customer(input);
        createdCustomers.push(saved);
        return saved;
      },
      createOrderWithItems: async (input) => {
        persisted = input;
        return orderDetail(input);
      },
    });

    const result = await createOrder(
      {
        customer: { newCustomer: { name: 'Ana', phone: '1122334455' } },
        deliveryDate: '2026-05-10',
        deliveryTime: 'noche',
        deliveryType: 'envio',
        cooked: false,
        discountPercent: 10,
        deliveryFee: 0,
        items: [{ menuItemId: 'menu-1', quantity: 13 }],
        addons: [],
      },
      repository,
    );

    expect(createdCustomers).toHaveLength(1);
    expect(persisted).toMatchObject({
      customerId: createdCustomers[0]?.id,
      deliveryFee: 1000,
      subtotal: 16500,
      total: 15850,
    });
    expect(persisted?.items[0]).toMatchObject({
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 13,
      unitPrice: 16500,
      subtotal: 16500,
    });
    expect(result.total).toBe(15850);
  });

  it('reuses an existing customer by phone instead of creating a duplicate', async () => {
    let createCustomerCalled = false;
    let persistedCustomerId = '';
    const repository = createRepository({
      findCustomerByPhone: async () => customer({ id: 'existing-customer' }),
      createCustomer: async (input) => {
        createCustomerCalled = true;
        return customer(input);
      },
      createOrderWithItems: async (input) => {
        persistedCustomerId = input.customerId;
        return orderDetail(input);
      },
    });

    await createOrder(
      {
        customer: { newCustomer: { name: 'Ana', phone: '1122334455' } },
        deliveryDate: '2026-05-10',
        deliveryTime: 'noche',
        deliveryType: 'retiro',
        cooked: false,
        discountPercent: 0,
        deliveryFee: 0,
        items: [{ menuItemId: 'menu-1', quantity: 6 }],
        addons: [],
      },
      repository,
    );

    expect(createCustomerCalled).toBe(false);
    expect(persistedCustomerId).toBe('existing-customer');
  });

  it('applies the combined dozen promo from settings', async () => {
    let persisted: Parameters<OrderRepository['createOrderWithItems']>[0] | undefined;
    const repository = createRepository({
      getMenuItemsByIds: async () => [
        menuItem({ id: 'menu-1', name: 'Carne suave', priceHalfDozen: 9000 }),
        menuItem({ id: 'menu-2', name: 'Jamón y queso', priceHalfDozen: 9000 }),
      ],
      createOrderWithItems: async (input) => {
        persisted = input;
        return orderDetail(input);
      },
    });

    await createOrder(
      {
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-10',
        deliveryTime: 'noche',
        deliveryType: 'retiro',
        cooked: false,
        discountPercent: 0,
        deliveryFee: 0,
        items: [
          { menuItemId: 'menu-1', quantity: 6 },
          { menuItemId: 'menu-2', quantity: 6 },
        ],
        addons: [],
      },
      repository,
    );

    expect(persisted).toMatchObject({
      subtotal: 15000,
      total: 15000,
      discountPercent: 0,
    });
  });

  it('prices several split dozens as combined dozens before discount and delivery', async () => {
    let persisted: Parameters<OrderRepository['createOrderWithItems']>[0] | undefined;
    const repository = createRepository({
      getMenuItemsByIds: async () => [
        menuItem({ id: 'caprese', name: 'Caprese', priceHalfDozen: 8000 }),
        menuItem({ id: 'criolla', name: 'Criolla Salada', priceHalfDozen: 8500 }),
        menuItem({ id: 'saltena', name: 'Salteña', priceHalfDozen: 9000 }),
        menuItem({ id: 'hongos', name: 'Hongos al Puerro', priceHalfDozen: 8500 }),
        menuItem({ id: 'jyq', name: 'Jamón y Queso', priceHalfDozen: 8000 }),
        menuItem({ id: 'humita', name: 'Humita', priceHalfDozen: 8000 }),
      ],
      getSetting: async (key) => {
        const settings: Record<string, string> = {
          delivery_fee: '1500',
          promo_bulk_dozen_threshold: '3',
          promo_bulk_discount_percent: '10',
          promo_combined_dozen_quantity: '12',
          promo_combined_dozen_price: '15000',
          addon_yasgua_salsa_price: '500',
          addon_yasgua_cremosa_price: '1000',
        };
        return settings[key] ?? null;
      },
      createOrderWithItems: async (input) => {
        persisted = input;
        return orderDetail(input);
      },
    });

    await createOrder(
      {
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-15',
        deliveryTime: 'noche',
        deliveryType: 'envio',
        cooked: false,
        discountPercent: 0,
        deliveryFee: 0,
        items: [
          { menuItemId: 'caprese', quantity: 6 },
          { menuItemId: 'criolla', quantity: 6 },
          { menuItemId: 'saltena', quantity: 6 },
          { menuItemId: 'hongos', quantity: 6 },
          { menuItemId: 'jyq', quantity: 6 },
          { menuItemId: 'humita', quantity: 6 },
        ],
        addons: [{ addonId: 'yasgua_salsa', quantity: 1 }],
      },
      repository,
    );

    expect(persisted).toMatchObject({
      subtotal: 45500,
      discountPercent: 10,
      deliveryFee: 1500,
      total: 42450,
    });
  });

  it('applies the 3+ dozen discount from settings', async () => {
    let persisted: Parameters<OrderRepository['createOrderWithItems']>[0] | undefined;
    const repository = createRepository({
      createOrderWithItems: async (input) => {
        persisted = input;
        return orderDetail(input);
      },
    });

    await createOrder(
      {
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-10',
        deliveryTime: 'noche',
        deliveryType: 'retiro',
        cooked: false,
        discountPercent: 0,
        deliveryFee: 0,
        items: [{ menuItemId: 'menu-1', quantity: 36 }],
        addons: [],
      },
      repository,
    );

    expect(persisted).toMatchObject({
      subtotal: 45000,
      total: 40500,
      discountPercent: 10,
    });
  });

  it('persists toppings below varieties and adds them to the total', async () => {
    let persisted: Parameters<OrderRepository['createOrderWithItems']>[0] | undefined;
    const repository = createRepository({
      createOrderWithItems: async (input) => {
        persisted = input;
        return orderDetail(input);
      },
    });

    await createOrder(
      {
        customer: { existingCustomerId: 'customer-1' },
        deliveryDate: '2026-05-10',
        deliveryTime: 'noche',
        deliveryType: 'retiro',
        cooked: false,
        discountPercent: 0,
        deliveryFee: 0,
        items: [{ menuItemId: 'menu-1', quantity: 12 }],
        addons: [
          { addonId: 'yasgua_salsa', quantity: 2 },
          { addonId: 'yasgua_cremosa', quantity: 1 },
        ],
      },
      repository,
    );

    expect(persisted).toMatchObject({
      subtotal: 17000,
      total: 17000,
      addons: [
        {
          addonId: 'yasgua_salsa',
          name: 'Yasgua salsa',
          quantity: 2,
          unitPrice: 500,
          subtotal: 1000,
        },
        {
          addonId: 'yasgua_cremosa',
          name: 'Yasgua cremosa',
          quantity: 1,
          unitPrice: 1000,
          subtotal: 1000,
        },
      ],
    });
  });

  it('throws 404 when an order references a missing menu item', async () => {
    const repository = createRepository({ getMenuItemsByIds: async () => [] });

    await expect(
      createOrder(
        {
          customer: { existingCustomerId: 'customer-1' },
          deliveryDate: '2026-05-10',
          deliveryTime: 'noche',
          deliveryType: 'retiro',
          cooked: false,
          discountPercent: 0,
          deliveryFee: 0,
          items: [{ menuItemId: 'missing', quantity: 1 }],
          addons: [],
        },
        repository,
      ),
    ).rejects.toMatchObject(new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND'));
  });

  it('rejects inactive menu items when building a pricing snapshot', async () => {
    const repository = createRepository({
      getMenuItemsByIds: async () => [menuItem({ isActive: false })],
    });

    await expect(
      createOrder(
        {
          customer: { existingCustomerId: 'customer-1' },
          deliveryDate: '2026-05-10',
          deliveryTime: 'noche',
          deliveryType: 'retiro',
          cooked: false,
          discountPercent: 0,
          deliveryFee: 0,
          items: [{ menuItemId: 'menu-1', quantity: 1 }],
          addons: [],
        },
        repository,
      ),
    ).rejects.toMatchObject(new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND'));
  });

  it('preserves item pricing snapshots when updating an order without replacing items', async () => {
    let persisted: Parameters<OrderRepository['replaceOrder']>[1] | undefined;
    const current = orderDetail({
      deliveryType: 'retiro',
      deliveryFee: 0,
      discountPercent: 0,
      subtotal: 16500,
      total: 16500,
    });
    const repository = createRepository({
      getById: async () => current,
      getMenuItemsByIds: async () => {
        throw new Error('Menu prices should not be re-read when items are unchanged');
      },
      replaceOrder: async (id, input) => {
        persisted = input;
        return orderDetail({ ...input, id });
      },
    });

    await updateOrder('order-1', { notes: 'Corregir dirección en puerta' }, repository);

    expect(persisted).toMatchObject({
      id: 'order-1',
      notes: 'Corregir dirección en puerta',
      subtotal: 16500,
      total: 16500,
    });
    expect(persisted?.items[0]).toMatchObject({
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 13,
      unitPrice: 16500,
      subtotal: 16500,
    });
  });

  it('updates order status in any direction and throws 404 for missing orders', async () => {
    const updatedStatuses: string[] = [];
    const repository = createRepository({
      updateStatus: async (id, status) => {
        updatedStatuses.push(status);
        return orderDetail({ id, status });
      },
    });

    await expect(updateOrderStatus('order-1', 'preparado', repository)).resolves.toMatchObject({
      status: 'preparado',
    });
    await expect(updateOrderStatus('order-1', 'confirmado', repository)).resolves.toMatchObject({
      status: 'confirmado',
    });
    expect(updatedStatuses).toEqual(['preparado', 'confirmado']);

    const missingRepository = createRepository({ updateStatus: async () => null });
    await expect(
      updateOrderStatus('missing', 'preparado', missingRepository),
    ).rejects.toMatchObject(new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND'));
  });

  it('updates payment state and throws 404 for missing orders', async () => {
    const repository = createRepository();

    await expect(updateOrderPayment('order-1', true, repository)).resolves.toMatchObject({
      id: 'order-1',
      isPaid: true,
    });

    const missingRepository = createRepository({ updatePayment: async () => null });
    await expect(updateOrderPayment('missing', true, missingRepository)).rejects.toMatchObject(
      new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND'),
    );
  });

  it('returns and deletes existing orders', async () => {
    const repository = createRepository();

    await expect(getOrder('order-1', repository)).resolves.toMatchObject({ id: 'order-1' });
    await expect(deleteOrder('order-1', repository)).resolves.toBeUndefined();
  });
});
