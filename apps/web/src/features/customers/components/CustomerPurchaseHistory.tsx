import { formatCompactDate, formatMoney } from '../customers-utils';
import type { CustomerPaymentStatus, CustomerProfile, CustomerPurchaseRecord } from '../types';

const paymentLabels: Record<CustomerPaymentStatus, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  debe: 'Debe',
};

const paymentStyles: Record<CustomerPaymentStatus, string> = {
  pagado: 'bg-emerald-100 text-emerald-900',
  pendiente: 'bg-amber-100 text-amber-900',
  parcial: 'bg-orange-100 text-orange-900',
  debe: 'bg-red-100 text-red-900',
};

const orderStatusLabels: Record<CustomerPurchaseRecord['status'], string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  'por-producir': 'Por producir',
  producido: 'Producido',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

type CustomerPurchaseHistoryProps = {
  profile: CustomerProfile;
};

export const CustomerPurchaseHistory = ({ profile }: CustomerPurchaseHistoryProps) => {
  const recent = profile.orders.slice(0, 5);

  return (
    <section
      aria-label="Historial de compras"
      className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
    >
      <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
        Historial de compras
      </h3>

      {recent.length ? (
        <ul className="mt-4 space-y-2">
          {recent.map((order) => (
            <li
              className="rounded-2xl bg-white/80 px-3 py-2 text-sm ring-1 ring-border/60"
              key={order.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black text-foreground">
                  {formatCompactDate(order.date)} · {order.summary}
                </p>
                <p className="font-black tabular-nums">{formatMoney(order.total)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-black uppercase text-muted-foreground">
                  {orderStatusLabels[order.status]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-black uppercase ${paymentStyles[order.paymentStatus]}`}
                >
                  {paymentLabels[order.paymentStatus]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm font-semibold text-muted-foreground">
          Este cliente todavía no tiene pedidos.
        </p>
      )}

      {profile.orders.length > 5 ? (
        <button
          className="mt-4 w-full rounded-full border border-border bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-muted/50"
          type="button"
        >
          Ver historial completo
        </button>
      ) : null}
    </section>
  );
};
