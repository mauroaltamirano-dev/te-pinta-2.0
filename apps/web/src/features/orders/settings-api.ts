import { apiClient } from '@/lib/api-client';

type Setting = {
  key: string;
  value: string;
};

export const getDeliveryFee = async (): Promise<number> => {
  const response = await apiClient.get<{ setting: Setting }>('/settings/delivery_fee');
  const parsed = Number(response.data.setting.value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
