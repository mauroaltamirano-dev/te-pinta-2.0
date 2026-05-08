import type { AuthLoginInput } from '@te-pinta/shared';
import { authLoginSchema } from '@te-pinta/shared';

import { apiClient } from '@/lib/api-client';

import type { AuthSession } from './auth-types';

export const loginAdmin = async (input: AuthLoginInput): Promise<AuthSession> => {
  const payload = authLoginSchema.parse(input);
  const response = await apiClient.post<AuthSession>('/auth/login', payload);

  return response.data;
};

export const refreshAdminSession = async (): Promise<AuthSession> => {
  const response = await apiClient.post<AuthSession>('/auth/refresh');

  return response.data;
};

export const getCurrentAdmin = async (): Promise<Pick<AuthSession, 'user'>> => {
  const response = await apiClient.get<Pick<AuthSession, 'user'>>('/auth/me');

  return response.data;
};

export const logoutAdmin = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};
