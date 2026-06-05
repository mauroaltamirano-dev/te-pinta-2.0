import { Link } from 'react-router-dom';
import { CalendarDays, Gauge, Plus, ReceiptText } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  formatHeaderDate,
  periodOptions,
  type DashboardPeriod,
  type PeriodRange,
} from '../dashboard-utils';

const presetPeriodOptions = periodOptions.filter((option) => option.value !== 'custom');

export const DashboardHeader = ({
  date,
  period,
  periodRange,
  customStartDate,
  customEndDate,
  onDateChange,
  onPeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: {
  date: string;
  period: DashboardPeriod;
  periodRange: PeriodRange;
  customStartDate: string;
  customEndDate: string;
  onDateChange: (value: string) => void;
  onPeriodChange: (value: DashboardPeriod) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
}) => {
  const handleCustomStartDateChange = (value: string) => {
    onPeriodChange('custom');
    onCustomStartDateChange(value);
  };

  const handleCustomEndDateChange = (value: string) => {
    onPeriodChange('custom');
    onCustomEndDateChange(value);
  };

  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-sidebar p-5 text-white shadow-card md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(210,138,45,.30),transparent_18rem),radial-gradient(circle_at_90%_20%,rgba(181,74,50,.24),transparent_16rem)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-accent to-success" />

      <div className="relative grid gap-5 xl:grid-cols-[minmax(22rem,.8fr)_minmax(0,1.2fr)] xl:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-crema-maiz ring-1 ring-white/10">
            <Gauge className="size-3.5" aria-hidden /> Centro operativo
          </p>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight md:text-5xl">
            Dashboard general
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-sidebar-muted md:text-base">
            Resumen operativo y financiero del emprendimiento.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-black text-white ring-1 ring-white/10">
            <CalendarDays className="size-4 text-accent" aria-hidden /> {formatHeaderDate(date)}
          </p>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] bg-white/10 p-3 ring-1 ring-white/10">
          <div className="grid gap-3 lg:grid-cols-[minmax(12rem,.7fr)_minmax(0,1fr)]">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-sidebar-muted">
              Fecha de referencia
              <input
                className="min-h-10 rounded-2xl border border-white/15 bg-white px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
                onChange={(event) => onDateChange(event.target.value)}
                type="date"
                value={date}
              />
            </label>
            <fieldset aria-label="Presets rápidos" className="min-w-0">
              <legend className="mb-2 text-xs font-black uppercase tracking-wide text-sidebar-muted">
                Período
              </legend>
              <div className="grid min-h-10 overflow-hidden rounded-2xl bg-white/10 p-1 ring-1 ring-white/10 sm:grid-cols-3">
                {presetPeriodOptions.map((option) => {
                  const isSelected = option.value === period;

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        'rounded-xl px-3 py-2 text-xs font-black transition-colors',
                        isSelected
                          ? 'bg-white text-sidebar shadow-sm'
                          : 'text-crema-maiz hover:bg-white/10 hover:text-white',
                      )}
                      key={option.value}
                      onClick={() => onPeriodChange(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <fieldset
              aria-label="Rango manual"
              className={cn(
                'min-w-0 rounded-[1.25rem] px-3 py-2 ring-1',
                period === 'custom' ? 'bg-white/15 ring-accent/40' : 'bg-white/10 ring-white/10',
              )}
            >
              <legend className="mb-2 text-xs font-black uppercase tracking-wide text-sidebar-muted">
                Rango manual
              </legend>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <label className="text-xs font-black uppercase tracking-wide text-sidebar-muted">
                  Desde
                  <input
                    className="mt-1 min-h-10 w-full rounded-2xl border border-white/15 bg-white px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
                    onChange={(event) => handleCustomStartDateChange(event.target.value)}
                    type="date"
                    value={customStartDate}
                  />
                </label>
                <label className="text-xs font-black uppercase tracking-wide text-sidebar-muted">
                  Hasta
                  <input
                    className="mt-1 min-h-10 w-full rounded-2xl border border-white/15 bg-white px-4 text-sm font-black text-sidebar outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/25"
                    onChange={(event) => handleCustomEndDateChange(event.target.value)}
                    type="date"
                    value={customEndDate}
                  />
                </label>
                <button
                  aria-pressed={period === 'custom'}
                  className={cn(
                    'min-h-10 whitespace-nowrap rounded-2xl px-4 text-xs font-black transition-colors',
                    period === 'custom'
                      ? 'bg-white text-sidebar shadow-sm'
                      : 'border border-white/15 bg-white/10 text-crema-maiz hover:bg-white/15 hover:text-white',
                  )}
                  onClick={() => onPeriodChange('custom')}
                  type="button"
                >
                  Rango personalizado
                </button>
              </div>
            </fieldset>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-primary-glow transition-colors hover:bg-primary/90"
                to="/orders"
              >
                <Plus className="size-4" aria-hidden /> Nuevo pedido
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition-colors hover:bg-white/15"
                to="/finanzas?section=purchases"
              >
                <ReceiptText className="size-4" aria-hidden /> Registrar gasto
              </Link>
            </div>
          </div>

          <p className="w-fit rounded-2xl bg-white/10 px-3 py-1.5 text-xs font-bold text-sidebar-muted ring-1 ring-white/10">
            Mostrando <span className="font-black text-crema-maiz">{periodRange.label}</span>
          </p>
        </div>
      </div>
    </header>
  );
};
