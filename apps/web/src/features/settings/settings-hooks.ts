import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listSettings, updateSetting } from './settings-api';

export const settingsQueryKeys = {
  all: ['settings'] as const,
  list: () => [...settingsQueryKeys.all, 'list'] as const,
};

export const useSettings = () =>
  useQuery({
    queryKey: settingsQueryKeys.list(),
    queryFn: listSettings,
  });

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSetting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all }),
  });
};
