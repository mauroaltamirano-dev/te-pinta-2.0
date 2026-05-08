import { hash } from 'bcryptjs';
import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app';
import { createAuthRouter } from './auth-routes';
import type { AdminUserRepository } from './auth-service';

const secrets = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
};

const createAuthApp = (repository: AdminUserRepository) => {
  const apiRouter = Router();
  apiRouter.use('/auth', createAuthRouter({ repository, secrets }));

  return createApp({
    allowedOrigin: 'http://localhost:5173',
    apiRouter,
  });
};

const serializeCookies = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value.join(';') : (value ?? '');

describe('auth routes', () => {
  it('logs in the seeded admin and sets the refresh cookie', async () => {
    const passwordHash = await hash('super-secret', 12);
    const app = createAuthApp({
      findAdminByEmail: async (email) => ({
        id: 'admin',
        email,
        name: 'Admin Te Pinta',
        passwordHash,
      }),
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ADMIN@TEPINTA.LOCAL', password: 'super-secret' });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      id: 'admin',
      email: 'admin@tepinta.local',
      name: 'Admin Te Pinta',
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    const cookies = serializeCookies(response.headers['set-cookie']);

    expect(cookies).toContain('te_pinta_refresh=');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('Path=/api/v1/auth');
  });

  it('returns a structured validation error for invalid login payloads', async () => {
    const app = createAuthApp({
      findAdminByEmail: async () => null,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
    });
  });
});
