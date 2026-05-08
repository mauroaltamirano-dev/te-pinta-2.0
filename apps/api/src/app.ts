import cookieParser from 'cookie-parser';
import type { Express, Router as ExpressRouter } from 'express';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middlewares/error-handler';

export type CreateAppOptions = {
  allowedOrigin: string;
  apiRouter?: ExpressRouter;
};

export const healthPayload = { status: 'ok', service: 'te-pinta-api' } as const;

export const createApp = ({ allowedOrigin, apiRouter }: CreateAppOptions): Express => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json(healthPayload);
  });

  if (apiRouter) {
    app.use('/api/v1', apiRouter);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
