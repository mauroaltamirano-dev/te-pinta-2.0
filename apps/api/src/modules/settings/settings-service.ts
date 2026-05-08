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

export const listSettings = (repository: SettingsRepository): Promise<Setting[]> =>
  repository.list();

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
