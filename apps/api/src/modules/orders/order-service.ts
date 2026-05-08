import { randomUUID } from 'node:crypto';

import {
  calculateItemPrice,
  type CreateOrderInput,
  type DeliveryTime,
  type DeliveryType,
  type OrderFilters,
  type OrderStatus,
  type UpdateOrderInput,
} from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

export type CustomerSnapshot = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
};

export type MenuItemPricing = {
  id: string;
  name: string;
  priceUnit: number;
  priceHalfDozen: number;
  priceDozen: number;
  isActive: boolean;
};

export type OrderItemDetail = {
  id: string;
  menuItemId: string;
  menuItemName: string;
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
};

export type OrderListItem = Omit<OrderDetail, 'items'> & {
  itemCount: number;
};

export type PersistOrderItem = Omit<OrderItemDetail, 'id'> & { id: string };

export type PersistOrderInput = {
  id: string;
  customerId: string;
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
  items: PersistOrderItem[];
};

export type OrderRepository = {
  list(filters?: OrderFilters): Promise<OrderListItem[]>;
  getById(id: string): Promise<OrderDetail | null>;
  findCustomerById(id: string): Promise<CustomerSnapshot | null>;
  findCustomerByPhone(phone: string): Promise<CustomerSnapshot | null>;
  createCustomer(customer: CustomerSnapshot): Promise<CustomerSnapshot>;
  getMenuItemsByIds(ids: string[]): Promise<MenuItemPricing[]>;
  getSetting(key: string): Promise<string | null>;
  createOrderWithItems(input: PersistOrderInput): Promise<OrderDetail>;
  replaceOrder(id: string, input: PersistOrderInput): Promise<OrderDetail | null>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderDetail | null>;
  updatePayment(id: string, isPaid: boolean): Promise<OrderDetail | null>;
  delete(id: string): Promise<boolean>;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const normalizeAddress = (address: string | undefined): string | null => address || null;

const parseMoneySetting = (value: string | null): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const resolveCustomer = async (
  input: CreateOrderInput['customer'],
  repository: OrderRepository,
): Promise<CustomerSnapshot> => {
  if ('existingCustomerId' in input) {
    const customer = await repository.findCustomerById(input.existingCustomerId);

    if (!customer) {
      throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    return customer;
  }

  const existing = await repository.findCustomerByPhone(input.newCustomer.phone);
  if (existing) {
    return existing;
  }

  return repository.createCustomer({
    id: randomUUID(),
    name: input.newCustomer.name,
    phone: input.newCustomer.phone,
    address: normalizeAddress(input.newCustomer.address),
  });
};

const findMenuPricing = (menuItems: MenuItemPricing[], id: string): MenuItemPricing => {
  const menuItem = menuItems.find((item) => item.id === id && item.isActive);

  if (!menuItem) {
    throw new ApiError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
  }

  return menuItem;
};

const buildSnapshotItems = async (
  items: CreateOrderInput['items'],
  repository: OrderRepository,
): Promise<PersistOrderItem[]> => {
  const menuIds = [...new Set(items.map((item) => item.menuItemId))];
  const menuItems = await repository.getMenuItemsByIds(menuIds);

  return items.map((item) => {
    const menuItem = findMenuPricing(menuItems, item.menuItemId);
    const calculated = calculateItemPrice({
      quantity: item.quantity,
      priceUnit: menuItem.priceUnit,
      priceHalfDozen: menuItem.priceHalfDozen,
      priceDozen: menuItem.priceDozen,
    });

    return {
      id: randomUUID(),
      menuItemId: item.menuItemId,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      unitPrice: calculated.total,
      subtotal: calculated.total,
    };
  });
};

const buildPersistInput = async (
  input: CreateOrderInput,
  repository: OrderRepository,
  options: { id?: string; status?: OrderStatus; isPaid?: boolean; existingItems?: PersistOrderItem[] } = {},
): Promise<PersistOrderInput> => {
  const customer = await resolveCustomer(input.customer, repository);
  const items = options.existingItems ?? (await buildSnapshotItems(input.items, repository));
  const subtotal = roundMoney(items.reduce((total, item) => total + item.subtotal, 0));
  const deliveryFee =
    input.deliveryType === 'envio'
      ? parseMoneySetting(await repository.getSetting('delivery_fee'))
      : 0;
  const discountAmount = roundMoney(subtotal * (input.discountPercent / 100));
  const total = roundMoney(subtotal - discountAmount + deliveryFee);

  return {
    id: options.id ?? randomUUID(),
    customerId: customer.id,
    deliveryDate: input.deliveryDate,
    deliveryTime: input.deliveryTime,
    deliveryType: input.deliveryType,
    cooked: input.cooked,
    notes: input.notes || null,
    discountPercent: input.discountPercent,
    deliveryFee,
    subtotal,
    total,
    status: options.status ?? 'confirmado',
    isPaid: options.isPaid ?? false,
    items,
  };
};

const toCreateOrderInput = (input: CreateOrderInput | UpdateOrderInput): CreateOrderInput => {
  if (
    !input.customer ||
    !input.deliveryDate ||
    !input.deliveryTime ||
    !input.deliveryType ||
    !input.items
  ) {
    throw new ApiError(400, 'Complete order data is required', 'ORDER_UPDATE_INCOMPLETE');
  }

  return {
    customer: input.customer,
    deliveryDate: input.deliveryDate,
    deliveryTime: input.deliveryTime,
    deliveryType: input.deliveryType,
    cooked: input.cooked ?? false,
    notes: input.notes,
    discountPercent: input.discountPercent ?? 0,
    deliveryFee: input.deliveryFee ?? 0,
    items: input.items,
  };
};

export const listOrders = (
  repository: OrderRepository,
  filters?: OrderFilters,
): Promise<OrderListItem[]> => repository.list(filters);

export const getOrder = async (id: string, repository: OrderRepository): Promise<OrderDetail> => {
  const order = await repository.getById(id);

  if (!order) {
    throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return order;
};

export const createOrder = async (
  input: CreateOrderInput,
  repository: OrderRepository,
): Promise<OrderDetail> => {
  const persistInput = await buildPersistInput(input, repository);
  return repository.createOrderWithItems(persistInput);
};

export const updateOrder = async (
  id: string,
  input: UpdateOrderInput,
  repository: OrderRepository,
): Promise<OrderDetail> => {
  const current = await getOrder(id, repository);
  const effectiveInput: CreateOrderInput = input.items
    ? toCreateOrderInput({
        customer: input.customer ?? { existingCustomerId: current.customer.id },
        deliveryDate: input.deliveryDate ?? current.deliveryDate,
        deliveryTime: input.deliveryTime ?? current.deliveryTime,
        deliveryType: input.deliveryType ?? current.deliveryType,
        cooked: input.cooked ?? current.cooked,
        notes: input.notes ?? current.notes ?? undefined,
        discountPercent: input.discountPercent ?? current.discountPercent,
        deliveryFee: input.deliveryFee ?? current.deliveryFee,
        items: input.items,
      })
    : toCreateOrderInput({
        customer: input.customer ?? { existingCustomerId: current.customer.id },
        deliveryDate: input.deliveryDate ?? current.deliveryDate,
        deliveryTime: input.deliveryTime ?? current.deliveryTime,
        deliveryType: input.deliveryType ?? current.deliveryType,
        cooked: input.cooked ?? current.cooked,
        notes: input.notes ?? current.notes ?? undefined,
        discountPercent: input.discountPercent ?? current.discountPercent,
        deliveryFee: input.deliveryFee ?? current.deliveryFee,
        items: current.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
      });

  const existingItems = input.items
    ? undefined
    : current.items.map((item) => ({
        ...item,
        id: item.id,
      }));
  const persistInput = await buildPersistInput(effectiveInput, repository, {
    id,
    status: input.status ?? current.status,
    isPaid: input.isPaid ?? current.isPaid,
    existingItems,
  });
  const updated = await repository.replaceOrder(id, persistInput);

  if (!updated) {
    throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return updated;
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  repository: OrderRepository,
): Promise<OrderDetail> => {
  const updated = await repository.updateStatus(id, status);

  if (!updated) {
    throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return updated;
};

export const updateOrderPayment = async (
  id: string,
  isPaid: boolean,
  repository: OrderRepository,
): Promise<OrderDetail> => {
  const updated = await repository.updatePayment(id, isPaid);

  if (!updated) {
    throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return updated;
};

export const deleteOrder = async (id: string, repository: OrderRepository): Promise<void> => {
  const deleted = await repository.delete(id);

  if (!deleted) {
    throw new ApiError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }
};
