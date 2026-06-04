import { AlertTriangle, CalendarClock, CircleDollarSign } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatMoney } from '../customers-utils';
import type { CustomerProfile } from '../types';

type CustomerPendingBoxProps = {
  profile: CustomerProfile;
};

export const CustomerPendingBox = ({ profile }: CustomerPendingBoxProps) => {
  const hasDebt = profile.debtAmount > 0;
  const hasNextOrder = Boolean(profile.nextOrderLabel);
  const hasImportantNote = Boolean(profile.importantNote);
  const hasPending = hasDebt || hasNextOrder || hasImportantNote;

  if (!hasPending) {
    return (
      <section className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm font-semibold text-muted-foreground">
        Sin pagos pendientes ni pedidos activos.
      </section>
    );
  }

  return (
    <section
      aria-label="Pendientes del cliente"
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        hasDebt
          ? 'border-red-200 bg-red-50/80'
          : 'border-amber-200 bg-amber-50/70',
      )}
    >
      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Pendientes</h3>
      <ul className="mt-3 space-y-2 text-sm font-semibold text-foreground">
        {hasDebt ? (
          <li className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-red-700" aria-hidden="true" />
            Pendiente de cobro: {formatMoney(profile.debtAmount)}
          </li>
        ) : null}
        {hasNextOrder ? (
          <li className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-800" aria-hidden="true" />
            Próximo pedido: {profile.nextOrderLabel}
          </li>
        ) : null}
        {hasImportantNote ? (
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
            Nota importante: {profile.importantNote}
          </li>
        ) : null}
      </ul>
    </section>
  );
};
