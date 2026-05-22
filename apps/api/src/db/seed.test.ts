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

  it('defines the operational settings required by orders', () => {
    expect(initialSettings).toContainEqual({ key: 'delivery_fee', value: '0' });
    expect(initialSettings).toContainEqual({ key: 'cooked_order_fee', value: '0' });
    expect(initialSettings).toContainEqual({ key: 'promo_bulk_discount_percent', value: '10' });
    expect(initialSettings).toContainEqual({ key: 'promo_combined_dozen_price', value: '15000' });
    expect(initialSettings).toContainEqual({ key: 'addon_yasgua_salsa_price', value: '500' });
  });
});
