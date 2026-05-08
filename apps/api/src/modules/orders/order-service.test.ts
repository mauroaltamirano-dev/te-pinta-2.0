import { describe, expect, it } from 'vitest';

import { ApiError } from '../../middlewares/error-handler';
import type {
  CustomerSnapshot,
  MenuItemPricing,
  OrderDetail,
  OrderRepository,
} from './order-service';
import { createOrder, deleteOrder, getOrder, updateOrder, updateOrderPayment, updateOrderStatus } from './order-service';

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
  list: async () => [],
  getById: async () => orderDetail(),
  findCustomerById: async () => customer(),
  findCustomerByPhone: async () => null,
  createCustomer: async (input) => customer(input),
  getMenuItemsByIds: async () => [menuItem()],
  getSetting: async () => '1000',
  createOrderWithItems: async (input) => orderDetail(input),
  replaceOrder: async (id, input) => orderDetail({ ...input, id }),
  updateStatus: async (id, status) => orderDetail({ id, status }),
  updatePayment: async (id, isPaid) => orderDetail({ id, isPaid }),
  delete: async () => true,
  ...overrides,
});

describe('order service', () => {
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
      },
      repository,
    );

    expect(createCustomerCalled).toBe(false);
    expect(persistedCustomerId).toBe('existing-customer');
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
    await expect(updateOrderStatus('missing', 'preparado', missingRepository)).rejects.toMatchObject(
      new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND'),
    );
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
