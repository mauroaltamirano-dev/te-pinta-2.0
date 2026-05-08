import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { getEnv } from '../config/env';
import * as schema from './schema';

export const createDbClient = (databaseUrl: string) => {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema });

  return { db, sql };
};

export const createDbClientFromEnv = () => createDbClient(getEnv().DATABASE_URL);
export { schema };
