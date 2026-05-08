import { Router, type Router as ExpressRouter } from 'express';

import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import type { JwtSecrets } from '../auth/jwt';
import { keyParamsSchema, settingValueBodySchema } from '../route-schemas';
import { getSetting, listSettings, updateSetting } from './settings-service';
import type { SettingsRepository } from './settings-service';

export type SettingsRouterOptions = {
  repository: SettingsRepository;
  secrets: JwtSecrets;
};

export const createSettingsRouter = ({
  repository,
  secrets,
}: SettingsRouterOptions): ExpressRouter => {
  const router = Router();

  router.use(authenticate(secrets));

  router.get('/', async (_req, res, next) => {
    try {
      const settings = await listSettings(repository);
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:key', validate({ params: keyParamsSchema }), async (req, res, next) => {
    try {
      const { key } = keyParamsSchema.parse(req.params);
      const setting = await getSetting(key, repository);
      res.json({ setting });
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/:key',
    validate({ params: keyParamsSchema, body: settingValueBodySchema }),
    async (req, res, next) => {
      try {
        const { key } = keyParamsSchema.parse(req.params);
        const body = settingValueBodySchema.parse(req.body);
        const setting = await updateSetting({ key, value: body.value }, repository);
        res.json({ setting });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
