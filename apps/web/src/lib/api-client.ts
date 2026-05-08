import axios, { AxiosHeaders } from 'axios';

import { getAccessToken } from './access-token';

export const defaultApiBaseUrl = 'http://localhost:3000/api/v1';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || defaultApiBaseUrl;
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});
