import { cn } from '@/lib/utils';

import { periodOptions, type DashboardPeriod, type PeriodRange } from '../dashboard-utils';

type DashboardPeriodControlsProps = {
  ariaLabel: string;
  customEndDate: string;
  customStartDate: string;
  date: string;
  onCustomEndDateChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPeriodChange: (value: DashboardPeriod) => void;
  period: DashboardPeriod;
  periodRange: PeriodRange;
  showDateControls?: boolean;
};

const mobilePeriodLabels: Record<DashboardPeriod, string> = {
  week: 'Semana',
  month: 'Mes',
  all: 'Todo',
  custom: 'Rango',
};

export const DashboardPeriodControls = ({
  ariaLabel,
  customEndDate,
  customStartDate,
  date,
  onCustomEndDateChange,
  onCustomStartDateChange,
  onDateChange,
  onPeriodChange,
  period,
  periodRange,
  showDateControls = false,
}: DashboardPeriodControlsProps) => (
  <fieldset
    aria-label={ariaLabel}
    className="rounded-[1.35rem] border border-white/80 bg-white p-3 shadow-card sm:p-4"
  >
    <legend className="sr-only">{ariaLabel}</legend>
    <div
      className={cn(
        'grid items-end gap-3',
        showDateControls
          ? 'grid-cols-[minmax(0,1fr)_8.75rem] lg:grid-cols-[minmax(0,1fr)_auto_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto]',
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          <span className="sm:hidden">Período</span>
          <span className="hidden sm:inline">{ariaLabel}</span>
        </p>
        <p className="mt-1 text-sm font-bold text-muted-foreground">{periodRange.label}</p>
      </div>
      {showDateControls ? (
        <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
          <span className="sm:hidden">Fecha</span>
          <span className="hidden sm:inline">Fecha de referencia</span>
          <input
            className="min-h-11 w-full min-w-0 rounded-2xl border border-border bg-background px-3 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25 sm:px-4"
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      ) : null}
      <div
        className={cn(
          'inline-grid min-h-11 grid-cols-4 overflow-hidden rounded-2xl bg-muted p-1 ring-1 ring-border/70',
          showDateControls && 'col-span-2 lg:col-span-1',
        )}
      >
        {periodOptions.map((option) => {
          const isSelected = option.value === period;

          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                'min-h-11 min-w-0 rounded-xl px-1.5 py-2 text-[0.68rem] font-black transition-colors sm:px-3 sm:text-xs',
                isSelected
                  ? 'bg-sidebar text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-white hover:text-foreground',
              )}
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              type="button"
            >
              <span className="sm:hidden">{mobilePeriodLabels[option.value]}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>

    {showDateControls && period === 'custom' ? (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Desde
          <input
            className="mt-1 min-h-11 w-full min-w-0 rounded-2xl border border-border bg-background px-3 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25 sm:px-4"
            onChange={(event) => onCustomStartDateChange(event.target.value)}
            type="date"
            value={customStartDate}
          />
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Hasta
          <input
            className="mt-1 min-h-11 w-full min-w-0 rounded-2xl border border-border bg-background px-3 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25 sm:px-4"
            onChange={(event) => onCustomEndDateChange(event.target.value)}
            type="date"
            value={customEndDate}
          />
        </label>
      </div>
    ) : null}
  </fieldset>
);
