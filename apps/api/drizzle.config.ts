import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
