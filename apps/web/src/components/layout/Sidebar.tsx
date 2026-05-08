import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { navItems, secondaryNavItems } from './nav-items';
import logo from '@/assets/logo-te-pinta-blanco.png';

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

const SidebarLink = ({ item }: { item: SidebarItem }) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-[1.35rem] px-3 py-2.5 text-sm font-semibold',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          isActive
            ? [
                'bg-muted text-sidebar shadow-glow',
                'before:absolute before:left-0 before:top-1/2 before:h-8 before:w-1.5 before:-translate-y-1/2 before:rounded-r-full before:bg-primary',
                'after:absolute after:right-3 after:top-1/2 after:size-1.5 after:-translate-y-1/2 after:rounded-full after:bg-accent',
              ]
            : [
                'text-sidebar-foreground/88 hover:translate-x-0.5 hover:bg-sidebar-foreground/9 hover:text-white',
                'hover:shadow-md hover:shadow-black/10',
              ],
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-200',
              isActive
                ? 'bg-primary text-muted ring-primary/20 shadow-sm'
                : 'bg-sidebar-foreground/8 text-sidebar-foreground ring-sidebar-foreground/12 group-hover:bg-primary group-hover:text-muted group-hover:ring-primary/30',
            )}
          >
            <Icon
              aria-hidden={true}
              className="size-5 transition-transform duration-200 group-hover:scale-110"
            />
          </span>

          <span
            className={cn('truncate transition-colors', isActive ? 'text-sidebar' : 'text-inherit')}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
};

const SidebarSectionTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mb-2 flex items-center gap-2 px-3">
      <span className="size-1.5 rounded-full bg-accent" />
      <p className="text-[0.67rem] font-extrabold uppercase tracking-[0.22em] text-sidebar-muted">
        {children}
      </p>
      <span className="h-px flex-1 bg-sidebar-foreground/12" />
    </div>
  );
};

export const Sidebar = () => {
  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        'relative hidden h-dvh w-72 shrink-0 overflow-hidden border-r border-sidebar-border md:sticky md:top-0 md:flex md:flex-col',
        'bg-sidebar text-sidebar-foreground shadow-premium',
      )}
    >
      {/* Fondo cálido tipo papel sobre azul noche */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 42% -8%, rgba(210, 138, 45, 0.26), transparent 17rem), radial-gradient(circle at 110% 38%, rgba(181, 74, 50, 0.22), transparent 13rem), linear-gradient(180deg, rgba(255, 248, 239, 0.06), rgba(255, 248, 239, 0.015) 42%, rgba(0, 0, 0, 0.12))',
        }}
      />

      {/* Textura sutil de marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #f3e7d1 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Guarda lateral inspirada en el brandbook */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-3 overflow-hidden bg-sidebar-foreground/8"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
        <div className="absolute inset-y-0 left-1 w-1 bg-accent/80" />
        <div className="absolute inset-y-0 left-2 w-px bg-success" />
      </div>

      <div className="relative flex h-full min-h-0 flex-col px-4 py-5 pl-6">
        <div className=" px-5 py-5">
          <img
            src={logo}
            alt="Logo de Te Pinta"
            className="mx-auto h-auto w-40 object-contain drop-shadow-sm"
          />

          <div className="mt-4 flex items-center justify-center gap-2 text-[0.66rem] font-extrabold uppercase tracking-[0.22em] text-sidebar-muted">
            <span className="h-px w-7 bg-accent/45" />
            Gestión interna
            <span className="h-px w-7 bg-accent/45" />
          </div>
        </div>

        <nav className="mt-7 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          <SidebarSectionTitle>Principal</SidebarSectionTitle>

          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mt-5 shrink-0 border-t border-sidebar-foreground/12 pt-5">
          <SidebarSectionTitle>Sistema</SidebarSectionTitle>

          <div className="flex flex-col gap-1.5">
            {secondaryNavItems.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
