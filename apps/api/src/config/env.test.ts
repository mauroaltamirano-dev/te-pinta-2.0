import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/te_pinta',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  ALLOWED_ORIGIN: 'http://localhost:5173',
  ADMIN_EMAIL: 'ADMIN@TEPINTA.COM',
  ADMIN_PASSWORD: 'super-secret',
  ADMIN_NAME: 'Admin Te Pinta',
};

describe('parseEnv', () => {
  it('validates required API and admin seed variables with defaults', () => {
    expect(parseEnv(validEnv)).toMatchObject({
      DATABASE_URL: validEnv.DATABASE_URL,
      JWT_SECRET: validEnv.JWT_SECRET,
      JWT_REFRESH_SECRET: validEnv.JWT_REFRESH_SECRET,
      ALLOWED_ORIGIN: validEnv.ALLOWED_ORIGIN,
      ADMIN_EMAIL: 'admin@tepinta.com',
      ADMIN_PASSWORD: validEnv.ADMIN_PASSWORD,
      ADMIN_NAME: validEnv.ADMIN_NAME,
      PORT: 3000,
      NODE_ENV: 'development',
    });
  });

  it('rejects weak secrets and admin passwords', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short', ADMIN_PASSWORD: 'short' })).toThrow();
  });
});
