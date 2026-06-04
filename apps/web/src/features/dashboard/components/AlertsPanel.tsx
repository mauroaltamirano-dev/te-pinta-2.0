import { AlertTriangle } from 'lucide-react';

import type { DashboardAlert } from '../dashboard.mock';
import { AlertPill } from './CriticalAlertsBar';
import { EmptyState, SectionCard } from './shared';

export const AlertsPanel = ({ alerts }: { alerts: DashboardAlert[] }) => (
  <SectionCard className="order-8">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <AlertTriangle className="size-4" aria-hidden /> Alertas importantes
        </p>
        <h2 className="mt-1 text-2xl font-black text-foreground">Seguimiento secundario</h2>
      </div>
    </div>

    {alerts.length === 0 ? (
      <EmptyState
        title="No hay alertas importantes"
        description="Buen síntoma: nada urgente para revisar ahora."
      />
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {alerts.map((alert) => (
          <AlertPill alert={alert} key={alert.id} />
        ))}
      </div>
    )}
  </SectionCard>
);
