import type { ReactNode } from 'react';

type MetricCardAccent = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
type MetricCardTrendTone = 'neutral' | 'positive' | 'negative';

type MetricCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: MetricCardAccent;
  trend?: {
    label: string;
    tone?: MetricCardTrendTone;
  };
  helpText?: ReactNode;
  className?: string;
};

const accentClasses: Record<MetricCardAccent, string> = {
  neutral: 'border-border/70 bg-card',
  primary: 'border-primary/20 bg-primary/5',
  success: 'border-emerald-200 bg-emerald-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
};

const trendClasses: Record<MetricCardTrendTone, string> = {
  neutral: 'text-muted-foreground',
  positive: 'text-emerald-700',
  negative: 'text-red-700',
};

const stringifyLabel = (value: ReactNode) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

export const MetricCard = ({
  label,
  value,
  icon,
  accent = 'neutral',
  trend,
  helpText,
  className = '',
}: MetricCardProps) => {
  const valueLabel = stringifyLabel(value);

  return (
    <article
      aria-label={valueLabel ? `${label}: ${valueLabel}` : label}
      className={[
        'rounded-[1.35rem] border p-4 shadow-card',
        accentClasses[accent],
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            {label}
          </h3>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</p>
        </div>
        {icon && (
          <div className="rounded-2xl bg-white/75 p-2 text-primary shadow-sm" aria-hidden={true}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <p className={`mt-3 text-sm font-black ${trendClasses[trend.tone ?? 'neutral']}`}>
          {trend.label}
        </p>
      )}

      {helpText && <p className="mt-2 text-xs font-semibold text-muted-foreground">{helpText}</p>}
    </article>
  );
};
