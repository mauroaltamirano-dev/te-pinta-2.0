import { useEffect, type PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from './auth-store';

export type ProtectedRouteProps = PropsWithChildren;

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const refresh = useAuthStore((state) => state.refresh);

  useEffect(() => {
    if (status === 'idle') {
      void refresh();
    }
  }, [refresh, status]);

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="rounded-3xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-bold text-primary">Verificando sesión...</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
};
