import { Router, type Router as ExpressRouter } from 'express';

import { createCustomerSchema, updateCustomerSchema } from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import { idParamsSchema } from '../route-schemas';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from './customer-service';
import type { CustomerRepository } from './customer-service';

export type CustomerRouterOptions = {
  repository: CustomerRepository;
  secrets: JwtSecrets;
};

export const createCustomerRouter = ({
  repository,
  secrets,
}: CustomerRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', async (_req, res, next) => {
    try {
      const customers = await listCustomers(repository);
      res.json({ customers });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', validate({ body: createCustomerSchema }), async (req, res, next) => {
    try {
      const customer = await createCustomer(req.body, repository);
      res.status(201).json({ customer });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: updateCustomerSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const customer = await updateCustomer(id, req.body, repository);
        res.json({ customer });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete('/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      await deleteCustomer(id, repository);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
