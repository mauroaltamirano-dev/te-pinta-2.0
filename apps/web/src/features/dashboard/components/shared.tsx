import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const SectionCard = ({
  children,
  className,
  as: Component = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'aside';
}) => (
  <Component
    className={cn(
      'rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-card',
      className,
    )}
  >
    {children}
  </Component>
);

export const EmptyState = ({ title, description }: { title: string; description?: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-background/70 p-5 text-center">
    <p className="font-black text-foreground">{title}</p>
    {description ? (
      <p className="mt-1 text-sm font-semibold text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

export const StatusBadge = ({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) => {
  const classes = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    warning: 'bg-amber-50 text-amber-800 ring-amber-100',
    danger: 'bg-red-50 text-red-800 ring-red-100',
    neutral: 'bg-stone-100 text-muted-foreground ring-border/70',
    info: 'bg-sky-50 text-sky-800 ring-sky-100',
  } satisfies Record<string, string>;

  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ring-1',
        classes[tone],
      )}
    >
      {children}
    </span>
  );
};
