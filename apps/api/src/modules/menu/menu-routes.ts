import { Router, type Router as ExpressRouter } from 'express';

import { createMenuItemSchema, updateMenuItemSchema } from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { idParamsSchema, menuListQuerySchema } from '../route-schemas';
import { createMenuItem, deleteMenuItem, listMenuItems, updateMenuItem } from './menu-service';
import type { MenuItemRepository } from './menu-service';
import type { JwtSecrets } from '../auth/jwt';

export type MenuRouterOptions = {
  repository: MenuItemRepository;
  secrets: JwtSecrets;
};

export const createMenuRouter = ({ repository, secrets }: MenuRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', validate({ query: menuListQuerySchema }), async (req, res, next) => {
    try {
      const query = menuListQuerySchema.parse(req.query);
      const items = await listMenuItems(repository, {
        includeInactive: query.includeInactive === true,
      });
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', validate({ body: createMenuItemSchema }), async (req, res, next) => {
    try {
      const item = await createMenuItem(req.body, repository);
      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: updateMenuItemSchema }),
    async (req, res, next) => {
      try {
        const { id } = idParamsSchema.parse(req.params);
        const item = await updateMenuItem(id, req.body, repository);
        res.json({ item });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete('/:id', validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = idParamsSchema.parse(req.params);
      await deleteMenuItem(id, repository);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
