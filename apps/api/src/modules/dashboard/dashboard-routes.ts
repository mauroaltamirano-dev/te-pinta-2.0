import { Router, type Router as ExpressRouter } from 'express';

import { dashboardQuerySchema } from '@te-pinta/shared';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import { getDailyDashboard } from './dashboard-service';
import type { DashboardRepository } from './dashboard-service';

export type DashboardRouterOptions = {
  repository: DashboardRepository;
  secrets: JwtSecrets;
};

export const createDashboardRouter = ({
  repository,
  secrets,
}: DashboardRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', validate({ query: dashboardQuerySchema }), async (req, res, next) => {
    try {
      const query = dashboardQuerySchema.parse(req.query);
      const dashboard = await getDailyDashboard(query, repository);
      res.json({ dashboard });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
