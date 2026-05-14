import { describe, expect, it } from 'vitest';

import type { Setting, SettingsRepository } from './settings-service';
import { getSetting, listSettings, updateSetting } from './settings-service';
import { ApiError } from '../../middlewares/error-handler';

const setting = (overrides: Partial<Setting> = {}): Setting => ({
  key: 'delivery_fee',
  value: '1000',
  ...overrides,
});

describe('settings service', () => {
  it('updates key-value settings', async () => {
    let stored = setting();
    const repository: SettingsRepository = {
      list: async () => [stored],
      get: async (key) => (key === stored.key ? stored : null),
      update: async (input) => {
        stored = input;
        return stored;
      },
    };

    const result = await updateSetting({ key: 'delivery_fee', value: '1500' }, repository);

    expect(result).toEqual({ key: 'delivery_fee', value: '1500' });
  });

  it('throws 404 when reading a missing setting', async () => {
    const repository: SettingsRepository = {
      list: async () => [],
      get: async () => null,
      update: async (input) => setting(input),
    };

    await expect(getSetting('missing', repository)).rejects.toMatchObject(
      new ApiError(404, 'Setting not found', 'SETTING_NOT_FOUND'),
    );
  });

  it('includes default operational settings when listing sparse persisted settings', async () => {
    const repository: SettingsRepository = {
      list: async () => [setting({ value: '1500' })],
      get: async () => null,
      update: async (input) => setting(input),
    };

    const result = await listSettings(repository);

    expect(result).toContainEqual({ key: 'delivery_fee', value: '1500' });
    expect(result).toContainEqual({ key: 'promo_bulk_discount_percent', value: '10' });
    expect(result).toContainEqual({ key: 'addon_yasgua_cremosa_price', value: '1000' });
  });
});
