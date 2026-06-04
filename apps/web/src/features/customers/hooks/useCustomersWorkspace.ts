import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { listAllOrders, type OrderListItem } from '../../orders/orders-api';
import { useCustomers } from '../customers-hooks';
import {
  buildCustomerProfiles,
  computeCustomersSummary,
  matchesCustomerFilter,
  matchesCustomerSearch,
} from '../customers-utils';
import type { CustomerFilterId, CustomerProfile, CustomersSummaryMetrics } from '../types';

export const customerOrdersQueryKey = ['customers', 'all-orders'] as const;

export type CustomersWorkspace = {
  customersQuery: ReturnType<typeof useCustomers>;
  ordersQuery: ReturnType<typeof useQuery<OrderListItem[], Error>>;
  profiles: CustomerProfile[];
  summary: CustomersSummaryMetrics;
  filterProfiles: (search: string, filter: CustomerFilterId) => CustomerProfile[];
  getProfileById: (id: string | null) => CustomerProfile | null;
};

export const useCustomersWorkspace = (): CustomersWorkspace => {
  const customersQuery = useCustomers();
  const ordersQuery = useQuery({
    queryKey: customerOrdersQueryKey,
    queryFn: () => listAllOrders({ sortBy: 'deliveryDate', sortDir: 'desc' }),
    staleTime: 30_000,
  });

  const profiles = useMemo(() => {
    const customers = customersQuery.data ?? [];
    const orders = ordersQuery.data ?? [];
    return buildCustomerProfiles(customers, orders);
  }, [customersQuery.data, ordersQuery.data]);

  const summary = useMemo(() => computeCustomersSummary(profiles), [profiles]);

  const filterProfiles = useMemo(
    () => (search: string, filter: CustomerFilterId) =>
      profiles.filter(
        (profile) => matchesCustomerSearch(profile, search) && matchesCustomerFilter(profile, filter),
      ),
    [profiles],
  );

  const getProfileById = useMemo(
    () => (id: string | null) => profiles.find((profile) => profile.id === id) ?? null,
    [profiles],
  );

  return {
    customersQuery,
    ordersQuery,
    profiles,
    summary,
    filterProfiles,
    getProfileById,
  };
};

export const useIsDesktopPanel = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
};
