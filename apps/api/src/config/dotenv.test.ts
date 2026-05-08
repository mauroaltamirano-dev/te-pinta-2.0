import dotenv from 'dotenv';
import { describe, expect, it, vi } from 'vitest';

import { loadEnvFile } from './dotenv';

vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(),
  },
}));

describe('loadEnvFile', () => {
  it('loads the package .env file before env validation', () => {
    loadEnvFile();

    expect(dotenv.config).toHaveBeenCalledWith({ path: expect.stringContaining('apps/api/.env') });
  });
});
