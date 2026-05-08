import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateMenuItemInput } from '@te-pinta/shared';

import { createMenuItem, deleteMenuItem, listMenuItems, updateMenuItem } from './menu-api';

export const menuQueryKeys = {
  all: ['menu'] as const,
  list: () => [...menuQueryKeys.all, 'list'] as const,
};

export const useMenuItems = () =>
  useQuery({
    queryKey: menuQueryKeys.list(),
    queryFn: listMenuItems,
  });

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuQueryKeys.all }),
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMenuItemInput }) =>
      updateMenuItem(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuQueryKeys.all }),
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuQueryKeys.all }),
  });
};
