import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3 } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  formatDozens,
  getDashboardOrderCode,
  getPaymentTone,
  getProductionTone,
  getUrgencyTone,
  type DashboardOrderCard,
} from '../dashboard-utils';
import { EmptyState, SectionCard, StatusBadge } from './shared';

const ActionButton = ({
  ariaLabel,
  children,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    aria-label={ariaLabel}
    className="min-h-11 rounded-xl border border-border bg-white px-3 text-xs font-black text-sidebar transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

export const UpcomingOrdersCard = ({
  className = 'order-3',
  compactOnMobile = false,
  description = 'Prioridad de entrega, cobro y producción sin meterte en una tabla pesada.',
  eyebrow = 'Pedidos próximos / urgentes',
  isActionPending = false,
  linkLabel = 'Ver pedidos',
  onMarkDelivered,
  onMarkPaid,
  onMarkPrepared,
  orders,
  title = 'Agenda inmediata',
}: {
  className?: string;
  compactOnMobile?: boolean;
  description?: string;
  eyebrow?: string;
  isActionPending?: boolean;
  linkLabel?: string;
  onMarkDelivered?: (orderId: string) => void;
  onMarkPaid?: (orderId: string) => void;
  onMarkPrepared?: (orderId: string) => void;
  orders: DashboardOrderCard[];
  title?: string;
}) => (
  <SectionCard className={cn(className, compactOnMobile && 'p-3 lg:p-5')}>
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        compactOnMobile ? 'mb-3 lg:mb-5' : 'mb-5',
      )}
    >
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Clock3 className="size-4" aria-hidden /> {eyebrow}
        </p>
        <h2
          className={cn(
            'mt-1 font-black tracking-tight text-foreground',
            compactOnMobile ? 'text-xl lg:text-2xl' : 'text-2xl',
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            'mt-1 text-sm font-semibold text-muted-foreground',
            compactOnMobile && 'hidden lg:block',
          )}
        >
          {description}
        </p>
      </div>
      <Link
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-black text-primary transition-colors hover:bg-muted"
        to="/orders"
      >
        {linkLabel} <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>

    {orders.length === 0 ? (
      <EmptyState
        title="No hay pedidos próximos"
        description="Cuando cargues pedidos activos, van a aparecer en esta agenda."
      />
    ) : (
      <div className="grid gap-3">
        {orders.slice(0, 5).map((order, index) => {
          const orderCode = getDashboardOrderCode(order.id);
          const actionContext = `${order.customerName} ${orderCode}`;

          return (
            <article
              className={cn(
                'rounded-[1.35rem] border border-border/70 bg-background/80 ring-1 ring-white/60 transition-colors hover:bg-white',
                compactOnMobile ? 'p-3 lg:p-4' : 'p-4',
                compactOnMobile && index >= 3 && 'hidden lg:block',
              )}
              key={order.id}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        'min-w-0 truncate font-black text-foreground',
                        compactOnMobile ? 'text-base lg:text-lg' : 'text-lg',
                      )}
                    >
                      {order.customerName}
                    </h3>
                    <StatusBadge tone={getUrgencyTone(order.urgency)}>{order.urgency}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    {orderCode} · {order.deliveryLabel}
                  </p>
                </div>
                <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-sidebar ring-1 ring-border/70">
                  {order.dozens === null ? 'Docenas sin detalle' : formatDozens(order.dozens)}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge tone={getPaymentTone(order.paymentStatus)}>
                  {order.paymentStatus}
                </StatusBadge>
                <StatusBadge tone={getProductionTone(order.productionStatus)}>
                  {order.productionStatus}
                </StatusBadge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  className="inline-flex min-h-11 items-center rounded-xl bg-sidebar px-3 text-xs font-black text-white transition-colors hover:bg-sidebar/90"
                  to={order.href}
                >
                  Ver pedido
                </Link>
                {order.status === 'confirmado' && onMarkPrepared ? (
                  <ActionButton
                    ariaLabel={`Marcar preparado ${actionContext}`}
                    disabled={isActionPending}
                    onClick={() => onMarkPrepared?.(order.id)}
                  >
                    Marcar preparado
                  </ActionButton>
                ) : null}
                {!order.isPaid && onMarkPaid ? (
                  <ActionButton
                    ariaLabel={`Marcar pagado ${actionContext}`}
                    disabled={isActionPending}
                    onClick={() => onMarkPaid?.(order.id)}
                  >
                    Marcar pagado
                  </ActionButton>
                ) : null}
                {order.status !== 'entregado' && onMarkDelivered ? (
                  <ActionButton
                    ariaLabel={`Confirmar entrega ${actionContext}`}
                    disabled={isActionPending}
                    onClick={() => onMarkDelivered?.(order.id)}
                  >
                    Confirmar entrega
                  </ActionButton>
                ) : null}
              </div>
            </article>
          );
        })}
        {compactOnMobile && orders.length > 3 ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl text-sm font-black text-primary ring-1 ring-border/70 lg:hidden"
            to="/orders"
          >
            Ver todos los pedidos
          </Link>
        ) : null}
      </div>
    )}
  </SectionCard>
);
