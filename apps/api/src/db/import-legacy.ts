import postgres from 'postgres';

import { loadEnvFile } from '../config/dotenv';

const LEGACY_PREFIX = 'legacy';

type LegacyClient = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type LegacyProduct = {
  id: string;
  name: string;
  unit_price: number | string;
  half_dozen_price: number | string | null;
  dozen_price: number | string | null;
  direct_cost: number | string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type LegacyOrder = {
  id: string;
  client_id: string | null;
  customer_name_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_address_snapshot: string | null;
  status: string;
  channel: string;
  notes: string | null;
  subtotal_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  delivery_date: Date | string | null;
  payment_method: string;
  is_paid: boolean;
  delivery_shift: string | null;
};

type LegacyOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number | string;
  unit_sale_price_snapshot: number | string;
  line_subtotal: number | string;
};

type TargetCustomer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

type TargetMenuItem = {
  id: string;
  name: string;
  price_unit: number | string;
  price_half_dozen: number | string;
  price_dozen: number | string;
  is_active: boolean;
};

type ImportStats = {
  clientsRead: number;
  customersCreated: number;
  customersMatchedByPhone: number;
  customersReusedFromLegacyClient: number;
  snapshotCustomersCreated: number;
  productsRead: number;
  productsCreated: number;
  productsMatchedByName: number;
  ordersRead: number;
  ordersAlreadyImported: number;
  ordersCreated: number;
  orderItemsRead: number;
  orderItemsCreated: number;
  orderItemsSkippedForExistingOrders: number;
  nonIntegerQuantities: number;
};

const isExecuteMode = process.argv.includes('--execute');

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const normalizeText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizePhone = (value: string | null | undefined): string | null => {
  const phone = normalizeText(value);
  return phone ? phone.replace(/\s+/g, '') : null;
};

const nameKey = (value: string): string => value.trim().toLocaleLowerCase('es-AR');

const toMoney = (value: number | string | null | undefined, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
};

const moneyToDb = (value: number): string => value.toFixed(2);

const toDate = (value: Date | string | null | undefined): Date => {
  if (!value) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const toIsoDate = (value: Date | string | null | undefined, fallback: Date | string): string => {
  return toDate(value ?? fallback).toISOString().slice(0, 10);
};

const mapStatus = (status: string): 'confirmado' | 'preparado' | 'entregado' => {
  const normalized = status.trim().toLocaleLowerCase('es-AR');

  if (['delivered', 'completed', 'done', 'entregado'].includes(normalized)) {
    return 'entregado';
  }

  if (['prepared', 'ready', 'preparado'].includes(normalized)) {
    return 'preparado';
  }

  return 'confirmado';
};

const mapDeliveryTime = (shift: string | null): 'mediodia' | 'tarde' | 'noche' => {
  const normalized = normalizeText(shift)?.toLocaleLowerCase('es-AR');

  if (normalized === 'mediodia' || normalized === 'medio dia' || normalized === 'noon') {
    return 'mediodia';
  }

  if (normalized === 'tarde' || normalized === 'afternoon') {
    return 'tarde';
  }

  return 'noche';
};

const mapDeliveryType = (order: LegacyOrder, customerAddress: string | null): 'retiro' | 'envio' => {
  const notes = normalizeText(order.notes)?.toLocaleLowerCase('es-AR') ?? '';
  const hasAddress = Boolean(normalizeText(order.customer_address_snapshot) ?? customerAddress);

  if (hasAddress || notes.includes('envio') || notes.includes('envío') || notes.includes('delivery')) {
    return 'envio';
  }

  if (order.channel.trim().toLocaleLowerCase('es-AR') === 'local') {
    return 'retiro';
  }

  return 'retiro';
};

const mapCooked = (notes: string | null): boolean => {
  const normalized = normalizeText(notes)?.toLocaleLowerCase('es-AR') ?? '';
  return normalized.includes('cocinad') || normalized.includes('a punto');
};

const legacyId = (kind: string, id: string): string => `${LEGACY_PREFIX}_${kind}_${id}`;

const buildOrderNotes = (order: LegacyOrder): string => {
  const parts = [
    normalizeText(order.notes),
    `Importado desde sistema anterior`,
    `ID anterior: ${order.id}`,
    `Canal anterior: ${order.channel}`,
    `Pago anterior: ${order.payment_method}`,
    `Descuento anterior: $${moneyToDb(toMoney(order.discount_amount))}`,
  ].filter(Boolean);

  return parts.join('\n');
};

const main = async (): Promise<void> => {
  loadEnvFile();

  const legacyUrl = requireEnv('LEGACY_DATABASE_URL');
  const targetUrl = requireEnv('DATABASE_URL');
  const legacy = postgres(legacyUrl, { max: 1 });
  const target = postgres(targetUrl, { max: 1 });

  const stats: ImportStats = {
    clientsRead: 0,
    customersCreated: 0,
    customersMatchedByPhone: 0,
    customersReusedFromLegacyClient: 0,
    snapshotCustomersCreated: 0,
    productsRead: 0,
    productsCreated: 0,
    productsMatchedByName: 0,
    ordersRead: 0,
    ordersAlreadyImported: 0,
    ordersCreated: 0,
    orderItemsRead: 0,
    orderItemsCreated: 0,
    orderItemsSkippedForExistingOrders: 0,
    nonIntegerQuantities: 0,
  };

  try {
    const [legacyClients, legacyProducts, legacyOrders, legacyOrderItems] = await Promise.all([
      legacy<LegacyClient[]>`select * from clients order by created_at asc`,
      legacy<LegacyProduct[]>`select * from products order by created_at asc`,
      legacy<LegacyOrder[]>`select * from orders order by created_at asc`,
      legacy<LegacyOrderItem[]>`select * from order_items order by created_at asc`,
    ]);

    stats.clientsRead = legacyClients.length;
    stats.productsRead = legacyProducts.length;
    stats.ordersRead = legacyOrders.length;
    stats.orderItemsRead = legacyOrderItems.length;

    const existingCustomers = await target<TargetCustomer[]>`select id, name, phone, address from customers`;
    const existingMenuItems = await target<TargetMenuItem[]>`select id, name, price_unit, price_half_dozen, price_dozen, is_active from menu_items`;
    const existingLegacyOrders = await target<{ id: string }[]>`
      select id from orders where id like 'legacy_order_%'
    `;

    const customerIdByPhone = new Map<string, string>();
    const customerAddressById = new Map<string, string | null>();
    for (const customer of existingCustomers) {
      const phone = normalizePhone(customer.phone);
      if (phone) {
        customerIdByPhone.set(phone, customer.id);
      }
      customerAddressById.set(customer.id, normalizeText(customer.address));
    }

    const menuItemIdByName = new Map<string, string>();
    for (const item of existingMenuItems) {
      menuItemIdByName.set(nameKey(item.name), item.id);
    }

    const importedOrderIds = new Set(existingLegacyOrders.map((order) => order.id));
    const customerIdByLegacyClientId = new Map<string, string>();
    const menuItemIdByLegacyProductId = new Map<string, string>();

    const writeImport = async (sql: postgres.Sql | postgres.TransactionSql): Promise<void> => {
      for (const client of legacyClients) {
        const phone = normalizePhone(client.phone);
        const existingCustomerId = phone ? customerIdByPhone.get(phone) : undefined;

        if (existingCustomerId) {
          customerIdByLegacyClientId.set(client.id, existingCustomerId);
          stats.customersMatchedByPhone += 1;
          continue;
        }

        const id = legacyId('client', client.id);
        const address = normalizeText(client.address);
        customerIdByLegacyClientId.set(client.id, id);
        customerAddressById.set(id, address);
        if (phone) {
          customerIdByPhone.set(phone, id);
        }
        stats.customersCreated += 1;

        if (isExecuteMode) {
          await sql`
            insert into customers (id, name, phone, address, created_at, updated_at)
            values (
              ${id},
              ${normalizeText(client.name) ?? 'Cliente sin nombre'},
              ${phone},
              ${address},
              ${toDate(client.created_at)},
              ${toDate(client.updated_at)}
            )
            on conflict (id) do nothing
          `;
        }
      }

      for (const product of legacyProducts) {
        const existingMenuItemId = menuItemIdByName.get(nameKey(product.name));

        if (existingMenuItemId) {
          menuItemIdByLegacyProductId.set(product.id, existingMenuItemId);
          stats.productsMatchedByName += 1;
          continue;
        }

        const id = legacyId('product', product.id);
        const unitPrice = toMoney(product.unit_price);
        const halfDozenPrice = toMoney(product.half_dozen_price, unitPrice * 6);
        const dozenPrice = toMoney(product.dozen_price, unitPrice * 12);
        const costPerDozen = toMoney(product.direct_cost);

        menuItemIdByLegacyProductId.set(product.id, id);
        menuItemIdByName.set(nameKey(product.name), id);
        stats.productsCreated += 1;

        if (isExecuteMode) {
          await sql`
            insert into menu_items (
              id,
              name,
              price_unit,
              price_half_dozen,
              price_dozen,
              cost_per_dozen,
              is_active,
              created_at,
              updated_at
            )
            values (
              ${id},
              ${product.name.trim()},
              ${moneyToDb(unitPrice)},
              ${moneyToDb(halfDozenPrice)},
              ${moneyToDb(dozenPrice)},
              ${moneyToDb(costPerDozen)},
              ${product.is_active},
              ${toDate(product.created_at)},
              ${toDate(product.updated_at)}
            )
            on conflict (id) do nothing
          `;
        }
      }

      for (const order of legacyOrders) {
        const id = legacyId('order', order.id);
        if (importedOrderIds.has(id)) {
          stats.ordersAlreadyImported += 1;
          continue;
        }

        let customerId = order.client_id ? customerIdByLegacyClientId.get(order.client_id) : undefined;
        if (customerId) {
          stats.customersReusedFromLegacyClient += 1;
        }

        if (!customerId) {
          const snapshotPhone = normalizePhone(order.customer_phone_snapshot);
          const existingCustomerId = snapshotPhone ? customerIdByPhone.get(snapshotPhone) : undefined;
          customerId = existingCustomerId ?? legacyId('snapshot_client', order.id);

          if (!existingCustomerId) {
            const name =
              normalizeText(order.customer_name_snapshot) ?? `Cliente importado ${order.id.slice(0, 8)}`;
            const address = normalizeText(order.customer_address_snapshot);
            customerAddressById.set(customerId, address);
            if (snapshotPhone) {
              customerIdByPhone.set(snapshotPhone, customerId);
            }
            stats.snapshotCustomersCreated += 1;

            if (isExecuteMode) {
              await sql`
                insert into customers (id, name, phone, address, created_at, updated_at)
                values (${customerId}, ${name}, ${snapshotPhone}, ${address}, ${toDate(order.created_at)}, ${toDate(order.updated_at)})
                on conflict (id) do nothing
              `;
            }
          }
        }

        const subtotal = toMoney(order.subtotal_amount);
        const discountAmount = toMoney(order.discount_amount);
        const discountPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;
        const customerAddress = customerAddressById.get(customerId) ?? null;

        stats.ordersCreated += 1;

        if (isExecuteMode) {
          await sql`
            insert into orders (
              id,
              customer_id,
              delivery_date,
              delivery_time,
              delivery_type,
              cooked,
              notes,
              discount_percent,
              delivery_fee,
              subtotal,
              total,
              status,
              created_at,
              updated_at,
              is_paid
            )
            values (
              ${id},
              ${customerId},
              ${toIsoDate(order.delivery_date, order.created_at)},
              ${mapDeliveryTime(order.delivery_shift)},
              ${mapDeliveryType(order, customerAddress)},
              ${mapCooked(order.notes)},
              ${buildOrderNotes(order)},
              ${moneyToDb(discountPercent)},
              ${moneyToDb(0)},
              ${moneyToDb(subtotal)},
              ${moneyToDb(toMoney(order.total_amount))},
              ${mapStatus(order.status)},
              ${toDate(order.created_at)},
              ${toDate(order.updated_at)},
              ${order.is_paid}
            )
            on conflict (id) do nothing
          `;
        }
      }

      for (const item of legacyOrderItems) {
        const orderId = legacyId('order', item.order_id);
        if (importedOrderIds.has(orderId)) {
          stats.orderItemsSkippedForExistingOrders += 1;
          continue;
        }

        let menuItemId = menuItemIdByLegacyProductId.get(item.product_id);
        if (!menuItemId) {
          menuItemId = legacyId('missing_product', item.product_id);
          menuItemIdByLegacyProductId.set(item.product_id, menuItemId);

          if (isExecuteMode) {
            const unitPrice = toMoney(item.unit_sale_price_snapshot);
            await sql`
              insert into menu_items (
                id,
                name,
                price_unit,
                price_half_dozen,
                price_dozen,
                cost_per_dozen,
                is_active
              )
              values (
                ${menuItemId},
                ${item.product_name_snapshot.trim()},
                ${moneyToDb(unitPrice)},
                ${moneyToDb(unitPrice * 6)},
                ${moneyToDb(unitPrice * 12)},
                ${moneyToDb(0)},
                ${false}
              )
              on conflict (id) do nothing
            `;
          }
        }

        const rawQuantity = Number(item.quantity);
        const quantity = Number.isFinite(rawQuantity) ? Math.max(1, Math.round(rawQuantity)) : 1;
        if (quantity !== rawQuantity) {
          stats.nonIntegerQuantities += 1;
        }

        const subtotal = toMoney(item.line_subtotal);
        stats.orderItemsCreated += 1;

        if (isExecuteMode) {
          await sql`
            insert into order_items (id, order_id, menu_item_id, quantity, unit_price, subtotal)
            values (
              ${legacyId('item', item.id)},
              ${orderId},
              ${menuItemId},
              ${quantity},
              ${moneyToDb(subtotal)},
              ${moneyToDb(subtotal)}
            )
            on conflict (id) do nothing
          `;
        }
      }
    };

    if (isExecuteMode) {
      await target.begin(writeImport);
    } else {
      await writeImport(target);
    }

    console.log(isExecuteMode ? 'Legacy import completed.' : 'Legacy import dry-run completed. No data was written.');
    console.table(stats);

    if (!isExecuteMode) {
      console.log('Run again with --execute to write the data.');
    }
  } finally {
    await Promise.all([legacy.end(), target.end()]);
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
