import { apiClient } from '@/lib/api-client';

type Setting = {
  key: string;
  value: string;
};

export type OrderPromotionSettings = {
  bulkDozenThreshold: number;
  bulkDiscountPercent: number;
  combinedDozenQuantity: number;
  combinedDozenPrice: number;
  cookingFee: number;
  addons: { addonId: string; name: string; price: number }[];
};

const parseSettingNumber = (setting: Setting | undefined, fallback: number): number => {
  const parsed = Number(setting?.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getDeliveryFee = async (): Promise<number> => {
  const response = await apiClient.get<{ setting: Setting }>('/settings/delivery_fee');
  const parsed = Number(response.data.setting.value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const getOrderPromotionSettings = async (): Promise<OrderPromotionSettings> => {
  const response = await apiClient.get<{ settings: Setting[] }>('/settings');
  const byKey = new Map(response.data.settings.map((setting) => [setting.key, setting]));

  return {
    bulkDozenThreshold: parseSettingNumber(byKey.get('promo_bulk_dozen_threshold'), 3),
    bulkDiscountPercent: parseSettingNumber(byKey.get('promo_bulk_discount_percent'), 10),
    combinedDozenQuantity: parseSettingNumber(byKey.get('promo_combined_dozen_quantity'), 12),
    combinedDozenPrice: parseSettingNumber(byKey.get('promo_combined_dozen_price'), 15000),
    cookingFee: parseSettingNumber(byKey.get('cooked_order_fee'), 0),
    addons: [
      {
        addonId: 'yasgua_salsa',
        name: 'Yasgua salsa',
        price: parseSettingNumber(byKey.get('addon_yasgua_salsa_price'), 500),
      },
      {
        addonId: 'yasgua_cremosa',
        name: 'Yasgua cremosa',
        price: parseSettingNumber(byKey.get('addon_yasgua_cremosa_price'), 1000),
      },
    ],
  };
};
