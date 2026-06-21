import path from 'node:path';

import dotenv from 'dotenv';

export const apiEnvPath = path.resolve(process.cwd(), '.env');

export const loadEnvFile = () => {
  dotenv.config({ path: apiEnvPath });
};
