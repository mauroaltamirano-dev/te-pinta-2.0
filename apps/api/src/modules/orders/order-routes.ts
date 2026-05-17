import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';

import {
  createOrderSchema,
  orderFiltersSchema,
  orderStatusSchema,
  updateOrderSchema,
} from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import { idParamsSchema } from '../route-schemas';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
  updateOrderPayment,
  updateOrderStatus,
} from './order-service';
import type { OrderRepository } from './order-service';

const updateStatusBodySchema = z.object({ status: orderStatusSchema });
const updatePaymentBodySchema = z.object({ isPaid: z.boolean() });

export type OrderRouterOptions = {
  repository: OrderRepository;
  secrets: JwtSecrets;
};

export const createOrderRouter = ({ repository, secrets }: OrderRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', validate({ query: orderFiltersSchema }), async (req, res, next) => {
    try {
      const filters = orderFiltersSchema.parse(req.query);
      const result = await listOrders(repository, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', validate({ body: createOrderSchema }), async (req, res, next) => {
    try {
      const order = await createOrder(req.body, repository);
      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      const order = await getOrder(id, repository);
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: updateOrderSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const order = await updateOrder(id, req.body, repository);
        res.json({ order });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:id/status',
    validate({ params: idParamsSchema, body: updateStatusBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const body = updateStatusBodySchema.parse(req.body);
        const order = await updateOrderStatus(id, body.status, repository);
        res.json({ order });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:id/payment',
    validate({ params: idParamsSchema, body: updatePaymentBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const body = updatePaymentBodySchema.parse(req.body);
        const order = await updateOrderPayment(id, body.isPaid, repository);
        res.json({ order });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete('/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      await deleteOrder(id, repository);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
