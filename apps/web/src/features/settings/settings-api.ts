import type { UpdateSettingInput } from '@te-pinta/shared';
import { updateSettingSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

export type Setting = {
  key: string;
  value: string;
};

export const listSettings = async (): Promise<Setting[]> => {
  const response = await apiClient.get<{ settings: Setting[] }>('/settings');

  return response.data.settings;
};

export const updateSetting = async (input: UpdateSettingInput): Promise<Setting> => {
  const payload = updateSettingSchema.parse(input);
  const response = await apiClient.put<{ setting: Setting }>(`/settings/${payload.key}`, {
    value: payload.value,
  });

  return response.data.setting;
};
