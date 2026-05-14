import { useQuery } from '@tanstack/react-query';

import { getDeliveryFee, getOrderPromotionSettings } from './settings-api';

export const settingsQueryKeys = {
  deliveryFee: ['settings', 'delivery_fee'] as const,
  orderPromotions: ['settings', 'order_promotions'] as const,
};

export const useDeliveryFee = () =>
  useQuery({
    queryKey: settingsQueryKeys.deliveryFee,
    queryFn: getDeliveryFee,
  });

export const useOrderPromotionSettings = () =>
  useQuery({
    queryKey: settingsQueryKeys.orderPromotions,
    queryFn: getOrderPromotionSettings,
  });
