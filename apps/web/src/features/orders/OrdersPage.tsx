import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Banknote,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  ClipboardList,
  Edit3,
  History,
  Flame,
  MapPin,
  Minus,
  NotebookText,
  Package,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  StickyNote,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react';

import {
  calculateItemPrice,
  type CreateOrderInput,
  type OrderStatus,
  type UpdateOrderInput,
} from '@te-pinta/shared';

import { useCustomers } from '../customers/customers-hooks';
import { useMenuItems } from '../menu/menu-hooks';
import {
  useCreateOrder,
  useDeleteOrder,
  useOrderDetail,
  useOrders,
  useUpdateOrder,
  useUpdateOrderPayment,
  useUpdateOrderStatus,
} from './orders-hooks';
import { getOrder, type OrderDetail } from './orders-api';
import { useDeliveryFee } from './settings-hooks';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type CustomerMode = 'existing' | 'new';
type DeliveryTypeFormValue = '' | 'retiro' | 'envio';
type OrderVisibilityFilter = 'active' | 'finalized';
type OrderSortOption =
  | 'date_asc'
  | 'date_desc'
  | 'name_asc'
  | 'name_desc'
  | 'total_desc'
  | 'total_asc';
type OrderStatusFilter = 'todos' | OrderStatus;
type OrderMethodFilter = 'todos' | 'envio' | 'retiro' | 'cocinado' | 'pagado';

type OrderFormState = {
  customerMode: CustomerMode;
  existingCustomerId: string;
  newCustomerName: string;
  newCustomerPhone: string;
  newCustomerAddress: string;
  deliveryDate: string;
  deliveryTime: 'mediodia' | 'tarde' | 'noche';
  deliveryType: DeliveryTypeFormValue;
  cooked: boolean;
  notes: string;
  discountPercent: string;
  quantities: Record<string, number>;
};

const initialFormState: OrderFormState = {
  customerMode: 'existing',
  existingCustomerId: '',
  newCustomerName: '',
  newCustomerPhone: '',
  newCustomerAddress: '',
  deliveryDate: '',
  deliveryTime: 'mediodia',
  deliveryType: '',
  cooked: false,
  notes: '',
  discountPercent: '0',
  quantities: {},
};

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const statusConfig: Record<
  OrderStatus,
  { label: string; shortLabel: string; btn: string; btnActive: string; line: string; badge: string }
> = {
  confirmado: {
    label: 'Confirmado',
    shortLabel: 'C',
    btn: 'border-red-300 text-red-700 hover:bg-red-50',
    btnActive: 'bg-red-600 border-red-600 text-white shadow-sm',
    line: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
  preparado: {
    label: 'Preparado',
    shortLabel: 'P',
    btn: 'border-amber-300 text-amber-800 hover:bg-amber-50',
    btnActive: 'bg-amber-500 border-amber-500 text-white shadow-sm',
    line: 'bg-yellow-400',
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  },
  entregado: {
    label: 'Entregado',
    shortLabel: 'E',
    btn: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
    btnActive: 'bg-emerald-600 border-emerald-600 text-white shadow-sm',
    line: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
};

const orderStatuses: OrderStatus[] = ['confirmado', 'preparado', 'entregado'];

const deliveryTimeLabels: Record<OrderFormState['deliveryTime'], string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const deliveryTimeBadgeClassNames: Record<OrderFormState['deliveryTime'], string> = {
  mediodia: 'bg-yellow-100 text-yellow-900 ring-1 ring-yellow-200',
  tarde: 'bg-orange-100 text-orange-900 ring-1 ring-orange-200',
  noche: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200',
};

const orderSortLabels: Record<OrderSortOption, string> = {
  date_asc: 'Fecha: más cercana',
  date_desc: 'Fecha: más lejana',
  name_asc: 'Nombre A-Z',
  name_desc: 'Nombre Z-A',
  total_desc: 'Precio mayor',
  total_asc: 'Precio menor',
};

const orderMethodFilterLabels: Record<OrderMethodFilter, string> = {
  todos: 'Método: Todos',
  envio: 'Envío',
  retiro: 'Retiro',
  cocinado: 'Cocinado',
  pagado: 'Pagado',
};

const detailStatusConfig: Record<
  OrderStatus,
  { label: string; badge: string; action: string; accent: string }
> = {
  confirmado: {
    label: 'En preparación',
    badge: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
    action: 'Marcar como listo',
    accent: 'text-orange-700',
  },
  preparado: {
    label: 'Listo para retirar',
    badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    action: 'Marcar como listo',
    accent: 'text-emerald-700',
  },
  entregado: {
    label: 'Entregado',
    badge: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    action: 'Entregado',
    accent: 'text-emerald-700',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;

const formatDateAr = (date: string): string => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year}` : date;
};

const toNumber = (value: string): number => Number(value || 0);
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const isFinalizedOrder = (order: { status: OrderStatus; isPaid: boolean }): boolean =>
  order.status === 'entregado' && order.isPaid;

const compareByDate = (a: { deliveryDate: string }, b: { deliveryDate: string }): number =>
  a.deliveryDate.localeCompare(b.deliveryDate);

const toQuantitiesByMenuItemId = (items: { menuItemId: string; quantity: number }[]) =>
  items.reduce<Record<string, number>>((quantities, item) => {
    quantities[item.menuItemId] = item.quantity;
    return quantities;
  }, {});

const getOrderCode = (id: string): string => {
  const lastSegment = id.split('-').at(-1) ?? id;
  return /^\d+$/.test(lastSegment)
    ? `#P-${lastSegment.padStart(5, '0')}`
    : `#${lastSegment.slice(-6).toUpperCase()}`;
};

const getTodayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const normalizeText = (value: string): string => value.toLocaleLowerCase('es-AR');

const buildPhoneHref = (phone: string): string => `tel:${phone.replace(/\D/g, '')}`;
const buildWhatsAppHref = (phone: string): string =>
  `https://wa.me/54${phone.replace(/\D/g, '')}`;
const buildMapsHref = (address?: string | null): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;

const useIsDesktopDetail = () => {
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

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/**
 * Botón de toggle para selección de tipo (retiro/envío, crudo/cocinado).
 * Más denso y táctil que el diseño original.
 */
const ToggleOption = ({
  isSelected,
  onClick,
  icon: Icon,
  label,
}: {
  isSelected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) => (
  <button
    aria-pressed={isSelected}
    className={[
      'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-150',
      isSelected
        ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.01]'
        : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-orange-50/60',
    ].join(' ')}
    onClick={onClick}
    type="button"
  >
    <Icon className="h-4 w-4 shrink-0" />
    {label}
  </button>
);

/**
 * Skeleton de carga — usa la clase animate-skeleton del globals.css.
 */
const SkeletonRow = () => <div className="animate-skeleton h-20 rounded-2xl" />;

type OrderDetailTab = 'summary' | 'history' | 'notes';

type OrderDetailPanelProps = {
  detail: OrderDetail | undefined;
  isLoading: boolean;
  isMobile?: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onCancel: (id: string, customerName: string) => void;
  onMarkStatus: (id: string, status: OrderStatus) => void;
};

const OrderDetailPanel = ({
  detail,
  isLoading,
  isMobile = false,
  onClose,
  onEdit,
  onCancel,
  onMarkStatus,
}: OrderDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<OrderDetailTab>('summary');

  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 text-center text-sm font-semibold text-muted-foreground">
        No se pudo cargar el detalle del pedido.
      </div>
    );
  }

  const status = detailStatusConfig[detail.status];
  const deliveryMethodClass =
    detail.deliveryType === 'envio'
      ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200'
      : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200';
  const timeline = [
    { label: 'Pedido confirmado', active: true },
    { label: 'Preparación lista', active: detail.status === 'preparado' || detail.status === 'entregado' },
    { label: 'Pedido entregado', active: detail.status === 'entregado' },
    { label: detail.isPaid ? 'Pago registrado' : 'Pago pendiente', active: detail.isPaid },
  ];

  const tabs: { id: OrderDetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'summary', label: 'Resumen', icon: ReceiptText },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'notes', label: 'Notas', icon: StickyNote },
  ];

  const actions = (
    <div
      aria-label="Acciones principales del pedido"
      className={[
        'grid grid-cols-2 gap-2 border-t border-border bg-card/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur',
        isMobile ? 'fixed inset-x-0 bottom-0 z-[60] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]' : '',
      ].join(' ')}
    >
      <button
        className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-black text-foreground transition hover:border-primary/30 hover:text-primary"
        onClick={() => onEdit(detail.id)}
        type="button"
      >
        Editar pedido
      </button>
      <button
        className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-50"
        disabled={detail.status === 'preparado'}
        onClick={() => onMarkStatus(detail.id, 'preparado')}
        type="button"
      >
        Marcar como listo
      </button>
      <button
        className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
        disabled={detail.status === 'entregado'}
        onClick={() => onMarkStatus(detail.id, 'entregado')}
        type="button"
      >
        Entregado
      </button>
      <button
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
        onClick={() => onCancel(detail.id, detail.customer.name)}
        type="button"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <div className={['flex min-h-full flex-col', isMobile ? 'pb-40' : ''].join(' ')}>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Detalle del pedido
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
              Pedido {getOrderCode(detail.id)}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${status.badge}`}>
                {status.label}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${deliveryMethodClass}`}>
                {detail.deliveryType === 'envio' ? 'Envío' : 'Retiro'}
              </span>
              {detail.cooked && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-800 ring-1 ring-red-200">
                  Cocinado
                </span>
              )}
            </div>
          </div>
          <button
            aria-label={isMobile ? 'Volver a pedidos' : 'Cerrar detalle'}
            className="rounded-xl border border-border bg-white p-2.5 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            {isMobile ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <nav
        aria-label="Secciones del detalle"
        className={[
          'grid grid-cols-3 gap-2 border-b border-border bg-card/95 px-5 py-3 backdrop-blur',
          isMobile ? 'fixed inset-x-3 bottom-24 z-[55] rounded-2xl border shadow-xl' : 'sticky top-[105px] z-10',
        ].join(' ')}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isSelected = activeTab === id;
          return (
            <button
              aria-selected={isSelected}
              className={[
                'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition',
                isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted',
              ].join(' ')}
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {activeTab === 'summary' && (
          <>
            <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Cliente</h4>
              </div>
              <p className="text-lg font-black text-foreground">{detail.customer.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Phone className="h-4 w-4" /> {detail.customer.phone}
              </p>
              {detail.customer.address && (
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {detail.customer.address}
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <a className="rounded-xl bg-muted px-3 py-2 text-center text-sm font-black text-foreground" href={buildPhoneHref(detail.customer.phone)}>
                  Llamar
                </a>
                <a className="rounded-xl bg-emerald-100 px-3 py-2 text-center text-sm font-black text-emerald-800" href={buildWhatsAppHref(detail.customer.phone)} rel="noreferrer" target="_blank">
                  WhatsApp
                </a>
                <a className="rounded-xl bg-sky-100 px-3 py-2 text-center text-sm font-black text-sky-800" href={buildMapsHref(detail.customer.address)} rel="noreferrer" target="_blank">
                  Mapa
                </a>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Entrega</h4>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-muted-foreground">Fecha</span><br /><b>{formatDateAr(detail.deliveryDate)}</b></p>
                <p><span className="font-bold text-muted-foreground">Horario</span><br /><b>{deliveryTimeLabels[detail.deliveryTime]}</b></p>
                <p><span className="font-bold text-muted-foreground">Método</span><br /><b>{detail.deliveryType === 'envio' ? 'Envío' : 'Retiro'}</b></p>
                <p><span className="font-bold text-muted-foreground">Costo envío</span><br /><b>{formatMoney(detail.deliveryFee)}</b></p>
              </div>
              <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm font-semibold text-muted-foreground">
                Referencia: {detail.notes?.trim() || detail.customer.address || 'Sin referencia cargada'}
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Productos</h4>
              </div>
              <div className="divide-y divide-border">
                {detail.items.map((item) => (
                  <div className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0" key={item.id}>
                    <div>
                      <p className="font-black text-foreground">{item.menuItemName}</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {item.quantity} unidades · {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-black tabular-nums text-foreground">{formatMoney(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-primary/8 p-4">
              <div className="space-y-2 text-sm font-semibold text-muted-foreground">
                <p className="flex justify-between"><span>Subtotal</span><b className="text-foreground">{formatMoney(detail.subtotal)}</b></p>
                <p className="flex justify-between"><span>Envío</span><b className="text-foreground">{formatMoney(detail.deliveryFee)}</b></p>
                {detail.discountPercent > 0 && (
                  <p className="flex justify-between"><span>Descuento</span><b className="text-emerald-700">{detail.discountPercent}%</b></p>
                )}
                <p className="flex justify-between border-t border-primary/20 pt-3 text-lg text-foreground">
                  <span>Total</span><b className="text-2xl text-primary">{formatMoney(detail.total)}</b>
                </p>
              </div>
            </section>
          </>
        )}

        {activeTab === 'history' && (
          <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <h4 className="mb-4 font-black text-foreground">Historial de cambios</h4>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div className="flex gap-3" key={event.label}>
                  <span className={`mt-1 h-3 w-3 rounded-full ${event.active ? 'bg-primary' : 'bg-muted-foreground/25'}`} />
                  <div>
                    <p className={event.active ? 'font-black text-foreground' : 'font-semibold text-muted-foreground'}>
                      {event.label}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {event.active ? (index === 0 ? formatDateAr(detail.deliveryDate) : 'Actualizado recientemente') : 'Pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'notes' && (
          <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <NotebookText className="h-4 w-4 text-primary" />
              <h4 className="font-black text-foreground">Notas del pedido</h4>
            </div>
            <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-muted-foreground">
              {detail.notes?.trim() || 'Sin notas cargadas para este pedido.'}
            </p>
          </section>
        )}
      </div>

      {!isMobile && actions}
      {isMobile && actions}
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

export const OrdersPage = () => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<OrderVisibilityFilter>('active');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('todos');
  const [methodFilter, setMethodFilter] = useState<OrderMethodFilter>('todos');
  const [sortOption, setSortOption] = useState<OrderSortOption>('date_asc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [form, setForm] = useState<OrderFormState>(initialFormState);

  const ordersQuery = useOrders();
  const orderDetailQuery = useOrderDetail(expandedOrderId);
  const customersQuery = useCustomers();
  const menuItemsQuery = useMenuItems();
  const deliveryFeeQuery = useDeliveryFee();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const updateOrderStatus = useUpdateOrderStatus();
  const updateOrderPayment = useUpdateOrderPayment();
  const isDesktopDetail = useIsDesktopDetail();

  useEffect(() => {
    if (!expandedOrderId || !isDesktopDetail) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedOrderId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedOrderId, isDesktopDetail]);

  useEffect(() => {
    if (isDesktopDetail) return;
    const handlePopState = () => setExpandedOrderId(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDesktopDetail]);

  // ─── Datos derivados ────────────────────────────────────────────────────────

  const allOrders = ordersQuery.data ?? [];

  const visibleOrders = useMemo(() => {
    const query = normalizeText(orderSearch.trim());
    const filteredOrders = allOrders.filter((order) => {
      const matchesVisibility =
        visibilityFilter === 'finalized' ? isFinalizedOrder(order) : !isFinalizedOrder(order);
      const matchesDate = deliveryDateFilter ? order.deliveryDate === deliveryDateFilter : true;
      const matchesSearch = query
        ? normalizeText(
            `${order.id} ${getOrderCode(order.id)} ${order.customer.name} ${order.customer.phone} ${order.customer.address ?? ''}`,
          ).includes(query)
        : true;
      const matchesStatus = statusFilter === 'todos' ? true : order.status === statusFilter;
      const matchesMethod =
        methodFilter === 'todos'
          ? true
          : methodFilter === 'cocinado'
            ? order.cooked
            : methodFilter === 'pagado'
              ? order.isPaid
              : order.deliveryType === methodFilter;
      return matchesVisibility && matchesDate && matchesSearch && matchesStatus && matchesMethod;
    });

    return [...filteredOrders].sort((a, b) => {
      switch (sortOption) {
        case 'date_asc':
          return compareByDate(a, b) || a.customer.name.localeCompare(b.customer.name, 'es-AR');
        case 'date_desc':
          return compareByDate(b, a) || a.customer.name.localeCompare(b.customer.name, 'es-AR');
        case 'name_asc':
          return a.customer.name.localeCompare(b.customer.name, 'es-AR');
        case 'name_desc':
          return b.customer.name.localeCompare(a.customer.name, 'es-AR');
        case 'total_desc':
          return b.total - a.total;
        case 'total_asc':
          return a.total - b.total;
      }
    });
  }, [
    allOrders,
    deliveryDateFilter,
    methodFilter,
    orderSearch,
    sortOption,
    statusFilter,
    visibilityFilter,
  ]);

  const summary = useMemo(() => {
    const activeOrders = allOrders.filter((order) => !isFinalizedOrder(order));
    const finalizedOrders = allOrders.filter(isFinalizedOrder);
    const pendingOrders = activeOrders.filter((order) => order.status !== 'entregado');
    const salesDate = deliveryDateFilter || getTodayIsoDate();
    const dailySales = allOrders
      .filter((order) => order.deliveryDate === salesDate)
      .reduce((total, order) => total + order.total, 0);

    return {
      active: activeOrders.length,
      finalized: finalizedOrders.length,
      pending: pendingOrders.length,
      dailySales,
    };
  }, [allOrders, deliveryDateFilter]);

  const activeMenuItems = useMemo(
    () => (menuItemsQuery.data ?? []).filter((item) => item.isActive),
    [menuItemsQuery.data],
  );

  const selectedItems = useMemo(
    () =>
      activeMenuItems
        .map((menuItem) => ({ menuItem, quantity: form.quantities[menuItem.id] ?? 0 }))
        .filter(({ quantity }) => quantity > 0),
    [activeMenuItems, form.quantities],
  );

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase('es-AR');
    const customers = customersQuery.data ?? [];
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone} ${customer.address ?? ''}`
        .toLocaleLowerCase('es-AR')
        .includes(query),
    );
  }, [customerSearch, customersQuery.data]);

  const preview = useMemo(() => {
    const subtotal = selectedItems.reduce((total, { menuItem, quantity }) => {
      return (
        total +
        calculateItemPrice({
          quantity,
          priceUnit: menuItem.priceUnit,
          priceHalfDozen: menuItem.priceHalfDozen,
          priceDozen: menuItem.priceDozen,
        }).total
      );
    }, 0);
    const discountPercent = toNumber(form.discountPercent);
    const deliveryFee = form.deliveryType === 'envio' ? (deliveryFeeQuery.data ?? 0) : 0;
    const discount = subtotal * (discountPercent / 100);
    const total = roundMoney(subtotal - discount + deliveryFee);
    return { subtotal, discount, deliveryFee, total };
  }, [deliveryFeeQuery.data, form.deliveryType, form.discountPercent, selectedItems]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const setQuantity = (menuItemId: string, delta: number) => {
    setForm((current) => {
      const currentQuantity = current.quantities[menuItemId] ?? 0;
      const nextQuantity = Math.max(0, currentQuantity + delta);
      const nextQuantities = { ...current.quantities };
      if (nextQuantity === 0) {
        delete nextQuantities[menuItemId];
      } else {
        nextQuantities[menuItemId] = nextQuantity;
      }
      return { ...current, quantities: nextQuantities };
    });
  };

  const buildValidationErrors = () => {
    const errors: string[] = [];
    if (form.customerMode === 'existing' && !form.existingCustomerId)
      errors.push('Seleccioná un cliente.');
    if (form.customerMode === 'new') {
      if (!form.newCustomerName.trim()) errors.push('Nombre del cliente requerido.');
      if (!form.newCustomerPhone.trim()) errors.push('Teléfono del cliente requerido.');
    }
    if (!form.deliveryDate) errors.push('Fecha de entrega requerida.');
    if (!form.deliveryType) errors.push('Elegí envío o retiro.');
    if (selectedItems.length === 0) errors.push('Agregá al menos una variedad.');
    return errors;
  };

  const buildOrderInput = (): CreateOrderInput => ({
    customer:
      form.customerMode === 'existing'
        ? { existingCustomerId: form.existingCustomerId }
        : {
            newCustomer: {
              name: form.newCustomerName,
              phone: form.newCustomerPhone,
              ...(form.newCustomerAddress.trim() ? { address: form.newCustomerAddress } : {}),
            },
          },
    deliveryDate: form.deliveryDate,
    deliveryTime: form.deliveryTime,
    deliveryType: form.deliveryType as 'retiro' | 'envio',
    cooked: form.cooked,
    notes: form.notes.trim() || undefined,
    discountPercent: toNumber(form.discountPercent),
    deliveryFee: preview.deliveryFee,
    items: selectedItems.map(({ menuItem, quantity }) => ({
      menuItemId: menuItem.id,
      quantity,
    })),
  });

  const resetAndCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingOrderId(null);
    setCustomerSearch('');
    setFormErrors([]);
    setForm(initialFormState);
  };

  const openCreateDialog = () => {
    setEditingOrderId(null);
    setCustomerSearch('');
    setFormErrors([]);
    setForm(initialFormState);
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = buildValidationErrors();
    setFormErrors(validationErrors);
    if (validationErrors.length > 0) return;

    const input = buildOrderInput();
    const order = editingOrderId
      ? await updateOrder.mutateAsync({ id: editingOrderId, updates: input as UpdateOrderInput })
      : await createOrder.mutateAsync(input);
    setExpandedOrderId(order.id);
    resetAndCloseCreateDialog();
  };

  const markStatus = async (id: string, status: OrderStatus) => {
    await updateOrderStatus.mutateAsync({ id, status });
  };

  const markPayment = async (id: string, isPaid: boolean) => {
    await updateOrderPayment.mutateAsync({ id, isPaid });
  };

  const editOrder = async (id: string) => {
    const order = await getOrder(id);
    setEditingOrderId(id);
    setCustomerSearch(order.customer.name);
    setFormErrors([]);
    setForm({
      customerMode: 'existing',
      existingCustomerId: order.customer.id,
      newCustomerName: '',
      newCustomerPhone: '',
      newCustomerAddress: '',
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      deliveryType: order.deliveryType,
      cooked: order.cooked,
      notes: order.notes ?? '',
      discountPercent: String(order.discountPercent),
      quantities: toQuantitiesByMenuItemId(order.items),
    });
    setIsCreateDialogOpen(true);
  };

  const removeOrder = async (id: string, customerName: string) => {
    const confirmed = window.confirm(`¿Eliminar el pedido de ${customerName}?`);
    if (!confirmed) return;
    await deleteOrder.mutateAsync(id);
    setExpandedOrderId((current) => (current === id ? null : current));
  };

  const toggleOrderDetail = (id: string) => {
    setExpandedOrderId((current) => {
      if (current === id) return null;
      if (!isDesktopDetail && typeof window !== 'undefined') {
        window.history.pushState({ orderDetailId: id }, '', window.location.href);
      }
      return id;
    });
  };

  const closeOrderDetail = () => {
    if (!isDesktopDetail && expandedOrderId && window.history.state?.orderDetailId) {
      window.history.back();
      return;
    }
    setExpandedOrderId(null);
  };

  const cancelOrderFromDetail = (id: string, customerName: string) => {
    void removeOrder(id, customerName);
  };

  const editOrderFromDetail = (id: string) => {
    void editOrder(id);
  };

  const markStatusFromDetail = (id: string, status: OrderStatus) => {
    void markStatus(id, status);
  };

  const renderOrderCard = (order: (typeof visibleOrders)[number]) => {
    const isExpanded = expandedOrderId === order.id;
    const productLabel = `${order.itemCount} ${order.itemCount === 1 ? 'producto' : 'productos'}`;

    return (
      <article
        aria-label={`Pedido ${order.customer.name}`}
        aria-selected={isExpanded}
        key={order.id}
        onClick={() => toggleOrderDetail(order.id)}
        className={[
          'relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm shadow-foreground/3 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
          isExpanded
            ? 'border-primary/40 ring-2 ring-primary/15'
            : 'border-border/80',
        ].join(' ')}
      >
        <span
          aria-label={`Indicador de estado ${statusConfig[order.status].label}`}
          className={`absolute inset-y-0 left-0 w-1 ${statusConfig[order.status].line}`}
        />

        <div className="grid gap-4 p-4 pl-5 lg:grid-cols-[1.05fr_1.55fr_1.25fr_1fr_1.1fr_0.9fr_1.3fr] lg:items-center lg:gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Pedido
            </p>
            <p className="font-black text-foreground tabular-nums">{getOrderCode(order.id)}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Pedido registrado</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Cliente
            </p>
            <p className="font-bold text-foreground">{order.customer.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Phone className="h-3 w-3" /> {order.customer.phone}
            </p>
            {order.customer.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" /> {order.customer.address}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Entrega
            </p>
            <p className="flex items-center gap-1 text-sm font-bold text-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDateAr(order.deliveryDate)}
            </p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${deliveryTimeBadgeClassNames[order.deliveryTime]}`}
            >
              <Clock className="h-3 w-3" /> {deliveryTimeLabels[order.deliveryTime]}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Método
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={[
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  order.deliveryType === 'envio'
                    ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-200'
                    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
                ].join(' ')}
              >
                {order.deliveryType === 'envio' ? 'Envío' : 'Retiro'}
              </span>
              {order.cooked && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 ring-1 ring-red-200">
                  Cocinado
                </span>
              )}
            </div>
            {order.deliveryFee > 0 && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                + {formatMoney(order.deliveryFee)}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Estado
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-black ${statusConfig[order.status].badge}`}
            >
              {statusConfig[order.status].label}
            </span>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {order.isPaid ? 'Pagado' : 'No pagado'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Total
            </p>
            <p
              aria-label="Total del pedido"
              className="tabular-nums text-lg font-black text-foreground"
            >
              {formatMoney(order.total)}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{productLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end" onClick={(event) => event.stopPropagation()}>
            {orderStatuses.map((status) => {
              const isActive = order.status === status;
              return (
                <button
                  aria-label={`Estado ${statusConfig[status].label}`}
                  aria-pressed={isActive}
                  className={[
                    'h-8 w-8 rounded-xl border text-sm font-black transition-all duration-150 disabled:opacity-60',
                    isActive
                      ? statusConfig[status].btnActive
                      : `bg-card ${statusConfig[status].btn}`,
                  ].join(' ')}
                  disabled={updateOrderStatus.isPending}
                  key={status}
                  onClick={() => markStatus(order.id, status)}
                  type="button"
                >
                  {statusConfig[status].shortLabel}
                </button>
              );
            })}
            <button
              aria-label={order.isPaid ? 'Marcar como no pagado' : 'Marcar como pagado'}
              aria-pressed={order.isPaid}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-150 disabled:opacity-60',
                order.isPaid
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-card text-gray-400 line-through hover:bg-gray-50',
              ].join(' ')}
              disabled={updateOrderPayment.isPending}
              onClick={() => markPayment(order.id, !order.isPaid)}
              type="button"
            >
              <Banknote className="h-4 w-4" />
            </button>
            <button
              aria-label={isExpanded ? 'Cerrar detalle' : 'Ver detalle'}
              aria-expanded={isExpanded}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
              onClick={() => toggleOrderDetail(order.id)}
              type="button"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              aria-label={`Editar pedido de ${order.customer.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary disabled:opacity-60"
              disabled={updateOrder.isPending}
              onClick={() => void editOrder(order.id)}
              type="button"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              aria-label={`Eliminar pedido de ${order.customer.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-destructive/20 bg-card text-destructive transition hover:bg-destructive/8 disabled:opacity-60"
              disabled={deleteOrder.isPending}
              onClick={() => void removeOrder(order.id, order.customer.name)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  const orderForm = (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      {/* ── Sección: Cliente ── */}
      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UserRound className="h-4 w-4 text-primary" />
          Cliente
        </h4>

        {/* Selector de modo */}
        <div className="flex gap-2">
          {(['existing', 'new'] as CustomerMode[]).map((mode) => (
            <label
              key={mode}
              className={[
                'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150',
                form.customerMode === mode
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-border/80',
              ].join(' ')}
            >
              <input
                className="sr-only"
                checked={form.customerMode === mode}
                onChange={() =>
                  setForm((c) => ({ ...c, customerMode: mode, existingCustomerId: '' }))
                }
                type="radio"
              />
              {mode === 'existing' ? 'Cliente existente' : 'Nuevo cliente'}
            </label>
          ))}
        </div>

        {form.customerMode === 'existing' ? (
          <div className="space-y-2">
            {/* Búsqueda */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                aria-label="Buscar cliente"
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60"
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Nombre, teléfono o dirección..."
                role="searchbox"
                type="search"
                value={customerSearch}
              />
              {customerSearch && (
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setCustomerSearch('')}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Lista de clientes */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
              {filteredCustomers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Sin resultados para "{customerSearch}"
                </p>
              ) : (
                filteredCustomers.map((customer) => {
                  const isSelected = form.existingCustomerId === customer.id;
                  return (
                    <button
                      key={customer.id}
                      aria-label={`Seleccionar cliente ${customer.name}`}
                      className={[
                        'w-full rounded-xl border p-3 text-left transition-all duration-150',
                        isSelected
                          ? 'border-primary/50 bg-primary/8 ring-2 ring-primary/20'
                          : 'border-border bg-background hover:border-primary/30 hover:bg-orange-50/50',
                      ].join(' ')}
                      onClick={() => setForm((c) => ({ ...c, existingCustomerId: customer.id }))}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground text-sm">{customer.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {customer.phone}
                        </span>
                        {customer.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {customer.address}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /*
            Formulario de cliente nuevo.
            Grid de 1 columna en mobile, 3 en desktop.
            Los labels son concissos — no necesitan repetir "nuevo cliente".
          */
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: 'newCustomerName', label: 'Nombre *', type: 'text', inputMode: undefined },
              {
                key: 'newCustomerPhone',
                label: 'Teléfono *',
                type: 'tel',
                inputMode: 'tel' as const,
              },
              { key: 'newCustomerAddress', label: 'Dirección', type: 'text', inputMode: undefined },
            ].map(({ key, label, type, inputMode }) => (
              <label
                key={key}
                className="block text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                {label}
                <input
                  aria-label={
                    key === 'newCustomerName'
                      ? 'Nombre nuevo cliente'
                      : key === 'newCustomerPhone'
                        ? 'Teléfono nuevo cliente'
                        : 'Dirección nuevo cliente'
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
                  inputMode={inputMode}
                  onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
                  type={type}
                  value={form[key as keyof OrderFormState] as string}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ── Sección: Fecha, franja, descuento ── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Fecha de entrega *
          <input
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
            onChange={(e) => setForm((c) => ({ ...c, deliveryDate: e.target.value }))}
            required
            type="date"
            value={form.deliveryDate}
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Franja
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                deliveryTime: e.target.value as OrderFormState['deliveryTime'],
              }))
            }
            value={form.deliveryTime}
          >
            <option value="mediodia">Mediodía</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Descuento %
          <input
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
            inputMode="numeric"
            min="0"
            max="100"
            onChange={(e) => setForm((c) => ({ ...c, discountPercent: e.target.value }))}
            type="number"
            value={form.discountPercent}
          />
        </label>
      </section>

      {/* ── Sección: Tipo de entrega + Cocción (en la misma fila) ── */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Entrega
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ToggleOption
              icon={ShoppingBag}
              isSelected={form.deliveryType === 'retiro'}
              label="Retiro"
              onClick={() => setForm((c) => ({ ...c, deliveryType: 'retiro' }))}
            />
            <ToggleOption
              icon={Truck}
              isSelected={form.deliveryType === 'envio'}
              label="Envío"
              onClick={() => setForm((c) => ({ ...c, deliveryType: 'envio' }))}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cocción
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ToggleOption
              icon={Package}
              isSelected={!form.cooked}
              label="Crudo"
              onClick={() => setForm((c) => ({ ...c, cooked: false }))}
            />
            <ToggleOption
              icon={Flame}
              isSelected={form.cooked}
              label="Cocinado"
              onClick={() => setForm((c) => ({ ...c, cooked: true }))}
            />
          </div>
        </div>
      </section>

      {/* ── Sección: Variedades ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Variedades
          </p>
          {selectedItems.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {selectedItems.reduce((acc, { quantity }) => acc + quantity, 0)} unidades
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {activeMenuItems.map((menuItem) => {
            const quantity = form.quantities[menuItem.id] ?? 0;
            return (
              <article
                aria-label={`Variedad ${menuItem.name}`}
                key={menuItem.id}
                className={[
                  'rounded-2xl border p-3 transition-all duration-150',
                  quantity > 0
                    ? 'border-primary/40 bg-white shadow-sm shadow-primary/8'
                    : 'border-border bg-card',
                ].join(' ')}
              >
                {/* Header del item */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground text-sm">{menuItem.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      Doc.&nbsp;{formatMoney(menuItem.priceDozen)}
                      &ensp;·&ensp; Med.&nbsp;{formatMoney(menuItem.priceHalfDozen)}
                      &ensp;·&ensp; Un.&nbsp;{formatMoney(menuItem.priceUnit)}
                    </p>
                  </div>
                  {/* Cantidad actual — visible rápido */}
                  {quantity > 0 && (
                    <span className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-1 text-sm font-black text-primary tabular-nums">
                      {quantity}
                    </span>
                  )}
                </div>

                {/* Botones de acceso rápido (+12, +6, +1) */}
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    aria-label="+ Docena"
                    className="flex-1 rounded-lg bg-orange-100/80 py-1.5 text-xs font-bold text-orange-900 transition hover:bg-orange-200/80 active:scale-95"
                    onClick={() => setQuantity(menuItem.id, 12)}
                    type="button"
                  >
                    +12
                  </button>
                  <button
                    aria-label="+ Media"
                    className="flex-1 rounded-lg bg-amber-100/80 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-200/80 active:scale-95"
                    onClick={() => setQuantity(menuItem.id, 6)}
                    type="button"
                  >
                    +6
                  </button>
                  <button
                    aria-label="+ Unidad"
                    className="flex-1 rounded-lg bg-primary/10 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20 active:scale-95"
                    onClick={() => setQuantity(menuItem.id, 1)}
                    type="button"
                  >
                    +1
                  </button>
                </div>

                {/* Control fino de cantidad */}
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <button
                    aria-label={`Restar ${menuItem.name}`}
                    className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-30 active:scale-95"
                    disabled={quantity === 0}
                    onClick={() => setQuantity(menuItem.id, -1)}
                    type="button"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">{quantity} u.</span>
                  <button
                    aria-label={`Sumar ${menuItem.name}`}
                    className="rounded-lg bg-primary p-1.5 text-primary-foreground transition hover:bg-primary/80 active:scale-95"
                    onClick={() => setQuantity(menuItem.id, 1)}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Sección: Notas + Resumen ── */}
      <section className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Notas
          <textarea
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
            onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            placeholder="Indicaciones especiales, referencias de dirección..."
            rows={3}
            value={form.notes}
          />
        </label>

        {/* Preview del total — compacto y claro */}
        <div
          aria-label="Preview de total"
          className="flex flex-col justify-between rounded-2xl bg-primary/8 p-4 sm:min-w-[180px]"
        >
          <div className="space-y-1.5">
            <div className="flex justify-between gap-4 text-sm text-muted-foreground">
              <span>
                Subtotal{' '}
                <span className="tabular-nums font-semibold text-foreground">
                  {formatMoney(preview.subtotal)}
                </span>
              </span>
            </div>
            {preview.deliveryFee > 0 && (
              <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                <span>
                  Delivery{' '}
                  <span className="tabular-nums font-semibold text-foreground">
                    {formatMoney(preview.deliveryFee)}
                  </span>
                </span>
              </div>
            )}
            {preview.discount > 0 && (
              <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                <span>
                  Descuento{' '}
                  <span className="tabular-nums font-semibold text-emerald-700">
                    −{formatMoney(preview.discount)}
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 border-t border-primary/20 pt-3">
            <div className="flex justify-between gap-2">
              <span className="text-sm font-bold text-foreground">
                Total{' '}
                <span className="tabular-nums text-xl font-black text-primary">
                  {formatMoney(preview.total)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Errores de validación ── */}
      {formErrors.length > 0 && (
        <div
          aria-label="Errores del pedido"
          aria-live="polite"
          className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3"
          role="status"
        >
          <ul className="space-y-0.5 text-sm font-semibold text-destructive">
            {formErrors.map((error) => (
              <li key={error} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-xs">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Error de red ── */}
      {createOrder.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm font-semibold text-destructive">
          No se pudo crear el pedido. Intentá de nuevo.
        </p>
      )}

      {/* ── Submit ── */}
      <button
        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-black text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={createOrder.isPending || updateOrder.isPending}
        type="submit"
      >
        {createOrder.isPending || updateOrder.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {editingOrderId ? 'Guardando cambios...' : 'Creando pedido...'}
          </span>
        ) : editingOrderId ? (
          'Guardar cambios'
        ) : (
          'Crear pedido'
        )}
      </button>
    </form>
  );

  // ─── Render principal ────────────────────────────────────────────────────────

  const summaryCards = [
    {
      label: 'Pedidos activos',
      value: summary.active,
      hint: 'En preparación',
      icon: ClipboardList,
      tone: 'bg-red-100 text-primary',
    },
    {
      label: 'Pedidos finalizados',
      value: summary.finalized,
      hint: 'Entregados y pagos',
      icon: CheckCircle2,
      tone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Pendientes',
      value: summary.pending,
      hint: 'Por preparar',
      icon: Clock,
      tone: 'bg-yellow-100 text-yellow-900',
    },
    {
      label: 'Ventas del día',
      value: formatMoney(summary.dailySales),
      hint: deliveryDateFilter ? formatDateAr(deliveryDateFilter) : 'Hoy',
      icon: CircleDollarSign,
      tone: 'bg-indigo-100 text-indigo-800',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Pedidos
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Administrá y seguí todos los pedidos de tu emprendimiento.
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <button
            className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm"
            type="button"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
              {summary.pending}
            </span>
          </button>
        </div>
      </section>

      <section aria-label="Resumen de pedidos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-border/80 bg-white/80 p-5 shadow-sm shadow-foreground/3"
          >
            <div className="flex items-start gap-4">
              <span className={`rounded-xl p-3 ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-black text-foreground tabular-nums">{value}</p>
                <p className="mt-2 text-xs font-bold text-muted-foreground">• {hint}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex gap-8 border-b border-border/80">
          {(['active', 'finalized'] as OrderVisibilityFilter[]).map((filter) => {
            const count = filter === 'active' ? summary.active : summary.finalized;
            const isActive = visibilityFilter === filter;
            return (
              <button
                key={filter}
                aria-pressed={isActive}
                className={[
                  'relative pb-3 text-sm font-black transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
                onClick={() => setVisibilityFilter(filter)}
                type="button"
              >
                {filter === 'active' ? 'Activos' : 'Finalizados'}
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {count}
                </span>
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_180px_170px_170px_180px_auto] xl:items-end">
          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Buscar pedido
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm transition focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                aria-label="Buscar pedido"
                className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
                onChange={(event) => setOrderSearch(event.target.value)}
                placeholder="Buscar pedido, cliente o teléfono..."
                role="searchbox"
                type="search"
                value={orderSearch}
              />
            </div>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Fecha entrega
            <input
              aria-label="Filtrar por fecha de entrega"
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
              onChange={(event) => setDeliveryDateFilter(event.target.value)}
              type="date"
              value={deliveryDateFilter}
            />
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Estado
            <select
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
              onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}
              value={statusFilter}
            >
              <option value="todos">Estado: Todos</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Método
            <select
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
              onChange={(event) => setMethodFilter(event.target.value as OrderMethodFilter)}
              value={methodFilter}
            >
              {(Object.keys(orderMethodFilterLabels) as OrderMethodFilter[]).map((method) => (
                <option key={method} value={method}>
                  {orderMethodFilterLabels[method]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Ordenar por
            <select
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
              onChange={(event) => setSortOption(event.target.value as OrderSortOption)}
              value={sortOption}
            >
              {(Object.keys(orderSortLabels) as OrderSortOption[]).map((option) => (
                <option key={option} value={option}>
                  {orderSortLabels[option]}
                </option>
              ))}
            </select>
          </label>

          <button
            aria-label="+ Nuevo pedido"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </button>
        </div>

        <div
          aria-label="Encabezado de tabla de pedidos"
          className="hidden rounded-sm bg-foreground/5 border-border border-1 px-5 py-3 text-xs font-bold uppercase tracking-wide text-black lg:grid lg:grid-cols-[1.05fr_1.55fr_1.25fr_1fr_1.1fr_0.9fr_1.3fr] lg:gap-5"
        >
          <span>Pedido</span>
          <span>Cliente</span>
          <span>Entrega</span>
          <span>Método</span>
          <span>Estado</span>
          <span>Total</span>
          <span className="text-right">Acciones</span>
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              {visibilityFilter === 'active'
                ? 'No hay pedidos activos'
                : 'No hay pedidos finalizados'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">{visibleOrders.map(renderOrderCard)}</div>
        )}
      </section>

      {expandedOrderId &&
        isDesktopDetail &&
        createPortal(
          <div
            aria-label="Cerrar detalle del pedido"
            className="fixed inset-0 z-40 bg-foreground/5 animate-fade-in"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeOrderDetail();
            }}
          >
            <aside
              aria-label="Detalle del pedido seleccionado"
              aria-modal="true"
              className="ml-auto flex h-full w-[35vw] min-w-[420px] max-w-[560px] animate-slide-in-right flex-col overflow-hidden border-l border-border bg-card shadow-2xl"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <OrderDetailPanel
                detail={orderDetailQuery.data}
                isLoading={orderDetailQuery.isLoading}
                onCancel={cancelOrderFromDetail}
                onClose={closeOrderDetail}
                onEdit={editOrderFromDetail}
                onMarkStatus={markStatusFromDetail}
              />
            </aside>
          </div>,
          document.body,
        )}

      {expandedOrderId &&
        !isDesktopDetail &&
        createPortal(
          <section
            aria-label="Pantalla detalle del pedido"
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background animate-fade-in"
            role="region"
          >
            <OrderDetailPanel
              detail={orderDetailQuery.data}
              isLoading={orderDetailQuery.isLoading}
              isMobile
              onCancel={cancelOrderFromDetail}
              onClose={closeOrderDetail}
              onEdit={editOrderFromDetail}
              onMarkStatus={markStatusFromDetail}
            />
          </section>,
          document.body,
        )}

      {/* ── Modal: Nuevo pedido ── */}
      {isCreateDialogOpen &&
        createPortal(
          /*
            Overlay.
            - Se monta en document.body para cubrir sidebar, header y contenido.
            - En mobile: el modal ocupa casi toda la pantalla desde abajo (sheet pattern)
            - En desktop: dialog centrado con max-width contenido

            Por qué este patrón: en mobile vamos a estar cargando pedidos
            con una mano. El sheet desde abajo es más ergonómico que
            un dialog centrado porque el pulgar llega más fácil a la
            parte inferior de la pantalla.
          */
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-[2px] sm:items-center sm:justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) resetAndCloseCreateDialog();
            }}
          >
            <section
              aria-label={editingOrderId ? 'Editar pedido' : 'Nuevo pedido'}
              aria-modal="true"
              className="animate-modal-enter flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[90dvh] sm:max-w-4xl sm:rounded-3xl"
              role="dialog"
            >
              {/* Header del modal — sticky */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {editingOrderId ? 'Editar pedido' : 'Nuevo pedido'}
                  </h3>
                  {/* Indicador de progreso visual */}
                  {selectedItems.length > 0 && (
                    <p className="mt-0.5 text-xs text-primary font-semibold">
                      {selectedItems.reduce((acc, { quantity }) => acc + quantity, 0)} unidades ·{' '}
                      {formatMoney(preview.total)}
                    </p>
                  )}
                </div>
                <button
                  aria-label="Cerrar"
                  className="rounded-xl border border-border p-2 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  onClick={resetAndCloseCreateDialog}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body scrolleable */}
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{orderForm}</div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
};
