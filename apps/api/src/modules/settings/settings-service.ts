import type { UpdateSettingInput } from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';

export type Setting = {
  key: string;
  value: string;
};

export type SettingsRepository = {
  list(): Promise<Setting[]>;
  get(key: string): Promise<Setting | null>;
  update(setting: Setting): Promise<Setting>;
};

export const defaultSettings: Setting[] = [
  { key: 'delivery_fee', value: '0' },
  { key: 'cooked_order_fee', value: '0' },
  { key: 'promo_bulk_dozen_threshold', value: '3' },
  { key: 'promo_bulk_discount_percent', value: '10' },
  { key: 'promo_combined_dozen_quantity', value: '12' },
  { key: 'promo_combined_dozen_price', value: '15000' },
  { key: 'addon_yasgua_salsa_price', value: '500' },
  { key: 'addon_yasgua_cremosa_price', value: '1000' },
  { key: 'finance_dashboard_service_percent', value: '20' },
  { key: 'finance_dashboard_target_margin_percent', value: '50' },
];

export const listSettings = async (repository: SettingsRepository): Promise<Setting[]> => {
  const settingsByKey = new Map(defaultSettings.map((setting) => [setting.key, setting]));
  for (const setting of await repository.list()) {
    settingsByKey.set(setting.key, setting);
  }
  return [...settingsByKey.values()].sort((a, b) => a.key.localeCompare(b.key));
};

export const getSetting = async (key: string, repository: SettingsRepository): Promise<Setting> => {
  const setting = await repository.get(key);

  if (!setting) {
    throw new ApiError(404, 'Setting not found', 'SETTING_NOT_FOUND');
  }

  return setting;
};

export const updateSetting = (
  input: UpdateSettingInput,
  repository: SettingsRepository,
): Promise<Setting> => repository.update(input);
