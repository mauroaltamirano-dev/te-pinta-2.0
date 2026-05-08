import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { validate } from './validate';

describe('validate middleware', () => {
  it('replaces request body with parsed data and calls next', () => {
    const req = { body: { email: ' ADMIN@TEPINTA.LOCAL ' } } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    validate({ body: z.object({ email: z.string().trim().toLowerCase() }) })(req, res, next);

    expect(req.body).toEqual({ email: 'admin@tepinta.local' });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes a structured validation error to next', () => {
    const req = { body: {} } as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    validate({ body: z.object({ email: z.email() }) })(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'VALIDATION_ERROR' }),
    );
  });

  it('validates query strings in an Express 5 request without turning them into 400s', async () => {
    const app = express();

    app.get(
      '/items',
      validate({
        query: z.object({
          includeInactive: z
            .enum(['true', 'false'])
            .transform((value) => value === 'true')
            .optional(),
        }),
      }),
      (_req, res) => {
        res.json({ ok: true });
      },
    );

    const response = await request(app).get('/items?includeInactive=true');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
