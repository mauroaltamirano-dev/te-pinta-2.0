import { readFile } from 'node:fs/promises';
import path from 'node:path';

import postgres from 'postgres';

import { loadEnvFile } from '../config/dotenv';

type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  order_count: number | string;
  total_spent: number | string | null;
};

type MergeMapping = {
  duplicateCustomerId: string;
  canonicalCustomerId: string;
  note: string | null;
  lineNumber: number;
};

type MergeResult = {
  mapping: MergeMapping;
  duplicate: CustomerSummary;
  canonical: CustomerSummary;
  movedOrders: number;
  deletedDuplicate: boolean;
};

const isExecuteMode = process.argv.includes('--execute');
const shouldDeleteDuplicates = process.argv.includes('--delete-duplicates');

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

const parseMappingsCsv = async (filePath: string): Promise<MergeMapping[]> => {
  const content = await readFile(filePath, 'utf8');
  const rawLines = content.split(/\r?\n/);
  const lines = rawLines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim() && !line.trim().startsWith('#'));

  if (lines.length === 0) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error(`CSV is empty: ${filePath}`);
  }

  const headers = parseCsvLine(headerLine.line).map(normalizeHeader);
  const mappings = lines.slice(1).map(({ line, lineNumber }) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const duplicateCustomerId = getCell(row, [
      'duplicate_customer_id',
      'source_customer_id',
      'cliente_duplicado_id',
      'cliente_origen_id',
    ]);
    const canonicalCustomerId = getCell(row, [
      'canonical_customer_id',
      'target_customer_id',
      'cliente_principal_id',
      'cliente_destino_id',
    ]);
    const note = getCell(row, ['note', 'notes', 'nota', 'comentario']) || null;

    if (!duplicateCustomerId || !canonicalCustomerId) {
      throw new Error(
        `CSV line ${lineNumber} must include duplicate_customer_id and canonical_customer_id`,
      );
    }

    if (duplicateCustomerId === canonicalCustomerId) {
      throw new Error(`CSV line ${lineNumber} maps a customer to itself: ${duplicateCustomerId}`);
    }

    return { duplicateCustomerId, canonicalCustomerId, note, lineNumber };
  });

  const duplicateIds = new Set<string>();
  for (const mapping of mappings) {
    if (duplicateIds.has(mapping.duplicateCustomerId)) {
      throw new Error(`Duplicate source customer in CSV: ${mapping.duplicateCustomerId}`);
    }
    duplicateIds.add(mapping.duplicateCustomerId);
  }

  return mappings;
};

const toNumber = (value: number | string | null): number => Number(value ?? 0);

const printCustomerSearch = async (sql: postgres.Sql, query: string): Promise<void> => {
  const pattern = `%${query}%`;
  const rows = await sql<CustomerSummary[]>`
    select
      c.id,
      c.name,
      c.phone,
      c.address,
      count(o.id)::int as order_count,
      coalesce(sum(o.total), 0) as total_spent
    from customers c
    left join orders o on o.customer_id = c.id
    where
      c.name ilike ${pattern}
      or coalesce(c.phone, '') ilike ${pattern}
      or coalesce(c.address, '') ilike ${pattern}
    group by c.id, c.name, c.phone, c.address
    order by c.name asc, count(o.id) desc
    limit 50
  `;

  if (rows.length === 0) {
    console.log(`No customers found for: ${query}`);
    return;
  }

  console.table(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone ?? '',
      address: row.address ?? '',
      orders: toNumber(row.order_count),
      total: toNumber(row.total_spent),
    })),
  );
};

const getCustomerSummary = async (
  sql: postgres.Sql | postgres.TransactionSql,
  customerId: string,
): Promise<CustomerSummary | null> => {
  const [customer] = await sql<CustomerSummary[]>`
    select
      c.id,
      c.name,
      c.phone,
      c.address,
      count(o.id)::int as order_count,
      coalesce(sum(o.total), 0) as total_spent
    from customers c
    left join orders o on o.customer_id = c.id
    where c.id = ${customerId}
    group by c.id, c.name, c.phone, c.address
  `;

  return customer ?? null;
};

const runMerge = async (
  sql: postgres.Sql | postgres.TransactionSql,
  mappings: MergeMapping[],
): Promise<MergeResult[]> => {
  const results: MergeResult[] = [];

  for (const mapping of mappings) {
    const duplicate = await getCustomerSummary(sql, mapping.duplicateCustomerId);
    const canonical = await getCustomerSummary(sql, mapping.canonicalCustomerId);

    if (!duplicate) {
      throw new Error(
        `CSV line ${mapping.lineNumber}: duplicate customer not found: ${mapping.duplicateCustomerId}`,
      );
    }

    if (!canonical) {
      throw new Error(
        `CSV line ${mapping.lineNumber}: canonical customer not found: ${mapping.canonicalCustomerId}`,
      );
    }

    const duplicateOrderCount = toNumber(duplicate.order_count);
    let movedOrders = duplicateOrderCount;
    let deletedDuplicate = false;

    if (isExecuteMode) {
      const updateResult = await sql`
        update orders
        set customer_id = ${mapping.canonicalCustomerId}
        where customer_id = ${mapping.duplicateCustomerId}
      `;
      movedOrders = updateResult.count;

      if (shouldDeleteDuplicates) {
        const deleteResult = await sql`
          delete from customers
          where id = ${mapping.duplicateCustomerId}
          and not exists (select 1 from orders where customer_id = ${mapping.duplicateCustomerId})
        `;
        deletedDuplicate = deleteResult.count > 0;
      }
    }

    results.push({ mapping, duplicate, canonical, movedOrders, deletedDuplicate });
  }

  return results;
};

const printMergeResults = (results: MergeResult[]): void => {
  console.table(
    results.map((result) => ({
      line: result.mapping.lineNumber,
      from_id: result.duplicate.id,
      from_name: result.duplicate.name,
      from_phone: result.duplicate.phone ?? '',
      from_address: result.duplicate.address ?? '',
      from_orders: toNumber(result.duplicate.order_count),
      to_id: result.canonical.id,
      to_name: result.canonical.name,
      to_phone: result.canonical.phone ?? '',
      to_address: result.canonical.address ?? '',
      moved_orders: result.movedOrders,
      deleted_duplicate: result.deletedDuplicate,
      note: result.mapping.note ?? '',
    })),
  );
};

const main = async (): Promise<void> => {
  loadEnvFile();
  const databaseUrl = requireEnv('DATABASE_URL');
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const findQuery = getArgValue('--find');
    if (findQuery) {
      await printCustomerSearch(sql, findQuery);
      return;
    }

    const file = getArgValue('--file') ?? 'customer-merge-map.csv';
    const filePath = path.resolve(process.cwd(), file);
    const mappings = await parseMappingsCsv(filePath);

    console.log(`Customer merge ${isExecuteMode ? 'EXECUTE' : 'DRY-RUN'} mode`);
    console.log(`CSV: ${filePath}`);
    console.log(`Rows: ${mappings.length}`);
    if (shouldDeleteDuplicates) {
      console.log('Duplicate customers will be deleted only after their orders are moved.');
    } else {
      console.log('Duplicate customers will NOT be deleted. Use --delete-duplicates if desired.');
    }

    const results = isExecuteMode
      ? await sql.begin((transaction) => runMerge(transaction, mappings))
      : await runMerge(sql, mappings);

    printMergeResults(results);

    const totalMovedOrders = results.reduce((total, result) => total + result.movedOrders, 0);
    console.log(
      isExecuteMode
        ? `Done. Moved ${totalMovedOrders} order(s).`
        : `Dry-run only. Would move ${totalMovedOrders} order(s). Run again with --execute to apply.`,
    );
  } finally {
    await sql.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
