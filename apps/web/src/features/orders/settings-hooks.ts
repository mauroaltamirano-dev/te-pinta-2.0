import { useQuery } from '@tanstack/react-query';

import { getDeliveryFee } from './settings-api';

export const settingsQueryKeys = {
  deliveryFee: ['settings', 'delivery_fee'] as const,
};

export const useDeliveryFee = () =>
  useQuery({
    queryKey: settingsQueryKeys.deliveryFee,
    queryFn: getDeliveryFee,
  });
