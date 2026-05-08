import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

export const apiEnvPath = fileURLToPath(new URL('../../.env', import.meta.url));

export const loadEnvFile = () => {
  dotenv.config({ path: apiEnvPath });
};
