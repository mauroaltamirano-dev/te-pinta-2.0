import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { authenticate } from './authenticate';
import { signAccessToken } from '../modules/auth/jwt';

const secrets = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
};

describe('authenticate middleware', () => {
  it('attaches the authenticated admin to the request', () => {
    const token = signAccessToken(
      { userId: 'admin', email: 'admin@tepinta.local', name: 'Admin Te Pinta' },
      secrets,
    );
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    authenticate(secrets)(req, res, next);

    expect(req.user).toEqual({ id: 'admin', email: 'admin@tepinta.local', name: 'Admin Te Pinta' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects missing bearer token', () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    authenticate(secrets)(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  });
});
