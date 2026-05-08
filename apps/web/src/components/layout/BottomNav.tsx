import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { navItems } from './nav-items';

const mobileItems = navItems.slice(0, 5);

export const BottomNav = () => {
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(61,30,10,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-bold transition',
                  isActive ? 'bg-brand-100 text-brand-700' : 'text-muted-foreground',
                )
              }
              to={item.href}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
