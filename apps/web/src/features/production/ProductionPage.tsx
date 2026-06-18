import { useMemo, useState } from 'react';
import { Factory } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { DeliveryTime } from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import { ProductionPendingCard } from '../dashboard/components/ProductionPendingCard';
import { UpcomingOrdersCard } from '../dashboard/components/UpcomingOrdersCard';
import {
  buildProductionSummaryFromOrders,
  mapOrderToCard,
  today,
} from '../dashboard/dashboard-utils';
import { useOrders, useUpdateOrderStatus } from '../orders/orders-hooks';

const deliveryTimeLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

export const ProductionPage = () => {
  const [referenceDate, setReferenceDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime | ''>('');
  const ordersQuery = useOrders({
    visibility: 'active',
    sortBy: 'deliveryDate',
    sortDir: 'asc',
    pageSize: 100,
  });
  const updateOrderStatus = useUpdateOrderStatus();
  const orders = ordersQuery.data?.orders ?? [];
  const productionSummary = useMemo(
    () => buildProductionSummaryFromOrders(orders, referenceDate),
    [orders, referenceDate],
  );
  const queue = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.status === 'confirmado' &&
            (!deliveryDate || order.deliveryDate === deliveryDate) &&
            (!deliveryTime || order.deliveryTime === deliveryTime),
        )
        .map((order) => mapOrderToCard(order, referenceDate)),
    [deliveryDate, deliveryTime, orders, referenceDate],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Operación de cocina"
        title="Producción"
        description="Qué preparar, para cuándo y en qué cantidad. Los pedidos siguen siendo la fuente única de verdad."
      >
        <Link
          className="rounded-full bg-white px-4 py-2 text-sm font-black text-sidebar transition hover:bg-card"
          to="/orders"
        >
          Administrar pedidos
        </Link>
      </PageHero>

      <section
        aria-label="Filtros de producción"
        className="grid gap-3 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-card sm:grid-cols-3"
      >
        <label className="text-sm font-bold text-foreground">
          Fecha de referencia
          <input
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold"
            onChange={(event) => setReferenceDate(event.target.value)}
            type="date"
            value={referenceDate}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Entrega
          <input
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold"
            onChange={(event) => setDeliveryDate(event.target.value)}
            type="date"
            value={deliveryDate}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Turno
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold"
            onChange={(event) => setDeliveryTime(event.target.value as DeliveryTime | '')}
            value={deliveryTime}
          >
            <option value="">Todos</option>
            {Object.entries(deliveryTimeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {ordersQuery.isLoading ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted-foreground shadow-card">
          Cargando producción pendiente...
        </p>
      ) : null}
      {ordersQuery.isError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
          No se pudo cargar la producción.
        </p>
      ) : null}

      <ProductionPendingCard summary={productionSummary} />
      <UpcomingOrdersCard
        className="order-none"
        description="Pedidos confirmados ordenados por entrega. Marcarlos preparados actualiza Pedidos y Dashboard."
        eyebrow="Cola de cocina"
        isActionPending={updateOrderStatus.isPending}
        linkLabel="Ver todos"
        onMarkPrepared={(orderId) =>
          updateOrderStatus.mutate({ id: orderId, status: 'preparado' })
        }
        orders={queue}
        title="Próximos a producir"
      />

      <p className="flex items-center gap-2 rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm font-semibold text-muted-foreground shadow-card">
        <Factory className="h-4 w-4 text-primary" aria-hidden={true} />
        Packaging es una estimación operativa derivada de las unidades pendientes; no descuenta
        stock automáticamente.
      </p>
    </div>
  );
};
