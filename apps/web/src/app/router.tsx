import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { FinancePage } from '@/features/finance/pages/FinancePage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { MenuPage } from '@/features/menu/MenuPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { HomePage } from '@/routes/HomePage';
import { LoginPage } from '@/routes/LoginPage';

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
