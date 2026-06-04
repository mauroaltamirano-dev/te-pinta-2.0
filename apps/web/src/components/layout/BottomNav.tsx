import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { useAuthStore } from '@/features/auth/auth-store';
import { cn } from '@/lib/utils';

import { mobileNavItems } from './nav-items';

export const BottomNav = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const isLoggingOut = useAuthStore((state) => state.status === 'loading');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-sidebar-foreground/12 bg-sidebar px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-3 text-card shadow-[0_-18px_42px_rgba(10,31,53,0.28)] md:hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% -20%, rgba(210, 138, 45, 0.3), transparent 12rem), radial-gradient(circle at 90% 20%, rgba(181, 74, 50, 0.22), transparent 11rem), linear-gradient(180deg, rgba(255, 248, 239, 0.08), rgba(0, 0, 0, 0.08))',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-success"
      />

      <div className="relative mx-auto grid max-w-lg grid-cols-5 gap-1.5">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-w-0 flex-col items-center gap-1 rounded-[1.15rem] px-1.5 py-2 text-[0.62rem] font-extrabold transition-all duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
                  isActive
                    ? 'bg-card text-sidebar shadow-glow'
                    : 'text-card/78 hover:-translate-y-0.5 hover:bg-sidebar-foreground/10 hover:text-white',
                )
              }
              to={item.href}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 -top-0.5 h-1 rounded-full bg-primary"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-xl ring-1 transition-all duration-200',
                      isActive
                        ? 'bg-primary text-card ring-primary/20 shadow-sm'
                        : 'bg-sidebar-foreground/8 text-card ring-sidebar-foreground/12 group-hover:bg-primary group-hover:ring-primary/30',
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[1.125rem] transition-transform duration-200 group-hover:scale-110"
                    />
                  </span>
                  <span
                    className={cn(
                      'max-w-full truncate leading-none',
                      isActive ? 'text-sidebar' : 'text-card/80',
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent"
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
      <button
        className="relative mx-auto mt-2 flex min-h-10 w-full max-w-lg items-center justify-center gap-2 rounded-[1.15rem] border border-sidebar-foreground/15 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-primary disabled:pointer-events-none disabled:opacity-70"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </nav>
  );
};
