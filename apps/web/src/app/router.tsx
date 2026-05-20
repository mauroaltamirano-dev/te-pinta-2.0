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
import { FeaturePage } from '@/routes/FeaturePage';

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
    path: 'agenda',
    element: (
      <FeaturePage
        title="Agenda"
        description="Vista planificada para organizar entregas, producción y recordatorios del negocio."
      />
    ),
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
    path: 'finances',
    element: (
      <FeaturePage
        title="Finanzas"
        description="Resumen financiero avanzado para cobros, costos, márgenes y rentabilidad."
      />
    ),
  },
  {
    path: 'reports',
    element: (
      <FeaturePage
        title="Reportes"
        description="Reportes operativos y comerciales para analizar la evolución de Te Pinta."
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
