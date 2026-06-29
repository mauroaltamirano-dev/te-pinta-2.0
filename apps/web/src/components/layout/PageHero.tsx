import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  compactOnMobile?: boolean;
};

export const PageHero = ({
  eyebrow = 'Panel operativo',
  title,
  description,
  children,
  compactOnMobile = false,
}: PageHeroProps) => (
  <section
    className={cn(
      'relative overflow-hidden border border-border/70 bg-sidebar text-card shadow-premium',
      compactOnMobile
        ? 'rounded-[1.35rem] p-4 lg:rounded-[2rem] lg:p-6'
        : 'rounded-[2rem] p-5 sm:p-6',
    )}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 12% -20%, rgba(210, 138, 45, 0.34), transparent 16rem), radial-gradient(circle at 92% 10%, rgba(181, 74, 50, 0.24), transparent 14rem), linear-gradient(135deg, rgba(255,248,239,0.08), rgba(0,0,0,0.12))',
      }}
    />
    <div
      className={cn(
        'relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center',
        compactOnMobile && 'grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:gap-5',
      )}
    >
      <div>
        <p
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sidebar-muted ring-1 ring-white/10',
            compactOnMobile && 'hidden lg:inline-flex',
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1
          className={cn(
            'font-display font-black tracking-tight text-white',
            compactOnMobile ? 'text-2xl lg:mt-3 lg:text-4xl' : 'mt-3 text-3xl sm:text-4xl',
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            'mt-2 max-w-3xl text-sm font-semibold text-sidebar-muted sm:text-base',
            compactOnMobile && 'hidden lg:block',
          )}
        >
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{children}</div>
      ) : null}
    </div>
  </section>
);
