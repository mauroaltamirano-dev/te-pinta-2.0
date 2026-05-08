import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/auth-store';

import { navItems } from './nav-items';

const getTitle = (pathname: string): string => {
  const item = navItems.find(
    (navItem) => pathname === navItem.href || pathname.startsWith(`${navItem.href}/`),
  );

  return item?.label ?? 'Te Pinta';
};

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = useMemo(() => getTitle(location.pathname), [location.pathname]);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.status === 'loading');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-8"
      role="banner"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Te Pinta</p>
          <h1 className="text-2xl font-black tracking-tight font-display">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-brand-200 bg-card px-3 py-1 text-sm font-semibold text-brand-700 sm:block">
            {user?.name ?? 'Admin'}
          </div>
          <button
            className="rounded-full border border-brand-200 bg-card px-3 py-1 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoggingOut}
            onClick={handleLogout}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
};
