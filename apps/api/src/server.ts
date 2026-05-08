import { createApp } from './app';
import { loadEnvFile } from './config/dotenv';
import { getEnv } from './config/env';
import { createDbClient } from './db';
import { createApiRouter } from './modules/routes';

loadEnvFile();

const env = getEnv();
const { db } = createDbClient(env.DATABASE_URL);
const apiRouter = createApiRouter({
  db,
  secrets: {
    accessSecret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
  },
  secureCookies: env.NODE_ENV === 'production',
});
const app = createApp({ allowedOrigin: env.ALLOWED_ORIGIN, apiRouter });

app.listen(env.PORT, () => {
  console.log(`Te Pinta API listening on port ${env.PORT}`);
});
