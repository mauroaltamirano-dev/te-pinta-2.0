import { compare } from 'bcryptjs';
import { describe, expect, it } from 'vitest';

import { buildAdminSeedUser, initialSettings } from './seed';

describe('seed helpers', () => {
  it('hashes the env admin password and normalizes email', async () => {
    const admin = await buildAdminSeedUser({
      ADMIN_EMAIL: 'ADMIN@TEPINTA.COM',
      ADMIN_PASSWORD: 'super-secret',
      ADMIN_NAME: 'Admin Te Pinta',
    });

    expect(admin.email).toBe('admin@tepinta.com');
    expect(admin.name).toBe('Admin Te Pinta');
    expect(admin.passwordHash).not.toBe('super-secret');
    await expect(compare('super-secret', admin.passwordHash)).resolves.toBe(true);
  });

  it('defines the delivery fee setting required by orders', () => {
    expect(initialSettings).toContainEqual({ key: 'delivery_fee', value: '0' });
  });
});
