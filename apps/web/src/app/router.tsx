import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { HomePage } from '@/routes/HomePage';
import { LoginPage } from '@/routes/LoginPage';
import { PlaceholderPage } from '@/routes/PlaceholderPage';

import { lazyRoute } from './lazy-route';

const DashboardPage = lazyRoute(
  () => import('@/features/dashboard/DashboardPage'),
  'DashboardPage',
);
const OrdersPage = lazyRoute(() => import('@/features/orders/OrdersPage'), 'OrdersPage');
const MenuPage = lazyRoute(() => import('@/features/menu/MenuPage'), 'MenuPage');
const CustomersPage = lazyRoute(
  () => import('@/features/customers/CustomersPage'),
  'CustomersPage',
);
const SalesPage = lazyRoute(() => import('@/features/sales/SalesPage'), 'SalesPage');
const FinancePage = lazyRoute(
  () => import('@/features/finance/pages/FinancePage'),
  'FinancePage',
);
const SettingsPage = lazyRoute(
  () => import('@/features/settings/SettingsPage'),
  'SettingsPage',
);

export const protectedRoutes = [
  {
    path: 'dashboard',
    element: <DashboardPage />,
  },
  {
    path: 'orders',
    element: <OrdersPage />,
  },
  {
    path: 'production',
    element: (
      <PlaceholderPage
        title="Producción"
        description="Vista dedicada para planificar producción, tandas y preparación. Por ahora el resumen operativo vive en el dashboard general."
      />
    ),
  },
  {
    path: 'sales',
    element: <SalesPage />,
  },
  {
    path: 'menu',
    element: <MenuPage />,
  },
  {
    path: 'customers',
    element: <CustomersPage />,
  },
  {
    path: 'finanzas',
    element: <FinancePage />,
  },
  {
    path: 'ingredients',
    element: <Navigate replace to="/finanzas?section=catalog" />,
  },
  {
    path: 'stock',
    element: (
      <PlaceholderPage
        title="Stock"
        description="Vista dedicada para stock operativo. Los insumos y costos se gestionan desde Gestión."
      />
    ),
  },
  {
    path: 'settings',
    element: <SettingsPage />,
  },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: protectedRoutes,
  },
  {
    path: '*',
    element: <Navigate replace to="/dashboard" />,
  },
]);
