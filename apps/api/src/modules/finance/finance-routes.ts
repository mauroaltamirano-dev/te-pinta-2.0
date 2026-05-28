import { Router, type Router as ExpressRouter } from 'express';

import {
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  createFinanceStockAdjustmentSchema,
  financeCostingPreviewOrderSchema,
  financeProductFiltersSchema,
  financeStockFiltersSchema,
} from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import {
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  listFinanceProducts,
  listFinanceStock,
  previewFinanceOrderCost,
  type FinanceRepository,
} from './finance-service';

export type FinanceRouterOptions = {
  repository: FinanceRepository;
  secrets: JwtSecrets;
};

export const createFinanceRouter = ({
  repository,
  secrets,
}: FinanceRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get(
    '/products',
    validate({ query: financeProductFiltersSchema }),
    async (req, res, next) => {
      try {
        const filters = financeProductFiltersSchema.parse(req.query);
        const products = await listFinanceProducts(repository, filters);
        res.json({ products });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/products',
    validate({ body: createFinanceProductSchema }),
    async (req, res, next) => {
      try {
        const product = await createFinanceProduct(req.body, repository);
        res.status(201).json({ product });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/purchases',
    validate({ body: createFinancePurchaseSchema }),
    async (req, res, next) => {
      try {
        const purchase = await createFinancePurchase(req.body, repository);
        res.status(201).json({ purchase });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/stock', validate({ query: financeStockFiltersSchema }), async (req, res, next) => {
    try {
      const filters = financeStockFiltersSchema.parse(req.query);
      const stock = await listFinanceStock(repository, filters);
      res.json({ stock });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/stock/adjustments',
    validate({ body: createFinanceStockAdjustmentSchema }),
    async (req, res, next) => {
      try {
        const movement = await createFinanceStockAdjustment(req.body, repository);
        res.status(201).json({ movement });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/costing/preview-order',
    validate({ body: financeCostingPreviewOrderSchema }),
    async (req, res, next) => {
      try {
        const breakdown = await previewFinanceOrderCost(req.body, repository);
        res.json({ breakdown });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
