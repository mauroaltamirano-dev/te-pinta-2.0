import { Router, type Router as ExpressRouter } from 'express';

import { createIngredientSchema, updateIngredientSchema } from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import { idParamsSchema } from '../route-schemas';
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from './ingredient-service';
import type { IngredientRepository } from './ingredient-service';

export type IngredientRouterOptions = {
  repository: IngredientRepository;
  secrets: JwtSecrets;
};

export const createIngredientRouter = ({
  repository,
  secrets,
}: IngredientRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', async (_req, res, next) => {
    try {
      const ingredients = await listIngredients(repository);
      res.json({ ingredients });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', validate({ body: createIngredientSchema }), async (req, res, next) => {
    try {
      const ingredient = await createIngredient(req.body, repository);
      res.status(201).json({ ingredient });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: updateIngredientSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const ingredient = await updateIngredient(id, req.body, repository);
        res.json({ ingredient });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete('/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      await deleteIngredient(id, repository);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
