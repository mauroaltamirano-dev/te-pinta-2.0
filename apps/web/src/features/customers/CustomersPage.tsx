import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  Clock3,
  ArrowLeft,
  Home,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import type { CreateCustomerInput } from '@te-pinta/shared';

import type { Customer } from './customers-api';
import {
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from './customers-hooks';
import type { OrderListItem } from '../orders/orders-api';
import { useOrders } from '../orders/orders-hooks';

type CustomerFormState = {
  name: string;
  phone: string;
  address: string;
};

const initialFormState: CustomerFormState = {
  name: '',
  phone: '',
  address: '',
};

const toCreateInput = (form: CustomerFormState): CreateCustomerInput => ({
  name: form.name,
  phone: form.phone,
  ...(form.address.trim() ? { address: form.address } : {}),
});

const toFormState = (customer: Customer): CustomerFormState => ({
  name: customer.name,
  phone: customer.phone,
  address: customer.address ?? '',
});

const useIsDesktopPanel = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
};

const inputClassName =
  'mt-2 w-full rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const customerBadgeClassName =
  'inline-flex h-[1.45rem] w-fit items-center justify-center rounded-full px-2.5 text-[0.7rem] font-black leading-none';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoney = (value: number): string => moneyFormatter.format(value);

const formatDate = (value?: string): string => {
  if (!value) return 'Sin pedidos';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const statusLabels = {
  confirmado: 'Confirmado',
  preparado: 'Preparado',
  entregado: 'Entregado',
} as const;

const shiftLabels = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
} as const;

const deliveryLabels = {
  envio: 'Envío',
  retiro: 'Retiro',
} as const;

const getMostFrequent = <T extends string>(values: T[], fallback: string): string => {
  if (!values.length) return fallback;
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
};

const CustomerDetailAnalytics = ({
  customer,
  orders,
}: {
  customer: Customer;
  orders: OrderListItem[];
}) => {
  const totalSpent = orders.reduce((total, order) => total + order.total, 0);
  const totalUnits = orders.reduce((total, order) => total + order.totalQuantity, 0);
  const unpaidTotal = orders
    .filter((order) => !order.isPaid)
    .reduce((total, order) => total + order.total, 0);
  const averageTicket = orders.length ? totalSpent / orders.length : 0;
  const latestOrder = orders[0] ?? null;
  const preferredShift = getMostFrequent(
    orders.map((order) => order.deliveryTime),
    'Sin datos',
  );
  const preferredDelivery = getMostFrequent(
    orders.map((order) => order.deliveryType),
    'Sin datos',
  );
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-black text-foreground">{customer.name}</p>
          <span
            className={`${customerBadgeClassName} ${
              customer.address?.trim()
                ? 'bg-emerald-600 text-white ring-1 ring-emerald-700/20'
                : 'bg-amber-500 text-white ring-1 ring-amber-600/20'
            }`}
          >
            {customer.address?.trim() ? 'Con dirección' : 'Sin dirección'}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 font-black text-foreground ring-1 ring-border/60">
            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {customer.phone}
          </p>
          <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 font-semibold text-muted-foreground ring-1 ring-border/60">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {customer.address ?? 'Sin dirección cargada'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-wide">Total gastado</p>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">
            {formatMoney(totalSpent)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Ticket promedio: {formatMoney(averageTicket)}.
          </p>
        </article>

        <article className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-wide">Pedidos</p>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">{orders.length}</p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {totalUnits.toLocaleString('es-AR')} unidades acumuladas.
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          <h3 className="text-sm font-black uppercase tracking-wide">Hábitos de compra</h3>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Último pedido</dt>
            <dd className="font-black text-foreground">{formatDate(latestOrder?.deliveryDate)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Horario frecuente</dt>
            <dd className="font-black text-foreground">
              {preferredShift in shiftLabels
                ? shiftLabels[preferredShift as keyof typeof shiftLabels]
                : preferredShift}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Método frecuente</dt>
            <dd className="font-black text-foreground">
              {preferredDelivery in deliveryLabels
                ? deliveryLabels[preferredDelivery as keyof typeof deliveryLabels]
                : preferredDelivery}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Saldo no pagado</dt>
            <dd className="font-black text-foreground">{formatMoney(unpaidTotal)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <h3 className="text-sm font-black uppercase tracking-wide">Historial reciente</h3>
        </div>
        {recentOrders.length ? (
          <div className="mt-4 space-y-2">
            {recentOrders.map((order) => (
              <div
                className="rounded-2xl bg-white/80 px-3 py-2 text-sm ring-1 ring-border/60"
                key={order.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-foreground">
                    #{order.id.slice(0, 6).toUpperCase()}
                  </p>
                  <p className="font-black tabular-nums text-foreground">
                    {formatMoney(order.total)}
                  </p>
                </div>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {formatDate(order.deliveryDate)} · {statusLabels[order.status]} ·{' '}
                  {order.isPaid ? 'Pagado' : 'No pagado'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border/60">
            Todavía no registra pedidos.
          </p>
        )}
      </div>
    </div>
  );
};

export const CustomersPage = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<CustomerFormState>(initialFormState);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const formPanelRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const customersQuery = useCustomers();
  const ordersQuery = useOrders();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const isDesktopPanel = useIsDesktopPanel();
  const allCustomers = customersQuery.data ?? [];
  const selectedCustomer =
    allCustomers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];

    return (ordersQuery.data ?? [])
      .filter((order) => order.customer.id === selectedCustomer.id)
      .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate));
  }, [ordersQuery.data, selectedCustomer]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allCustomers;
    }

    return allCustomers.filter((customer) => {
      const searchable =
        `${customer.name} ${customer.phone} ${customer.address ?? ''}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [allCustomers, search]);

  const customerStats = useMemo(() => {
    const withAddress = allCustomers.filter((customer) => Boolean(customer.address?.trim())).length;
    const withoutAddress = allCustomers.length - withAddress;

    return {
      total: allCustomers.length,
      withAddress,
      withoutAddress,
      visible: filteredCustomers.length,
    };
  }, [allCustomers, filteredCustomers.length]);

  const focusFormPanel = () => {
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    nameInputRef.current?.focus({ preventScroll: true });
  };

  const handleStartCreate = () => {
    setSelectedCustomerId(null);
    setIsCreating(true);
    setForm(initialFormState);
    setTimeout(focusFormPanel, 0);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setIsCreating(false);
    setForm(toFormState(customer));
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const closeMobilePanel = () => {
    setSelectedCustomerId(null);
    setIsCreating(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedCustomerId) {
      await updateCustomer.mutateAsync({ id: selectedCustomerId, updates: toCreateInput(form) });
      if (!isDesktopPanel) closeMobilePanel();
      return;
    }

    await createCustomer.mutateAsync(toCreateInput(form));
    setForm(initialFormState);
    if (!isDesktopPanel) closeMobilePanel();
  };

  const isMobilePanelOpen = !isDesktopPanel && (Boolean(selectedCustomer) || isCreating);
  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="grid animate-fade-in gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0 space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
              Clientes
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Guardá teléfonos, direcciones y datos útiles para cargar pedidos más rápido.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              aria-label="+ Nuevo cliente"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
              onClick={handleStartCreate}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo cliente
            </button>
          </div>
        </section>

        <section
          aria-label="Resumen de clientes"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Clientes
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {customerStats.total}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Base de contactos.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Home className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Con dirección
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {customerStats.withAddress}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Listos para envíos.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Sin dirección
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {customerStats.withoutAddress}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Completar si requiere envío.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Visibles
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {customerStats.visible}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />
              Según el filtro actual.
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm font-bold text-foreground">
              Buscar cliente
              <span className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-full border border-border bg-white py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, teléfono o dirección"
                  type="search"
                  value={search}
                />
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full bg-foreground/5 px-3 py-2 text-xs font-black text-muted-foreground ring-1 ring-border/80">
                {filteredCustomers.length} resultados
              </span>
              {search ? (
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-muted/50 active:scale-[0.98]"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  Limpiar filtro
                </button>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground">Clientes guardados</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Contactos listos para asociar a nuevos pedidos.
                </p>
              </div>
            </div>

            {customersQuery.isLoading ? (
              <p className="mt-6 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground">
                Cargando clientes...
              </p>
            ) : null}

            {customersQuery.isError ? (
              <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                No se pudieron cargar los clientes.
              </p>
            ) : null}

            <div className="mt-5 grid gap-3">
              {filteredCustomers.map((customer) => {
                const hasAddress = Boolean(customer.address?.trim());

                return (
                  <article
                    aria-label={`Cliente ${customer.name}`}
                    aria-selected={selectedCustomerId === customer.id}
                    className={[
                      'group cursor-pointer overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-card',
                      selectedCustomerId === customer.id
                        ? 'border-primary/50 ring-2 ring-primary/10'
                        : 'border-border/80',
                    ].join(' ')}
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`h-1.5 ${hasAddress ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary ring-1 ring-border/80">
                            <UserRound className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <h3 className="text-lg font-black text-foreground">{customer.name}</h3>
                          <span
                            className={`${customerBadgeClassName} ${
                              hasAddress
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-700/20'
                                : 'bg-amber-500 text-white ring-1 ring-amber-600/20'
                            }`}
                          >
                            {hasAddress ? 'Con dirección' : 'Sin dirección'}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 font-black text-foreground ring-1 ring-border/60">
                            <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span className="tabular-nums">{customer.phone}</span>
                          </p>
                          <p className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 font-semibold text-muted-foreground ring-1 ring-border/60">
                            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {customer.address ?? 'Sin dirección cargada'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-destructive transition hover:bg-destructive/8 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                        disabled={deleteCustomer.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteCustomer.mutate(customer.id);
                        }}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>

      {isDesktopPanel && (
        <aside
          aria-label={
            selectedCustomer ? 'Formulario de edición de cliente' : 'Formulario de nuevo cliente'
          }
          className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5 lg:sticky lg:top-0 lg:-my-6 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-r-0 lg:bg-card lg:shadow-2xl"
          ref={formPanelRef}
          role="region"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-foreground">
                {selectedCustomer ? `Editando ${selectedCustomer.name}` : 'Nuevo cliente'}
              </h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {selectedCustomer
                  ? 'Actualizá teléfono y dirección del cliente.'
                  : 'Cargá teléfono y dirección para acelerar pedidos.'}
              </p>
            </div>
          </div>

          {selectedCustomer ? (
            <CustomerDetailAnalytics customer={selectedCustomer} orders={selectedCustomerOrders} />
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-foreground">
              Nombre del cliente
              <input
                className={inputClassName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                ref={nameInputRef}
                required
                value={form.name}
              />
            </label>

            <label className="block text-sm font-bold text-foreground">
              Teléfono
              <input
                className={inputClassName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                required
                type="tel"
                value={form.phone}
              />
            </label>

            <label className="block text-sm font-bold text-foreground">
              Dirección
              <input
                className={inputClassName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                value={form.address}
              />
            </label>

            {createCustomer.isError ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                No se pudo guardar el cliente.
              </p>
            ) : null}

            <button
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Guardando...' : selectedCustomer ? 'Guardar cambios' : 'Guardar cliente'}
            </button>
          </form>
        </aside>
      )}

      {isMobilePanelOpen &&
        createPortal(
          <section
            aria-label={
              selectedCustomer ? 'Formulario de edición de cliente' : 'Formulario de nuevo cliente'
            }
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 animate-fade-in"
            role="region"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                aria-label="Volver"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
                onClick={closeMobilePanel}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                aria-label="Cerrar"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
                onClick={closeMobilePanel}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {selectedCustomer ? `Editando ${selectedCustomer.name}` : 'Nuevo cliente'}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {selectedCustomer
                      ? 'Actualizá teléfono y dirección del cliente.'
                      : 'Cargá teléfono y dirección para acelerar pedidos.'}
                  </p>
                </div>
              </div>
              {selectedCustomer ? (
                <CustomerDetailAnalytics
                  customer={selectedCustomer}
                  orders={selectedCustomerOrders}
                />
              ) : null}
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-foreground">
                  Nombre del cliente
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    ref={nameInputRef}
                    required
                    value={form.name}
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  Teléfono
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    required
                    type="tel"
                    value={form.phone}
                  />
                </label>
                <label className="block text-sm font-bold text-foreground">
                  Dirección
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                    value={form.address}
                  />
                </label>
                <button
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? 'Guardando...'
                    : selectedCustomer
                      ? 'Guardar cambios'
                      : 'Guardar cliente'}
                </button>
              </form>
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
};
