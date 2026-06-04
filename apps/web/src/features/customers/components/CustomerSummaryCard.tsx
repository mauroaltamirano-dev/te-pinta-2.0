import type { ComponentType, ReactNode } from 'react';

type CustomerSummaryCardProps = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string | number;
  hint: string;
  accentClassName: string;
  iconClassName: string;
};

export const CustomerSummaryCard = ({
  icon: Icon,
  label,
  value,
  hint,
  accentClassName,
  iconClassName,
}: CustomerSummaryCardProps) => (
  <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${accentClassName}`}
      >
        <Icon className={`h-5 w-5 ${iconClassName}`} aria-hidden={true} />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-black tabular-nums text-foreground">{value}</p>
      </div>
    </div>
    <p className="mt-3 text-xs font-bold text-muted-foreground">{hint}</p>
  </article>
);

export const CustomersSummaryCards = ({
  children,
}: {
  children: ReactNode;
}) => (
  <section
    aria-label="Resumen de clientes"
    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
  >
    {children}
  </section>
);
