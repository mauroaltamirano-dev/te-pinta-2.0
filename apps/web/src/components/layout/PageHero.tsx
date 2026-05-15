import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export const PageHero = ({
  eyebrow = 'Panel operativo',
  title,
  description,
  children,
}: PageHeroProps) => (
  <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-sidebar p-5 text-card shadow-premium sm:p-6">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 12% -20%, rgba(210, 138, 45, 0.34), transparent 16rem), radial-gradient(circle at 92% 10%, rgba(181, 74, 50, 0.24), transparent 14rem), linear-gradient(135deg, rgba(255,248,239,0.08), rgba(0,0,0,0.12))',
      }}
    />
    <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sidebar-muted ring-1 ring-white/10">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-sidebar-muted sm:text-base">
          {description}
        </p>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{children}</div>
      ) : null}
    </div>
  </section>
);
