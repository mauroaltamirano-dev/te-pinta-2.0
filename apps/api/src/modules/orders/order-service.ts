import { randomUUID } from 'node:crypto';

import {
  calculateItemPrice,
  calculateOrderPromotion,
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
  phone: string | null;
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
  priceHalfDozen?: number;
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
  cookingFee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  isPaid: boolean;
  items: OrderItemDetail[];
  addons: OrderAddonDetail[];
};

export type OrderListItem = Omit<OrderDetail, 'addons'> & {
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
  pending: number;
  pendingVarieties: PendingVarietyTotal[];
};

export type PendingVarietyTotal = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
};

export type OrderListResult = {
  orders: OrderListItem[];
  pagination: OrderListPagination;
  stats: OrderListStats;
};

export type PersistOrderItem = Omit<OrderItemDetail, 'id'> & {
  id: string;
  priceUnit?: number;
  priceDozen?: number;
};
export type PersistOrderAddon = Omit<OrderAddonDetail, 'id'> & { id: string };

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
  cookingFee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  isPaid: boolean;
  items: PersistOrderItem[];
  addons: PersistOrderAddon[];
};

export type OrderRepository = {
  list(filters?: OrderFilters): Promise<OrderListResult>;
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
const normalizeOptionalText = (value: string | undefined): string | null => value?.trim() || null;

const parseMoneySetting = (value: string | null): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseNumberSetting = parseMoneySetting;

const addonDefinitions = [
  { addonId: 'yasgua_salsa', name: 'Yasgua salsa', settingKey: 'addon_yasgua_salsa_price' },
  {
    addonId: 'yasgua_cremosa',
    name: 'Yasgua cremosa',
    settingKey: 'addon_yasgua_cremosa_price',
  },
] as const;

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

  const normalizedPhone = normalizeOptionalText(input.newCustomer.phone);
  const existing = normalizedPhone ? await repository.findCustomerByPhone(normalizedPhone) : null;
  if (existing) {
    return existing;
  }

  return repository.createCustomer({
    id: randomUUID(),
    name: input.newCustomer.name,
    phone: normalizedPhone,
    address: normalizeOptionalText(input.newCustomer.address),
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
      priceHalfDozen: menuItem.priceHalfDozen,
    };
  });
};

const buildSnapshotAddons = async (
  addons: CreateOrderInput['addons'],
  repository: OrderRepository,
): Promise<PersistOrderAddon[]> => {
  const selectedAddons = addons ?? [];
  if (selectedAddons.length === 0) {
    return [];
  }

  return Promise.all(
    selectedAddons.map(async (addon) => {
      const definition = addonDefinitions.find((item) => item.addonId === addon.addonId);
      if (!definition) {
        throw new ApiError(404, 'Addon not found', 'ADDON_NOT_FOUND');
      }

      const unitPrice = parseMoneySetting(await repository.getSetting(definition.settingKey));
      return {
        id: randomUUID(),
        addonId: addon.addonId,
        name: definition.name,
        quantity: addon.quantity,
        unitPrice,
        subtotal: roundMoney(unitPrice * addon.quantity),
      };
    }),
  );
};

const buildPersistInput = async (
  input: CreateOrderInput,
  repository: OrderRepository,
  options: {
    id?: string;
    status?: OrderStatus;
    isPaid?: boolean;
    existingItems?: PersistOrderItem[];
    existingAddons?: PersistOrderAddon[];
  } = {},
): Promise<PersistOrderInput> => {
  const customer = await resolveCustomer(input.customer, repository);
  const items = options.existingItems ?? (await buildSnapshotItems(input.items, repository));
  const addons = options.existingAddons ?? (await buildSnapshotAddons(input.addons, repository));
  const [
    deliveryFeeSetting,
    bulkDozenThresholdSetting,
    bulkDiscountPercentSetting,
    combinedDozenQuantitySetting,
    combinedDozenPriceSetting,
    cookedOrderFeeSetting,
  ] = await Promise.all([
    repository.getSetting('delivery_fee'),
    repository.getSetting('promo_bulk_dozen_threshold'),
    repository.getSetting('promo_bulk_discount_percent'),
    repository.getSetting('promo_combined_dozen_quantity'),
    repository.getSetting('promo_combined_dozen_price'),
    repository.getSetting('cooked_order_fee'),
  ]);
  const deliveryFee = input.deliveryType === 'envio' ? parseMoneySetting(deliveryFeeSetting) : 0;
  const cookingFee = input.cooked ? parseMoneySetting(cookedOrderFeeSetting) : 0;
  const pricing = calculateOrderPromotion({
    items,
    addons,
    manualDiscountPercent: input.discountPercent,
    deliveryFee,
    cookingFee,
    promotions: {
      bulkDozenThreshold: parseNumberSetting(bulkDozenThresholdSetting) || undefined,
      bulkDiscountPercent: parseNumberSetting(bulkDiscountPercentSetting) || undefined,
      combinedDozenQuantity: parseNumberSetting(combinedDozenQuantitySetting) || undefined,
      combinedDozenPrice: parseMoneySetting(combinedDozenPriceSetting) || undefined,
    },
  });

  return {
    id: options.id ?? randomUUID(),
    customerId: customer.id,
    deliveryDate: input.deliveryDate,
    deliveryTime: input.deliveryTime,
    deliveryType: input.deliveryType,
    cooked: input.cooked,
    notes: input.notes || null,
    discountPercent: pricing.discountPercent,
    deliveryFee,
    cookingFee,
    subtotal: pricing.promoSubtotal,
    total: roundMoney(pricing.total),
    status: options.status ?? 'confirmado',
    isPaid: options.isPaid ?? false,
    items,
    addons,
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
    addons: input.addons ?? [],
  };
};

export const listOrders = (
  repository: OrderRepository,
  filters?: OrderFilters,
): Promise<OrderListResult> => repository.list(filters);

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
        addons:
          input.addons ?? current.addons.map(({ addonId, quantity }) => ({ addonId, quantity })),
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
        addons:
          input.addons ?? current.addons.map(({ addonId, quantity }) => ({ addonId, quantity })),
      });

  const existingItems = input.items
    ? undefined
    : current.items.map((item) => ({
        ...item,
        id: item.id,
      }));
  const existingAddons = input.addons
    ? undefined
    : current.addons.map((addon) => ({
        ...addon,
        id: addon.id,
      }));
  const persistInput = await buildPersistInput(effectiveInput, repository, {
    id,
    status: input.status ?? current.status,
    isPaid: input.isPaid ?? current.isPaid,
    existingItems,
    existingAddons,
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
