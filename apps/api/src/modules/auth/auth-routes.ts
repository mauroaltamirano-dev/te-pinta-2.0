import { Router, type Router as ExpressRouter } from 'express';
import rateLimit from 'express-rate-limit';

import { authLoginSchema } from '@te-pinta/shared';

import { validate } from '../../middlewares/validate';
import type { AdminUserRepository } from './auth-service';
import { authenticateAdmin, refreshAdminSession } from './auth-service';
import { authenticate } from '../../middlewares/authenticate';
import type { JwtSecrets } from './jwt';

const refreshCookieName = 'te_pinta_refresh';

export type AuthRouterOptions = {
  repository: AdminUserRepository;
  secrets: JwtSecrets;
  secureCookies?: boolean;
};

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const createAuthRouter = ({
  repository,
  secrets,
  secureCookies = false,
}: AuthRouterOptions): ExpressRouter => {
  const router = Router();

  router.post(
    '/login',
    authRateLimit,
    validate({ body: authLoginSchema }),
    async (req, res, next) => {
      try {
        const session = await authenticateAdmin(req.body, repository, secrets);

        res.cookie(refreshCookieName, session.refreshToken, {
          httpOnly: true,
          secure: secureCookies,
          sameSite: 'lax',
          path: '/api/v1/auth',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user: session.user, accessToken: session.accessToken });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/refresh', (req, res, next) => {
    try {
      const session = refreshAdminSession(req.cookies?.[refreshCookieName], secrets);
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(refreshCookieName, { path: '/api/v1/auth' });
    res.status(204).send();
  });

  router.get('/me', authenticate(secrets), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
};
