import { Router, type Router as ExpressRouter } from 'express';

import {
  cancelFinancePurchaseSchema,
  createFinanceProductSchema,
  createFinancePurchaseSchema,
  createFinanceBaseCostRuleSchema,
  createFinanceStockAdjustmentSchema,
  financeCostingPreviewOrderSchema,
  financeProductFiltersSchema,
  financePurchaseFiltersSchema,
  financeStockFiltersSchema,
  updateFinanceBaseCostRuleSchema,
  updateFinanceRecipeSchema,
} from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { idParamsSchema } from '../route-schemas';
import type { JwtSecrets } from '../auth/jwt';
import {
  createFinanceBaseCostRule,
  createFinanceProduct,
  createFinancePurchase,
  createFinanceStockAdjustment,
  cancelFinancePurchase,
  deleteFinanceBaseCostRule,
  getFinanceRecipe,
  getFinancePurchase,
  listFinanceBaseCostRules,
  listFinanceProducts,
  listFinancePurchases,
  listFinanceRecipes,
  listFinanceStock,
  previewFinanceOrderCost,
  updateFinanceBaseCostRule,
  updateFinanceRecipe,
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

  router.get(
    '/purchases',
    validate({ query: financePurchaseFiltersSchema }),
    async (req, res, next) => {
      try {
        const filters = financePurchaseFiltersSchema.parse(req.query);
        const purchases = await listFinancePurchases(repository, filters);
        res.json({ purchases });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/purchases/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const purchase = await getFinancePurchase(id, repository);
      res.json({ purchase });
    } catch (error) {
      next(error);
    }
  });

  router.delete(
    '/purchases/:id',
    validate({ params: idParamsSchema, body: cancelFinancePurchaseSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const purchase = await cancelFinancePurchase(id, req.body, repository);
        res.json({ purchase });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/base-cost-rules', async (_req, res, next) => {
    try {
      const rules = await listFinanceBaseCostRules(repository);
      res.json({ rules });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/base-cost-rules',
    validate({ body: createFinanceBaseCostRuleSchema }),
    async (req, res, next) => {
      try {
        const rule = await createFinanceBaseCostRule(req.body, repository);
        res.status(201).json({ rule });
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/base-cost-rules/:id',
    validate({ params: idParamsSchema, body: updateFinanceBaseCostRuleSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const rule = await updateFinanceBaseCostRule(id, req.body, repository);
        res.json({ rule });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/base-cost-rules/:id',
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        await deleteFinanceBaseCostRule(id, repository);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/recipes', async (_req, res, next) => {
    try {
      const recipes = await listFinanceRecipes(repository);
      res.json({ recipes });
    } catch (error) {
      next(error);
    }
  });

  router.get('/recipes/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const recipe = await getFinanceRecipe(id, repository);
      res.json({ recipe });
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/recipes/:id',
    validate({ params: idParamsSchema, body: updateFinanceRecipeSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const recipe = await updateFinanceRecipe(id, req.body, repository);
        res.json({ recipe });
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
