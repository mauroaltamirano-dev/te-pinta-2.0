import { readFile } from 'node:fs/promises';
import path from 'node:path';

import postgres from 'postgres';

import { loadEnvFile } from '../config/dotenv';

type ManualHistoryRow = {
  lineNumber: number;
  targetCustomerId: string;
  sourceDb: 'old_neon' | 'new_neon';
  sourceCustomerKey: string;
  note: string | null;
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

type NewOrder = {
  id: string;
  customer_id: string;
  delivery_date: Date | string;
  delivery_time: 'mediodia' | 'tarde' | 'noche';
  delivery_type: 'retiro' | 'envio';
  cooked: boolean;
  notes: string | null;
  discount_percent: number | string;
  delivery_fee: number | string;
  subtotal: number | string;
  total: number | string;
  status: 'confirmado' | 'preparado' | 'entregado';
  created_at: Date | string;
  updated_at: Date | string;
  is_paid: boolean;
};

type NewOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number | string;
  unit_price: number | string;
  subtotal: number | string;
};

type MenuItem = {
  id: string;
  name: string;
  price_unit: number | string;
  price_half_dozen: number | string;
  price_dozen: number | string;
  cost_per_dozen: number | string;
  is_active: boolean;
};

type ImportStats = {
  rowsRead: number;
  rowsMapped: number;
  rowsSkippedWithoutTarget: number;
  targetCustomersMissing: number;
  sourceOrdersFound: number;
  existingOrdersAlreadyOnTarget: number;
  existingOrdersMovedToTarget: number;
  ordersImported: number;
  orderItemsImported: number;
  menuItemsCreated: number;
  sourceCustomersDeleted: number;
};

const isExecuteMode = process.argv.includes('--execute');
const shouldDeleteSourceCustomers = process.argv.includes('--delete-source-customers');

const getArgValue = (name: string): string | null => {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (isQuoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (char === ',' && !isQuoted) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
};

const normalizeHeader = (value: string): string => value.trim().toLocaleLowerCase('es-AR');

const getCell = (row: Record<string, string>, names: string[]): string => {
  for (const name of names) {
    const value = row[name]?.trim();
    if (value) return value;
  }
  return '';
};

const parseMapCsv = async (filePath: string): Promise<ManualHistoryRow[]> => {
  const content = await readFile(filePath, 'utf8');
  const rawLines = content.split(/\r?\n/);
  const lines = rawLines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim() && !line.trim().startsWith('#'));

  if (lines.length === 0) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const [headerLine, ...dataLines] = lines;
  if (!headerLine) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const headers = parseCsvLine(headerLine.line).map(normalizeHeader);
  return dataLines.map(({ line, lineNumber }) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const sourceDb = getCell(row, ['source_db', 'origen_db']);
    const sourceCustomerKey = getCell(row, ['source_customer_key', 'legacy_customer_key', 'origen_cliente_key']);
    const targetCustomerId = getCell(row, [
      'target_customer_id',
      'canonical_customer_id',
      'cliente_destino_id',
    ]);
    const note = getCell(row, ['decision_note', 'note', 'notes', 'nota', 'comentario']) || null;

    if (sourceDb !== 'old_neon' && sourceDb !== 'new_neon') {
      throw new Error(`CSV line ${lineNumber} has invalid source_db: ${sourceDb}`);
    }

    if (!sourceCustomerKey) {
      throw new Error(`CSV line ${lineNumber} must include source_customer_key`);
    }

    return {
      lineNumber,
      targetCustomerId,
      sourceDb,
      sourceCustomerKey,
      note,
    };
  });
};

const normalizeText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const nameKey = (value: string): string => value.trim().toLocaleLowerCase('es-AR');

const toMoney = (value: number | string | null | undefined, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
};

const moneyToDb = (value: number): string => value.toFixed(2);

const toDate = (value: Date | string | null | undefined): Date => {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const toIsoDate = (value: Date | string | null | undefined, fallback: Date | string): string =>
  toDate(value ?? fallback).toISOString().slice(0, 10);

const legacyId = (kind: string, id: string): string => `legacy_${kind}_${id}`;

const mapStatus = (status: string): 'confirmado' | 'preparado' | 'entregado' => {
  const normalized = status.trim().toLocaleLowerCase('es-AR');
  if (['delivered', 'completed', 'done', 'entregado'].includes(normalized)) return 'entregado';
  if (['prepared', 'ready', 'preparado'].includes(normalized)) return 'preparado';
  return 'confirmado';
};

const mapDeliveryTime = (shift: string | null): 'mediodia' | 'tarde' | 'noche' => {
  const normalized = normalizeText(shift)?.toLocaleLowerCase('es-AR');
  if (normalized === 'mediodia' || normalized === 'medio dia' || normalized === 'noon') {
    return 'mediodia';
  }
  if (normalized === 'tarde' || normalized === 'afternoon') return 'tarde';
  return 'noche';
};

const mapDeliveryType = (order: LegacyOrder): 'retiro' | 'envio' => {
  const notes = normalizeText(order.notes)?.toLocaleLowerCase('es-AR') ?? '';
  const hasAddress = Boolean(normalizeText(order.customer_address_snapshot));
  if (hasAddress || notes.includes('envio') || notes.includes('envío') || notes.includes('delivery')) {
    return 'envio';
  }
  if (order.channel.trim().toLocaleLowerCase('es-AR') === 'local') return 'retiro';
  return 'retiro';
};

const mapCooked = (notes: string | null): boolean => {
  const normalized = normalizeText(notes)?.toLocaleLowerCase('es-AR') ?? '';
  return normalized.includes('cocinad') || normalized.includes('a punto');
};

const buildLegacyOrderNotes = (order: LegacyOrder): string => {
  const parts = [
    normalizeText(order.notes),
    'Importado desde sistema anterior',
    `ID anterior: ${order.id}`,
    `Canal anterior: ${order.channel}`,
    `Pago anterior: ${order.payment_method}`,
    `Descuento anterior: $${moneyToDb(toMoney(order.discount_amount))}`,
  ].filter(Boolean);
  return parts.join('\n');
};

const getOldLegacyOrders = async (
  oldNeon: postgres.Sql,
  sourceCustomerKey: string,
): Promise<LegacyOrder[]> => {
  if (sourceCustomerKey.startsWith('client:')) {
    const clientId = sourceCustomerKey.slice('client:'.length);
    return oldNeon<LegacyOrder[]>`
      select * from orders where client_id = ${clientId} order by created_at asc
    `;
  }

  if (sourceCustomerKey.startsWith('snapshot:')) {
    const orderId = sourceCustomerKey.slice('snapshot:'.length);
    return oldNeon<LegacyOrder[]>`
      select * from orders where id = ${orderId} order by created_at asc
    `;
  }

  throw new Error(`Unsupported old_neon source_customer_key: ${sourceCustomerKey}`);
};

const ensureLegacyMenuItem = async (
  sql: postgres.Sql | postgres.TransactionSql,
  menuItemIdByName: Map<string, string>,
  item: LegacyOrderItem,
  stats: ImportStats,
): Promise<string> => {
  const existingId = menuItemIdByName.get(nameKey(item.product_name_snapshot));
  if (existingId) return existingId;

  const menuItemId = legacyId('missing_product', item.product_id);
  menuItemIdByName.set(nameKey(item.product_name_snapshot), menuItemId);
  stats.menuItemsCreated += 1;

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

  return menuItemId;
};

const ensureNewMenuItem = async (
  sql: postgres.Sql | postgres.TransactionSql,
  menuItem: MenuItem,
  stats: ImportStats,
): Promise<void> => {
  stats.menuItemsCreated += 1;
  if (!isExecuteMode) return;

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
      ${menuItem.id},
      ${menuItem.name},
      ${moneyToDb(toMoney(menuItem.price_unit))},
      ${moneyToDb(toMoney(menuItem.price_half_dozen))},
      ${moneyToDb(toMoney(menuItem.price_dozen))},
      ${moneyToDb(toMoney(menuItem.cost_per_dozen))},
      ${menuItem.is_active},
      now(),
      now()
    )
    on conflict (id) do nothing
  `;
};

const getExistingOrderCustomer = async (
  sql: postgres.Sql | postgres.TransactionSql,
  orderId: string,
): Promise<string | null> => {
  const [order] = await sql<{ customer_id: string }[]>`
    select customer_id from orders where id = ${orderId}
  `;
  return order?.customer_id ?? null;
};

const moveExistingOrder = async (
  sql: postgres.Sql | postgres.TransactionSql,
  orderId: string,
  targetCustomerId: string,
  stats: ImportStats,
): Promise<boolean> => {
  const currentCustomerId = await getExistingOrderCustomer(sql, orderId);
  if (!currentCustomerId) return false;

  if (currentCustomerId === targetCustomerId) {
    stats.existingOrdersAlreadyOnTarget += 1;
    return true;
  }

  stats.existingOrdersMovedToTarget += 1;
  if (isExecuteMode) {
    await sql`
      update orders
      set customer_id = ${targetCustomerId},
          updated_at = now()
      where id = ${orderId}
    `;
  }
  return true;
};

const importOldOrder = async (
  sql: postgres.Sql | postgres.TransactionSql,
  oldNeon: postgres.Sql,
  menuItemIdByName: Map<string, string>,
  order: LegacyOrder,
  targetCustomerId: string,
  stats: ImportStats,
): Promise<void> => {
  const orderId = legacyId('order', order.id);
  if (await moveExistingOrder(sql, orderId, targetCustomerId, stats)) return;

  stats.ordersImported += 1;
  if (isExecuteMode) {
    const subtotal = toMoney(order.subtotal_amount);
    const discountAmount = toMoney(order.discount_amount);
    const discountPercent = subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 100 : 0;

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
        ${orderId},
        ${targetCustomerId},
        ${toIsoDate(order.delivery_date, order.created_at)},
        ${mapDeliveryTime(order.delivery_shift)},
        ${mapDeliveryType(order)},
        ${mapCooked(order.notes)},
        ${buildLegacyOrderNotes(order)},
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

  const items = await oldNeon<LegacyOrderItem[]>`
    select * from order_items where order_id = ${order.id} order by created_at asc
  `;

  for (const item of items) {
    const menuItemId = await ensureLegacyMenuItem(sql, menuItemIdByName, item, stats);
    const rawQuantity = Number(item.quantity);
    const quantity = Number.isFinite(rawQuantity) ? Math.max(1, Math.round(rawQuantity)) : 1;
    const subtotal = toMoney(item.line_subtotal);
    stats.orderItemsImported += 1;

    if (isExecuteMode) {
      await sql`
        insert into order_items (id, order_id, menu_item_id, quantity, unit_price, subtotal)
        values (
          ${legacyId('item', item.id)},
          ${orderId},
          ${menuItemId},
          ${quantity},
          ${moneyToDb(toMoney(item.unit_sale_price_snapshot, subtotal))},
          ${moneyToDb(subtotal)}
        )
        on conflict (id) do nothing
      `;
    }
  }
};

const importNewOrder = async (
  sql: postgres.Sql | postgres.TransactionSql,
  newNeon: postgres.Sql,
  order: NewOrder,
  targetCustomerId: string,
  stats: ImportStats,
): Promise<void> => {
  if (await moveExistingOrder(sql, order.id, targetCustomerId, stats)) return;

  stats.ordersImported += 1;
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
        ${order.id},
        ${targetCustomerId},
        ${toIsoDate(order.delivery_date, order.created_at)},
        ${order.delivery_time},
        ${order.delivery_type},
        ${order.cooked},
        ${order.notes},
        ${moneyToDb(toMoney(order.discount_percent))},
        ${moneyToDb(toMoney(order.delivery_fee))},
        ${moneyToDb(toMoney(order.subtotal))},
        ${moneyToDb(toMoney(order.total))},
        ${order.status},
        ${toDate(order.created_at)},
        ${toDate(order.updated_at)},
        ${order.is_paid}
      )
      on conflict (id) do nothing
    `;
  }

  const items = await newNeon<NewOrderItem[]>`
    select * from order_items where order_id = ${order.id}
  `;

  for (const item of items) {
    const [targetMenuItem] = await sql<{ id: string }[]>`
      select id from menu_items where id = ${item.menu_item_id}
    `;

    if (!targetMenuItem) {
      const [sourceMenuItem] = await newNeon<MenuItem[]>`
        select * from menu_items where id = ${item.menu_item_id}
      `;
      if (!sourceMenuItem) {
        throw new Error(`Missing menu item ${item.menu_item_id} for new_neon order ${order.id}`);
      }
      await ensureNewMenuItem(sql, sourceMenuItem, stats);
    }

    stats.orderItemsImported += 1;
    if (isExecuteMode) {
      await sql`
        insert into order_items (id, order_id, menu_item_id, quantity, unit_price, subtotal)
        values (
          ${item.id},
          ${order.id},
          ${item.menu_item_id},
          ${Math.max(1, Math.round(Number(item.quantity)))},
          ${moneyToDb(toMoney(item.unit_price))},
          ${moneyToDb(toMoney(item.subtotal))}
        )
        on conflict (id) do nothing
      `;
    }
  }
};

const deleteEmptySourceCustomers = async (
  sql: postgres.Sql | postgres.TransactionSql,
  row: ManualHistoryRow,
  legacyOrders: LegacyOrder[],
  stats: ImportStats,
): Promise<void> => {
  if (!shouldDeleteSourceCustomers) return;

  const candidateIds =
    row.sourceDb === 'old_neon'
      ? [
          row.sourceCustomerKey.startsWith('client:')
            ? legacyId('client', row.sourceCustomerKey.slice('client:'.length))
            : null,
          ...legacyOrders.map((order) => legacyId('snapshot_client', order.id)),
        ].filter((value): value is string => Boolean(value))
      : [row.sourceCustomerKey];

  for (const customerId of candidateIds) {
    const deleteResult = isExecuteMode
      ? await sql`
          delete from customers
          where id = ${customerId}
            and id <> ${row.targetCustomerId}
            and not exists (select 1 from orders where customer_id = ${customerId})
        `
      : { count: 1 };

    stats.sourceCustomersDeleted += deleteResult.count;
  }
};

const main = async (): Promise<void> => {
  loadEnvFile();

  const file = getArgValue('--file') ?? 'customer-history-map.csv';
  const filePath = path.resolve(process.cwd(), file);
  const rows = await parseMapCsv(filePath);

  const targetUrl = requireEnv('DATABASE_URL');
  const oldNeonUrl = requireEnv('OLD_NEON_DATABASE_URL');
  const newNeonUrl = requireEnv('NEW_NEON_DATABASE_URL');

  const target = postgres(targetUrl, { max: 1 });
  const oldNeon = postgres(oldNeonUrl, { max: 1 });
  const newNeon = postgres(newNeonUrl, { max: 1 });

  const stats: ImportStats = {
    rowsRead: rows.length,
    rowsMapped: 0,
    rowsSkippedWithoutTarget: 0,
    targetCustomersMissing: 0,
    sourceOrdersFound: 0,
    existingOrdersAlreadyOnTarget: 0,
    existingOrdersMovedToTarget: 0,
    ordersImported: 0,
    orderItemsImported: 0,
    menuItemsCreated: 0,
    sourceCustomersDeleted: 0,
  };

  try {
    const writeImport = async (sql: postgres.Sql | postgres.TransactionSql): Promise<void> => {
      const menuItems = await sql<MenuItem[]>`
        select id, name, price_unit, price_half_dozen, price_dozen, cost_per_dozen, is_active
        from menu_items
      `;
      const menuItemIdByName = new Map(menuItems.map((item) => [nameKey(item.name), item.id]));

      for (const row of rows) {
        if (!row.targetCustomerId) {
          stats.rowsSkippedWithoutTarget += 1;
          continue;
        }

        const [targetCustomer] = await sql<{ id: string }[]>`
          select id from customers where id = ${row.targetCustomerId}
        `;
        if (!targetCustomer) {
          stats.targetCustomersMissing += 1;
          throw new Error(
            `CSV line ${row.lineNumber}: target customer not found: ${row.targetCustomerId}`,
          );
        }

        stats.rowsMapped += 1;

        if (row.sourceDb === 'old_neon') {
          const orders = await getOldLegacyOrders(oldNeon, row.sourceCustomerKey);
          stats.sourceOrdersFound += orders.length;
          for (const order of orders) {
            await importOldOrder(sql, oldNeon, menuItemIdByName, order, row.targetCustomerId, stats);
          }
          await deleteEmptySourceCustomers(sql, row, orders, stats);
          continue;
        }

        const orders = await newNeon<NewOrder[]>`
          select * from orders where customer_id = ${row.sourceCustomerKey} order by created_at asc
        `;
        stats.sourceOrdersFound += orders.length;
        for (const order of orders) {
          await importNewOrder(sql, newNeon, order, row.targetCustomerId, stats);
        }
        await deleteEmptySourceCustomers(sql, row, [], stats);
      }
    };

    if (isExecuteMode) {
      await target.begin(writeImport);
    } else {
      await writeImport(target);
    }

    console.log(
      isExecuteMode
        ? 'Manual history import completed.'
        : 'Manual history import dry-run completed. No data was written.',
    );
    console.table(stats);
    if (shouldDeleteSourceCustomers) {
      console.log('Empty source customers are deleted only when --execute is also used.');
    }
    if (!isExecuteMode) {
      console.log('Run again with --execute to write the data.');
    }
  } finally {
    await Promise.all([target.end(), oldNeon.end(), newNeon.end()]);
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
