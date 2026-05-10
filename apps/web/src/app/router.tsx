import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { IngredientsPage } from '@/features/ingredients/IngredientsPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { MenuPage } from '@/features/menu/MenuPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { HomePage } from '@/routes/HomePage';
import { LoginPage } from '@/routes/LoginPage';
import { RafflePage } from '@/routes/RafflePage';

const protectedRoutes = [
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
    path: 'ingredients',
    element: <IngredientsPage />,
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
    path: '/sorteo',
    element: <RafflePage />,
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
