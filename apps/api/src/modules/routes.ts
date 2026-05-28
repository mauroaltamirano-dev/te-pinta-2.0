import { Router, type Router as ExpressRouter } from 'express';

import type { createDbClient } from '../db/index';
import { createAdminUserRepository, createAuthRouter, type JwtSecrets } from './auth';
import { createCustomerRepository, createCustomerRouter } from './customers';
import { createDashboardRepository, createDashboardRouter } from './dashboard';
import { createFinanceRepository, createFinanceRouter } from './finance';
import { createIngredientRepository, createIngredientRouter } from './ingredients';
import { createMenuItemRepository, createMenuRouter } from './menu';
import { createOrderRepository, createOrderRouter } from './orders';
import { createSettingsRepository, createSettingsRouter } from './settings';

type DbClient = ReturnType<typeof createDbClient>['db'];

export type ApiRouterOptions = {
  db: DbClient;
  secrets: JwtSecrets;
  secureCookies?: boolean;
};

export const createApiRouter = ({
  db,
  secrets,
  secureCookies,
}: ApiRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(
    '/auth',
    createAuthRouter({ repository: createAdminUserRepository(db), secrets, secureCookies }),
  );
  router.use(
    '/menu-items',
    createMenuRouter({ repository: createMenuItemRepository(db), secrets }),
  );
  router.use(
    '/customers',
    createCustomerRouter({ repository: createCustomerRepository(db), secrets }),
  );
  router.use(
    '/ingredients',
    createIngredientRouter({ repository: createIngredientRepository(db), secrets }),
  );
  router.use(
    '/settings',
    createSettingsRouter({ repository: createSettingsRepository(db), secrets }),
  );
  router.use('/orders', createOrderRouter({ repository: createOrderRepository(db), secrets }));
  router.use(
    '/dashboard',
    createDashboardRouter({ repository: createDashboardRepository(db), secrets }),
  );
  router.use('/finance', createFinanceRouter({ repository: createFinanceRepository(db), secrets }));

  return router;
};
