import { BadgeDollarSign, CalendarDays, ClipboardList, Clock3, Package, Repeat } from 'lucide-react';

import { formatMoney, formatRelativePurchaseDate } from '../customers-utils';
import type { CustomerProfile } from '../types';

type CustomerStatsProps = {
  profile: CustomerProfile;
};

export const CustomerStats = ({ profile }: CustomerStatsProps) => {
  const stats = [
    {
      id: 'total',
      label: 'Total comprado',
      value: formatMoney(profile.totalPurchased),
      icon: BadgeDollarSign,
      accent: 'bg-primary/5 text-primary ring-primary/10',
    },
    {
      id: 'orders',
      label: 'Pedidos',
      value: String(profile.orderCount),
      icon: ClipboardList,
      accent: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
    {
      id: 'average',
      label: 'Promedio por pedido',
      value: formatMoney(profile.averageTicket),
      icon: BadgeDollarSign,
      accent: 'bg-amber-50 text-amber-900 ring-amber-100',
    },
    {
      id: 'dozens',
      label: 'Docenas compradas',
      value: profile.dozensPurchased.toLocaleString('es-AR'),
      icon: Package,
      accent: 'bg-white text-foreground ring-border/60',
    },
    {
      id: 'last',
      label: 'Última compra',
      value: formatRelativePurchaseDate(profile.lastPurchaseAt),
      icon: CalendarDays,
      accent: 'bg-white text-foreground ring-border/60',
    },
    {
      id: 'frequency',
      label: 'Frecuencia estimada',
      value: profile.purchaseFrequencyDays
        ? `cada ${profile.purchaseFrequencyDays} días aprox.`
        : 'Sin datos',
      icon: Repeat,
      accent: 'bg-white text-foreground ring-border/60',
    },
  ];

  return (
    <section aria-label="Estadísticas del cliente" className="space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-sm font-black uppercase tracking-wide">Estadísticas</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat) => (
          <article className={`rounded-2xl p-4 ring-1 ${stat.accent}`} key={stat.id}>
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className="mt-2 text-lg font-black tabular-nums text-foreground">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
