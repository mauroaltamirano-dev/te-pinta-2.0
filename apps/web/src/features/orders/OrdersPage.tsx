import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Clock,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  History,
  Flame,
  MapPin,
  MoreVertical,
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
  calculateOrderPromotion,
  type CreateOrderInput,
  type DeliveryTime,
  getBusinessDateIso,
  type OrderFilters,
  type OrderStatus,
  type UpdateOrderInput,
} from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import { useCustomers } from '../customers/customers-hooks';
import { useMenuItems } from '../menu/menu-hooks';
import {
  useCreateOrder,
  useDeleteOrder,
  useOrderDetail,
  useOrders,
  orderQueryKeys,
  useUpdateOrder,
  useUpdateOrderPayment,
  useUpdateOrderStatus,
} from './orders-hooks';
import { getOrder, type OrderDetail } from './orders-api';
import { useDeliveryFee, useOrderPromotionSettings } from './settings-hooks';

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

type TableSortColumn = 'date' | 'name' | 'total' | 'status' | 'method';
type TableSortDir = 'asc' | 'desc';
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
  addonQuantities: Record<string, number>;
};

const ORDERS_PAGE_SIZE = 25;

const initialFormState: OrderFormState = {
  customerMode: 'existing',
  existingCustomerId: '',
  newCustomerName: '',
  newCustomerPhone: '',
  newCustomerAddress: '',
  deliveryDate: '',
  deliveryTime: 'mediodia',
  deliveryType: 'envio',
  cooked: false,
  notes: '',
  discountPercent: '0',
  quantities: {},
  addonQuantities: {},
};

// ─── Constantes de UI ─────────────────────────────────────────────────────────

const statusConfig: Record<
  OrderStatus,
  { label: string; shortLabel: string; btn: string; btnActive: string; line: string; badge: string }
> = {
  confirmado: {
    label: 'Confirmado',
    shortLabel: 'C',
    btn: 'border-violet-300 text-violet-700 hover:bg-violet-50',
    btnActive: 'bg-violet-600 border-violet-600 text-white shadow-sm',
    line: 'bg-violet-500',
    badge: 'bg-violet-600 text-white ring-1 ring-violet-700/20',
  },
  preparado: {
    label: 'Preparado',
    shortLabel: 'P',
    btn: 'border-amber-300 text-amber-800 hover:bg-amber-50',
    btnActive: 'bg-amber-500 border-amber-500 text-white shadow-sm',
    line: 'bg-yellow-400',
    badge: 'bg-amber-500 text-white ring-1 ring-amber-600/20',
  },
  entregado: {
    label: 'Entregado',
    shortLabel: 'E',
    btn: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
    btnActive: 'bg-emerald-600 border-emerald-600 text-white shadow-sm',
    line: 'bg-emerald-500',
    badge: 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
  },
};

const orderStatuses: OrderStatus[] = ['confirmado', 'preparado', 'entregado'];

const deliveryTimeLabels: Record<OrderFormState['deliveryTime'], string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

const deliveryTimeSortOrder: Record<OrderFormState['deliveryTime'], number> = {
  mediodia: 1,
  tarde: 2,
  noche: 3,
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
    badge: 'bg-orange-600 text-white ring-1 ring-orange-700/20',
    action: 'Marcar como listo',
    accent: 'text-orange-700',
  },
  preparado: {
    label: 'Listo para retirar',
    badge: 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
    action: 'Marcar como listo',
    accent: 'text-emerald-700',
  },
  entregado: {
    label: 'Entregado',
    badge: 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
    action: 'Entregado',
    accent: 'text-emerald-700',
  },
};

const paymentBadgeClassNames = {
  paid: 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
  unpaid: 'bg-red-500 text-white ring-1 ring-red-600/20',
} as const;

const compactBadgeClassName =
  'inline-flex h-[1.45rem] w-fit items-center justify-center rounded-full px-2.5 text-[0.7rem] font-black leading-none';

const compactBadgeStackClassName = 'flex flex-col items-start gap-1.5';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;

const MONTH_ABBR = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const WEEKDAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Formatea '2026-04-29' → '29 abr 2026' */
const formatDateReadable = (date: string): string => {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  const monthName = MONTH_ABBR[parseInt(month, 10) - 1] ?? month;
  return `${parseInt(day, 10)} ${monthName} ${year}`;
};

/** Formatea '2026-04-29' → '29-04-2026' (para exports y detalles) */
const formatDateAr = (date: string): string => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}-${month}-${year}` : date;
};

const parseIsoLocalDate = (date: string): Date | null => {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDeliveryDateMeta = (date: string) => {
  const today = new Date();
  const todayIso = getBusinessDateIso(today);
  const tomorrowIso = getBusinessDateIso(addDays(today, 1));
  const parsed = parseIsoLocalDate(date);
  const weekday = parsed ? WEEKDAY_LABELS[parsed.getDay()] : '';
  const weekdayLabel = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : 'Fecha';
  const dateLabel = formatDateReadable(date);

  if (date === todayIso) {
    return {
      label: 'HOY',
      dateLabel,
      fullLabel: `HOY (${dateLabel})`,
      tone: 'bg-primary text-primary-foreground ring-primary/20 mx-auto',
      accent: 'bg-primary',
    };
  }

  if (date === tomorrowIso) {
    return {
      label: 'MAÑANA',
      dateLabel,
      fullLabel: `MAÑANA (${dateLabel})`,
      tone: 'bg-amber-500 text-white ring-amber-600/20',
      accent: 'bg-amber-500',
    };
  }

  const isWeekend = weekday === 'sábado' || weekday === 'domingo';

  return {
    label: weekdayLabel,
    dateLabel,
    fullLabel: `${weekdayLabel} · ${dateLabel}`,
    tone: isWeekend
      ? 'bg-indigo-100 text-indigo-800 ring-indigo-200'
      : 'bg-sky-100 text-sky-800 ring-sky-200',
    accent: isWeekend ? 'bg-indigo-500' : 'bg-sky-500',
  };
};

const DeliveryDatePill = ({
  date,
  deliveryTime,
}: {
  date: string;
  deliveryTime?: DeliveryTime;
}) => {
  const meta = getDeliveryDateMeta(date);

  return (
    <div
      aria-label={`Entrega ${meta.fullLabel}`}
      className="inline-flex flex-col items-start gap-1"
    >
      <span
        className={`inline-flex h-[1.45rem] items-center rounded-full px-2.5 text-[0.7rem] font-black leading-none tracking-wide ring-1 ${meta.tone}`}
      >
        {meta.label}
      </span>
      <span className="text-sm font-black leading-tight text-foreground tabular-nums">
        {meta.dateLabel}
      </span>
      {deliveryTime ? (
        <span
          className={`mx-auto mt-0.5 ${compactBadgeClassName} gap-1 ${deliveryTimeBadgeClassNames[deliveryTime]}`}
        >
          <Clock className="h-3 w-3" /> {deliveryTimeLabels[deliveryTime]}
        </span>
      ) : null}
    </div>
  );
};

const formatVarietyQuantity = (quantity: number): string =>
  quantity === 1 ? '1' : `${quantity}u.`;

const formatVarietyLabel = (quantity: number, name: string): string =>
  `${formatVarietyQuantity(quantity)} ${name}`;

const getOrderDetailPricing = (detail: OrderDetail) => {
  const itemsSubtotal = roundMoney(detail.items.reduce((total, item) => total + item.subtotal, 0));
  const addonsSubtotal = roundMoney(
    detail.addons.reduce((total, addon) => total + addon.subtotal, 0),
  );
  const baseSubtotal = roundMoney(itemsSubtotal + addonsSubtotal);
  const promoSubtotal = detail.subtotal;
  const promoSavings = Math.max(0, roundMoney(baseSubtotal - promoSubtotal));
  const discount = Math.max(
    0,
    roundMoney(promoSubtotal + detail.deliveryFee + detail.cookingFee - detail.total),
  );
  const totalQuantity = detail.items.reduce((total, item) => total + item.quantity, 0);
  const halfDozenGroups = detail.items.reduce(
    (total, item) => total + Math.floor((item.quantity % 12) / 6),
    0,
  );
  const combinedDozens = Math.floor(halfDozenGroups / 2);
  const fullDozens = Math.floor(totalQuantity / 12);

  const promotionLabels: string[] = [];
  if (promoSavings > 0) {
    promotionLabels.push(
      combinedDozens > 1 ? `${combinedDozens} docenas combinadas` : 'Docena combinada',
    );
  }
  if (detail.discountPercent > 0) {
    promotionLabels.push(
      fullDozens >= 3
        ? `${detail.discountPercent}% descuento 3+ docenas`
        : `${detail.discountPercent}% descuento manual`,
    );
  }

  return {
    itemsSubtotal,
    addonsSubtotal,
    baseSubtotal,
    promoSubtotal,
    promoSavings,
    discount,
    cookingFee: detail.cookingFee,
    totalQuantity,
    combinedDozens,
    promotionLabels,
  };
};

const toNumber = (value: string): number => Number(value || 0);

const isFinalizedOrder = (order: { status: OrderStatus; isPaid: boolean }): boolean =>
  order.status === 'entregado' && order.isPaid;

const toQuantitiesByMenuItemId = (items: { menuItemId: string; quantity: number }[]) =>
  items.reduce<Record<string, number>>((quantities, item) => {
    quantities[item.menuItemId] = item.quantity;
    return quantities;
  }, {});

const toQuantitiesByAddonId = (addons: { addonId: string; quantity: number }[]) =>
  addons.reduce<Record<string, number>>((quantities, addon) => {
    quantities[addon.addonId] = addon.quantity;
    return quantities;
  }, {});

const getOrderCode = (id: string): string => {
  const lastSegment = id.split('-').at(-1) ?? id;
  return /^\d+$/.test(lastSegment)
    ? `#P-${lastSegment.padStart(5, '0')}`
    : `#${lastSegment.slice(-6).toUpperCase()}`;
};

const getTodayIsoDate = (): string => getBusinessDateIso(new Date());

const normalizeText = (value: string): string => value.toLocaleLowerCase('es-AR');

const buildPhoneHref = (phone: string): string => `tel:${phone.replace(/\D/g, '')}`;
const buildWhatsAppHref = (phone: string): string => `https://wa.me/54${phone.replace(/\D/g, '')}`;
const buildMapsHref = (address?: string | null): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? '')}`;

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback below.
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

const buildCustomerOrderMessage = (detail: OrderDetail): string => {
  const pricing = getOrderDetailPricing(detail);
  const lines = [
    `*Pedido ${getOrderCode(detail.id)}*`,
    '',
    '*Productos:*',
    ...detail.items.map(
      (item) =>
        `• ${formatVarietyLabel(item.quantity, item.menuItemName)} — ${formatMoney(item.subtotal)}`,
    ),
    ...detail.addons.map(
      (addon) =>
        `• ${formatVarietyLabel(addon.quantity, addon.name)} — ${formatMoney(addon.subtotal)}`,
    ),
    '',
    '*Resumen:*',
    `• Empanadas: ${formatMoney(pricing.itemsSubtotal)}`,
    pricing.addonsSubtotal > 0
      ? `• Toppings / salsas: ${formatMoney(pricing.addonsSubtotal)}`
      : null,
    pricing.promoSavings > 0 ? `• Promo docena: -${formatMoney(pricing.promoSavings)}` : null,
    detail.deliveryFee > 0 ? `• Envío: ${formatMoney(detail.deliveryFee)}` : null,
    detail.cookingFee > 0 ? `• Cocinado: ${formatMoney(detail.cookingFee)}` : null,
    pricing.discount > 0
      ? `• Descuento ${detail.discountPercent}%: -${formatMoney(pricing.discount)}`
      : null,
    '',
    `*Total: ${formatMoney(detail.total)}*`,
  ];

  return lines.filter((line): line is string => line !== null).join('\n');
};

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
  onCancel: (id: string, customerName: string) => void;
  onMarkStatus: (id: string, status: OrderStatus) => void;
  onMarkPayment: (id: string, isPaid: boolean) => void;
};

const OrderDetailPanel = ({
  detail,
  isLoading,
  isMobile = false,
  onClose,
  onCancel,
  onMarkStatus,
  onMarkPayment,
}: OrderDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<OrderDetailTab>('summary');
  const [clientCopyFeedback, setClientCopyFeedback] = useState<string | null>(null);

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
      ? 'bg-sky-600 text-white ring-1 ring-sky-700/20'
      : 'bg-emerald-600 text-white ring-1 ring-emerald-700/20';
  const timeline = [
    { label: 'Pedido confirmado', active: true },
    {
      label: 'Preparación lista',
      active: detail.status === 'preparado' || detail.status === 'entregado',
    },
    { label: 'Pedido entregado', active: detail.status === 'entregado' },
    { label: detail.isPaid ? 'Pago registrado' : 'Pago pendiente', active: detail.isPaid },
  ];

  const tabs: { id: OrderDetailTab; label: string; icon: React.ElementType }[] = [
    { id: 'summary', label: 'Resumen', icon: ReceiptText },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'notes', label: 'Notas', icon: StickyNote },
  ];

  const pricing = getOrderDetailPricing(detail);

  const readyActionStatus: OrderStatus = detail.status === 'preparado' ? 'confirmado' : 'preparado';
  const readyActionLabel =
    detail.status === 'entregado'
      ? 'Volver a preparado'
      : detail.status === 'preparado'
        ? 'Volver a preparación'
        : 'Marcar como listo';
  const copyCustomerMessage = async () => {
    const copied = await copyTextToClipboard(buildCustomerOrderMessage(detail));
    setClientCopyFeedback(
      copied
        ? 'Detalle copiado para enviar al cliente.'
        : 'No se pudo copiar automático. Probá de nuevo.',
    );
  };

  const actions = (
    <div
      aria-label="Acciones principales del pedido"
      className={[
        'grid grid-cols-2 gap-2 border-t border-border bg-card/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur',
        isMobile
          ? 'fixed inset-x-0 bottom-0 z-[60] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]'
          : 'sticky bottom-0',
      ].join(' ')}
    >
      <button
        className="rounded-full bg-primary/10 px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:bg-primary/10 disabled:text-primary/60"
        onClick={() => onMarkStatus(detail.id, readyActionStatus)}
        type="button"
      >
        {readyActionLabel}
      </button>
      <button
        className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
        disabled={detail.status === 'entregado'}
        onClick={() => onMarkStatus(detail.id, 'entregado')}
        type="button"
      >
        Entregado
      </button>
      <button
        className="col-span-2 rounded-full border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
        onClick={() => onCancel(detail.id, detail.customer.name)}
        type="button"
      >
        Cancelar
      </button>
    </div>
  );

  return (
    <div className={['flex min-h-full flex-col', isMobile ? 'pb-40' : ''].join(' ')}>
      <header className="sticky top-0 z-10 bg-card/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Detalle del pedido
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-foreground">
              {getOrderCode(detail.id)}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`${compactBadgeClassName} ${status.badge}`}>{status.label}</span>
              <button
                aria-label={
                  detail.isPaid ? 'Marcar pedido como no pagado' : 'Marcar pedido como pagado'
                }
                aria-pressed={detail.isPaid}
                className={[
                  compactBadgeClassName,
                  'transition hover:scale-[1.02] active:scale-[0.98]',
                  detail.isPaid ? paymentBadgeClassNames.paid : paymentBadgeClassNames.unpaid,
                ].join(' ')}
                onClick={() => onMarkPayment(detail.id, !detail.isPaid)}
                type="button"
              >
                {detail.isPaid ? 'Pagado' : 'No pagado'}
              </button>
              <span className={`${compactBadgeClassName} ${deliveryMethodClass}`}>
                {detail.deliveryType === 'envio' ? 'Envío' : 'Retiro'}
              </span>
              {detail.cooked && (
                <span
                  className={`${compactBadgeClassName} bg-red-600 text-white ring-1 ring-red-700/20`}
                >
                  Cocinado
                </span>
              )}
            </div>
          </div>
          <button
            aria-label={isMobile ? 'Volver a pedidos' : 'Cerrar detalle'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
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
          'grid grid-cols-3 border-b border-border bg-card/95 px-5 backdrop-blur',
          isMobile ? 'sticky top-[105px] z-10' : 'sticky top-[105px] z-10',
        ].join(' ')}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isSelected = activeTab === id;
          return (
            <button
              aria-selected={isSelected}
              className={[
                '-mb-px flex items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-sm font-black transition',
                isSelected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
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
            <section className="rounded-3xl border border-primary/20 bg-primary/8 p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-black text-foreground">Detalle para cliente</h4>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    Copia un resumen limpio para enviar por WhatsApp.
                  </p>
                  {clientCopyFeedback && (
                    <p className="mt-2 text-xs font-black text-primary" role="status">
                      {clientCopyFeedback}
                    </p>
                  )}
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
                  onClick={() => void copyCustomerMessage()}
                  type="button"
                >
                  <ReceiptText className="h-4 w-4" />
                  Copiar para cliente
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Cliente</h4>
              </div>
              <p className="text-lg font-black text-foreground">{detail.customer.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Phone className="h-4 w-4" /> {detail.customer.phone ?? 'Sin teléfono'}
              </p>
              {detail.customer.address && (
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {detail.customer.address}
                </p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-white">
                {detail.customer.phone ? (
                  <a
                    className="rounded-full bg-sidebar px-3 py-2 text-center text-sm font-black text-white"
                    href={buildPhoneHref(detail.customer.phone)}
                  >
                    Llamar
                  </a>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-2 text-center text-sm font-black text-muted-foreground">
                    Llamar
                  </span>
                )}
                {detail.customer.phone ? (
                  <a
                    className="rounded-full bg-emerald-600 px-3 py-2 text-center text-sm font-black text-white"
                    href={buildWhatsAppHref(detail.customer.phone)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-2 text-center text-sm font-black text-muted-foreground">
                    WhatsApp
                  </span>
                )}
                <a
                  className="rounded-full bg-sky-600 px-3 py-2 text-center text-sm font-black text-white"
                  href={buildMapsHref(detail.customer.address)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Mapa
                </a>
              </div>
            </section>

            <section className="rounded-3xl border border-border/70 bg-white p-4 text-foreground shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Entrega</h4>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-bold text-muted-foreground">Fecha</span>
                  <br />
                  <span className="mt-1 inline-flex">
                    <DeliveryDatePill date={detail.deliveryDate} />
                  </span>
                </div>
                <p>
                  <span className="font-bold text-muted-foreground">Horario</span>
                  <br />
                  <b>{deliveryTimeLabels[detail.deliveryTime]}</b>
                </p>
                <p>
                  <span className="font-bold text-muted-foreground">Método</span>
                  <br />
                  <b>{detail.deliveryType === 'envio' ? 'Envío' : 'Retiro'}</b>
                </p>
                <p>
                  <span className="font-bold text-muted-foreground">Costo envío</span>
                  <br />
                  <b>{formatMoney(detail.deliveryFee)}</b>
                </p>
                <p>
                  <span className="font-bold text-muted-foreground">Costo cocinado</span>
                  <br />
                  <b>{formatMoney(detail.cookingFee)}</b>
                </p>
              </div>
              <p className="mt-3 rounded-full bg-muted/60 px-3 py-2 text-sm font-semibold text-muted-foreground">
                Referencia:{' '}
                {detail.notes?.trim() || detail.customer.address || 'Sin referencia cargada'}
              </p>
            </section>

            <section className="rounded-3xl border border-border/70 bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="font-black text-foreground">Productos</h4>
              </div>
              <div className="divide-y divide-border">
                {detail.items.map((item) => (
                  <div
                    className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0"
                    key={item.id}
                  >
                    <div>
                      <p className="font-black text-foreground">{item.menuItemName}</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {item.quantity} unidades · {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-black tabular-nums text-foreground">
                      {formatMoney(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
              {detail.addons.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                    Toppings / salsas
                  </p>
                  <div className="divide-y divide-border">
                    {detail.addons.map((addon) => (
                      <div
                        className="grid grid-cols-[1fr_auto] gap-3 py-3 first:pt-0 last:pb-0"
                        key={addon.id}
                      >
                        <div>
                          <p className="font-black text-foreground">{addon.name}</p>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {addon.quantity} u. · {formatMoney(addon.unitPrice)}
                          </p>
                        </div>
                        <p className="font-black tabular-nums text-foreground">
                          {formatMoney(addon.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-primary/8 p-4">
              <div className="space-y-2 text-sm font-semibold text-muted-foreground">
                <p className="flex justify-between gap-4">
                  <span>Empanadas</span>
                  <b className="text-foreground">{formatMoney(pricing.itemsSubtotal)}</b>
                </p>
                {pricing.addonsSubtotal > 0 && (
                  <p className="flex justify-between gap-4">
                    <span>Toppings / salsas</span>
                    <b className="text-foreground">{formatMoney(pricing.addonsSubtotal)}</b>
                  </p>
                )}
                <p className="flex justify-between gap-4">
                  <span>Subtotal original</span>
                  <b className="text-foreground">{formatMoney(pricing.baseSubtotal)}</b>
                </p>
                {pricing.promoSavings > 0 && (
                  <>
                    <p className="flex justify-between gap-4">
                      <span>Promo docena</span>
                      <b className="text-emerald-700">−{formatMoney(pricing.promoSavings)}</b>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span>Subtotal con promo</span>
                      <b className="text-emerald-700">{formatMoney(pricing.promoSubtotal)}</b>
                    </p>
                  </>
                )}
                <p className="flex justify-between gap-4">
                  <span>Envío</span>
                  <b className="text-foreground">{formatMoney(detail.deliveryFee)}</b>
                </p>
                {detail.cookingFee > 0 && (
                  <p className="flex justify-between gap-4">
                    <span>Cocinado</span>
                    <b className="text-foreground">{formatMoney(detail.cookingFee)}</b>
                  </p>
                )}
                {pricing.discount > 0 && (
                  <p className="flex justify-between gap-4">
                    <span>Descuento {detail.discountPercent}%</span>
                    <b className="text-emerald-700">−{formatMoney(pricing.discount)}</b>
                  </p>
                )}
                {pricing.promotionLabels.length > 0 && (
                  <div className="flex flex-wrap gap-2 rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    {pricing.promotionLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                )}
                <p className="flex justify-between border-t border-primary/20 pt-3 text-lg text-foreground">
                  <span>Total</span>
                  <b className="text-2xl text-primary">{formatMoney(detail.total)}</b>
                </p>
              </div>
            </section>
          </>
        )}

        {activeTab === 'history' && (
          <section className="rounded-3xl border border-border/70 bg-white p-4 shadow-card">
            <h4 className="mb-4 font-black text-foreground">Historial de cambios</h4>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div className="flex gap-3" key={event.label}>
                  <span
                    className={`mt-1 h-3 w-3 rounded-full ${event.active ? 'bg-primary' : 'bg-muted-foreground/25'}`}
                  />
                  <div>
                    <p
                      className={
                        event.active
                          ? 'font-black text-foreground'
                          : 'font-semibold text-muted-foreground'
                      }
                    >
                      {event.label}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {event.active
                        ? index === 0
                          ? getDeliveryDateMeta(detail.deliveryDate).fullLabel
                          : 'Actualizado recientemente'
                        : 'Pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'notes' && (
          <section className="rounded-3xl border border-border/70 bg-white p-4 shadow-card">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<OrderVisibilityFilter>('active');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('todos');
  const [methodFilter, setMethodFilter] = useState<OrderMethodFilter>('todos');
  const [sortOption, setSortOption] = useState<OrderSortOption>('date_asc');
  const [tableSortCol, setTableSortCol] = useState<TableSortColumn>('date');
  const [tableSortDir, setTableSortDir] = useState<TableSortDir>('desc');
  const [orderPage, setOrderPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());
  const [isGeneratingKitchenList, setIsGeneratingKitchenList] = useState(false);
  const [kitchenListFeedback, setKitchenListFeedback] = useState<string | null>(null);
  const [generatedKitchenList, setGeneratedKitchenList] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [mobileOrderStep, setMobileOrderStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<OrderFormState>(initialFormState);
  const ignoredOrderParamRef = useRef<string | null>(null);
  const deferredOrderSearch = useDeferredValue(orderSearch);

  useEffect(() => {
    setOrderPage(1);
  }, [
    deliveryDateFilter,
    methodFilter,
    orderSearch,
    statusFilter,
    tableSortCol,
    tableSortDir,
    visibilityFilter,
  ]);

  const orderQueryFilters = useMemo<OrderFilters>(() => {
    const sortByMap: Record<TableSortColumn, NonNullable<OrderFilters['sortBy']>> = {
      date: 'deliveryDate',
      name: 'customerName',
      total: 'total',
      status: 'status',
      method: 'deliveryType',
    };
    const trimmedSearch = deferredOrderSearch.trim();

    return {
      page: orderPage,
      pageSize: ORDERS_PAGE_SIZE,
      visibility: visibilityFilter,
      sortBy: sortByMap[tableSortCol],
      sortDir: tableSortDir,
      ...(deliveryDateFilter ? { fecha: deliveryDateFilter } : {}),
      ...(trimmedSearch ? { cliente: trimmedSearch } : {}),
      ...(statusFilter === 'todos' ? {} : { estado: statusFilter }),
      ...(methodFilter === 'envio' || methodFilter === 'retiro'
        ? { deliveryType: methodFilter }
        : {}),
      ...(methodFilter === 'cocinado' ? { cooked: true } : {}),
      ...(methodFilter === 'pagado' ? { isPaid: true } : {}),
    };
  }, [
    deferredOrderSearch,
    deliveryDateFilter,
    methodFilter,
    orderPage,
    statusFilter,
    tableSortCol,
    tableSortDir,
    visibilityFilter,
  ]);

  const ordersQuery = useOrders(orderQueryFilters);
  const orderDetailQuery = useOrderDetail(expandedOrderId);
  const customersQuery = useCustomers();
  const menuItemsQuery = useMenuItems();
  const deliveryFeeQuery = useDeliveryFee();
  const orderPromotionSettingsQuery = useOrderPromotionSettings();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const updateOrderStatus = useUpdateOrderStatus();
  const updateOrderPayment = useUpdateOrderPayment();
  const isDesktopDetail = useIsDesktopDetail();

  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (!orderIdFromUrl) {
      ignoredOrderParamRef.current = null;
      return;
    }
    if (ignoredOrderParamRef.current === orderIdFromUrl) {
      return;
    }
    if (orderIdFromUrl && expandedOrderId !== orderIdFromUrl) {
      setExpandedOrderId(orderIdFromUrl);
    }
  }, [expandedOrderId, searchParams]);

  useEffect(() => {
    if (!expandedOrderId || !isDesktopDetail) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      ignoredOrderParamRef.current = expandedOrderId ?? searchParams.get('orderId');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
      setExpandedOrderId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedOrderId, isDesktopDetail, searchParams, setSearchParams]);

  useEffect(() => {
    if (isDesktopDetail) return;
    const handlePopState = () => setExpandedOrderId(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDesktopDetail]);

  // ─── Datos derivados ────────────────────────────────────────────────────────

  const allOrders = ordersQuery.data?.orders ?? [];
  const orderPagination = ordersQuery.data?.pagination;
  const orderStats = ordersQuery.data?.stats;

  const visibleOrders = useMemo(() => {
    const query = normalizeText(orderSearch.trim());
    const filteredOrders = allOrders.filter((order) => {
      const matchesVisibility =
        visibilityFilter === 'finalized' ? isFinalizedOrder(order) : !isFinalizedOrder(order);
      const matchesDate = deliveryDateFilter ? order.deliveryDate === deliveryDateFilter : true;
      const matchesSearch = query
        ? normalizeText(
            `${order.id} ${getOrderCode(order.id)} ${order.customer.name} ${order.customer.phone ?? ''} ${order.customer.address ?? ''}`,
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

    const dir = tableSortDir === 'asc' ? 1 : -1;
    return [...filteredOrders].sort((a, b) => {
      switch (tableSortCol) {
        case 'date':
          return (
            dir * a.deliveryDate.localeCompare(b.deliveryDate) ||
            deliveryTimeSortOrder[a.deliveryTime] - deliveryTimeSortOrder[b.deliveryTime] ||
            a.customer.name.localeCompare(b.customer.name, 'es-AR')
          );
        case 'name':
          return dir * a.customer.name.localeCompare(b.customer.name, 'es-AR');
        case 'total':
          return dir * (a.total - b.total);
        case 'status':
          return dir * a.status.localeCompare(b.status);
        case 'method':
          return dir * a.deliveryType.localeCompare(b.deliveryType);
        default:
          return 0;
      }
    });
  }, [
    allOrders,
    deliveryDateFilter,
    methodFilter,
    orderSearch,
    tableSortCol,
    tableSortDir,
    statusFilter,
    visibilityFilter,
  ]);

  const previewDetailOrderIds = useMemo(
    () =>
      visibleOrders
        .filter((order) => !order.items || order.items.length === 0)
        .map((order) => order.id),
    [visibleOrders],
  );
  const previewDetailQueries = useQueries({
    queries: previewDetailOrderIds.map((id) => ({
      queryKey: orderQueryKeys.detail(id),
      queryFn: () => getOrder(id),
      enabled: Boolean(ordersQuery.data),
      staleTime: 15_000,
    })),
  });
  const previewDetailsByOrderId = useMemo(() => {
    const details = new Map<string, OrderDetail>();
    previewDetailQueries.forEach((query, index) => {
      const orderId = previewDetailOrderIds[index];
      if (orderId && query.data) {
        details.set(orderId, query.data);
      }
    });
    return details;
  }, [previewDetailOrderIds, previewDetailQueries]);

  const summary = useMemo(() => {
    const activeOrders = allOrders.filter((order) => !isFinalizedOrder(order));
    const finalizedOrders = allOrders.filter(isFinalizedOrder);
    const pendingOrders = activeOrders.filter((order) => order.status === 'confirmado');
    const salesDate = deliveryDateFilter || getTodayIsoDate();
    const dailySales = allOrders
      .filter((order) => order.deliveryDate === salesDate)
      .reduce((total, order) => total + order.total, 0);

    return {
      active: orderStats?.active ?? activeOrders.length,
      finalized: orderStats?.finalized ?? finalizedOrders.length,
      pending: orderStats?.pending ?? pendingOrders.length,
      dailySales,
      pendingVarieties: orderStats?.pendingVarieties ?? [],
    };
  }, [allOrders, deliveryDateFilter, orderStats]);

  const menuItemNameById = useMemo(
    () => new Map((menuItemsQuery.data ?? []).map((item) => [item.id, item.name])),
    [menuItemsQuery.data],
  );

  const activeFilterCount = [
    deliveryDateFilter,
    statusFilter !== 'todos',
    methodFilter !== 'todos',
    sortOption !== 'date_asc',
  ].filter(Boolean).length;

  const displayPendingVarieties = useMemo(() => {
    const totals = new Map<
      string,
      { menuItemId: string; menuItemName: string; quantity: number }
    >();
    const addTotal = (menuItemId: string, quantity: number, menuItemName?: string) => {
      const resolvedName = menuItemName?.trim() || menuItemNameById.get(menuItemId) || 'Variedad';
      const current = totals.get(menuItemId) ?? {
        menuItemId,
        menuItemName: resolvedName,
        quantity: 0,
      };
      current.menuItemName =
        current.menuItemName === 'Variedad' ? resolvedName : current.menuItemName;
      current.quantity += quantity;
      totals.set(menuItemId, current);
    };

    if (summary.pendingVarieties.length > 0) {
      summary.pendingVarieties.forEach((item) =>
        addTotal(item.menuItemId, item.quantity, item.menuItemName),
      );
    } else {
      visibleOrders
        .filter((order) => order.status === 'confirmado')
        .forEach((order) => {
          const items =
            order.items && order.items.length > 0
              ? order.items
              : (previewDetailsByOrderId.get(order.id)?.items ?? []);
          items.forEach((item) => addTotal(item.menuItemId, item.quantity, item.menuItemName));
        });
    }

    return [...totals.values()].sort((left, right) =>
      left.menuItemName.localeCompare(right.menuItemName, 'es-AR'),
    );
  }, [menuItemNameById, previewDetailsByOrderId, summary.pendingVarieties, visibleOrders]);

  const pendingVarietyUnits = displayPendingVarieties.reduce(
    (total, item) => total + item.quantity,
    0,
  );

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

  const availableAddons = orderPromotionSettingsQuery.data?.addons ?? [];
  const selectedAddons = useMemo(
    () =>
      availableAddons
        .map((addon) => ({ addon, quantity: form.addonQuantities[addon.addonId] ?? 0 }))
        .filter(({ quantity }) => quantity > 0),
    [availableAddons, form.addonQuantities],
  );

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLocaleLowerCase('es-AR');
    const customers = customersQuery.data ?? [];
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.phone ?? ''} ${customer.address ?? ''}`
        .toLocaleLowerCase('es-AR')
        .includes(query),
    );
  }, [customerSearch, customersQuery.data]);

  const selectedCustomer = useMemo(
    () => (customersQuery.data ?? []).find((customer) => customer.id === form.existingCustomerId),
    [customersQuery.data, form.existingCustomerId],
  );

  const selectedUnitCount = selectedItems.reduce((acc, { quantity }) => acc + quantity, 0);
  const selectedAddonCount = selectedAddons.reduce((acc, { quantity }) => acc + quantity, 0);
  const summaryCustomerName =
    form.customerMode === 'existing'
      ? (selectedCustomer?.name ?? 'Seleccioná un cliente')
      : form.newCustomerName.trim() || 'Nuevo cliente sin nombre';
  const summaryCustomerPhone =
    form.customerMode === 'existing' ? selectedCustomer?.phone : form.newCustomerPhone.trim();
  const summaryCustomerAddress =
    form.customerMode === 'existing' ? selectedCustomer?.address : form.newCustomerAddress.trim();
  const deliverySummaryLabel = form.deliveryType === 'retiro' ? 'Retiro' : 'Envío';
  const cookingSummaryLabel = form.cooked ? 'Cocinado' : 'Crudo';
  const deliveryTimeSummaryLabel = deliveryTimeLabels[form.deliveryTime];

  const preview = useMemo(() => {
    const pricedItems = selectedItems.map(({ menuItem, quantity }) => ({
      quantity,
      subtotal: calculateItemPrice({
        quantity,
        priceUnit: menuItem.priceUnit,
        priceHalfDozen: menuItem.priceHalfDozen,
        priceDozen: menuItem.priceDozen,
      }).total,
      priceUnit: menuItem.priceUnit,
      priceHalfDozen: menuItem.priceHalfDozen,
      priceDozen: menuItem.priceDozen,
    }));
    const deliveryFee = form.deliveryType === 'envio' ? (deliveryFeeQuery.data ?? 0) : 0;
    const cookingFee = form.cooked ? (orderPromotionSettingsQuery.data?.cookingFee ?? 0) : 0;
    const pricing = calculateOrderPromotion({
      items: pricedItems,
      addons: selectedAddons.map(({ addon, quantity }) => ({
        quantity,
        subtotal: addon.price * quantity,
      })),
      manualDiscountPercent: toNumber(form.discountPercent),
      deliveryFee,
      cookingFee,
      promotions: orderPromotionSettingsQuery.data,
    });

    return pricing;
  }, [
    deliveryFeeQuery.data,
    form.deliveryType,
    form.discountPercent,
    orderPromotionSettingsQuery.data,
    selectedAddons,
    selectedItems,
  ]);
  const combinedDozenPromo = preview.appliedPromotions.find(
    (promotion) => promotion.key === 'combined_dozen',
  );

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

  const setAddonQuantity = (addonId: string, delta: number) => {
    setForm((current) => {
      const currentQuantity = current.addonQuantities[addonId] ?? 0;
      const nextQuantity = Math.max(0, currentQuantity + delta);
      const nextAddonQuantities = { ...current.addonQuantities };
      if (nextQuantity === 0) {
        delete nextAddonQuantities[addonId];
      } else {
        nextAddonQuantities[addonId] = nextQuantity;
      }
      return { ...current, addonQuantities: nextAddonQuantities };
    });
  };

  const buildValidationErrors = () => {
    const errors: string[] = [];
    if (form.customerMode === 'existing' && !form.existingCustomerId)
      errors.push('Seleccioná un cliente.');
    if (form.customerMode === 'new') {
      if (!form.newCustomerName.trim()) errors.push('Nombre del cliente requerido.');
    }
    if (!form.deliveryDate) errors.push('Fecha de entrega requerida.');
    if (!form.deliveryType) errors.push('Elegí envío o retiro.');
    if (selectedItems.length === 0) errors.push('Agregá al menos una variedad.');
    return errors;
  };

  const advanceMobileOrderStep = () => {
    setFormErrors([]);
    setMobileOrderStep((step) => (step === 1 ? 2 : 3));
  };

  const goBackMobileOrderStep = () => {
    setFormErrors([]);
    setMobileOrderStep((step) => (step === 3 ? 2 : 1));
  };

  const goToMobileOrderStep = (step: 1 | 2 | 3) => {
    setFormErrors([]);
    setMobileOrderStep(step);
  };

  const buildOrderInput = (): CreateOrderInput => ({
    customer:
      form.customerMode === 'existing'
        ? { existingCustomerId: form.existingCustomerId }
        : {
            newCustomer: {
              name: form.newCustomerName,
              ...(form.newCustomerPhone.trim() ? { phone: form.newCustomerPhone } : {}),
              ...(form.newCustomerAddress.trim() ? { address: form.newCustomerAddress } : {}),
            },
          },
    deliveryDate: form.deliveryDate,
    deliveryTime: form.deliveryTime,
    deliveryType: form.deliveryType as 'retiro' | 'envio',
    cooked: form.cooked,
    notes: form.notes.trim() || undefined,
    discountPercent: preview.discountPercent,
    deliveryFee: preview.deliveryFee,
    items: selectedItems.map(({ menuItem, quantity }) => ({
      menuItemId: menuItem.id,
      quantity,
    })),
    addons: selectedAddons.map(({ addon, quantity }) => ({
      addonId: addon.addonId,
      quantity,
    })),
  });

  const resetAndCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingOrderId(null);
    setCustomerSearch('');
    setFormErrors([]);
    setMobileOrderStep(1);
    setForm(initialFormState);
  };

  const openCreateDialog = () => {
    setEditingOrderId(null);
    setCustomerSearch('');
    setFormErrors([]);
    setMobileOrderStep(1);
    setForm(initialFormState);
    setIsCreateDialogOpen(true);
  };

  const submitOrder = async () => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitOrder();
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
    setMobileOrderStep(1);
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
      addonQuantities: toQuantitiesByAddonId(order.addons),
    });
    setIsCreateDialogOpen(true);
  };

  const removeOrder = async (id: string, customerName: string) => {
    const confirmed = window.confirm(`¿Eliminar el pedido de ${customerName}?`);
    if (!confirmed) return;
    await deleteOrder.mutateAsync(id);
    setExpandedOrderId((current) => (current === id ? null : current));
  };

  const exportVisibleOrders = () => {
    const csvEscape = (value: string | number | boolean) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const rows = visibleOrders.map((order) => [
      getOrderCode(order.id),
      order.customer.name,
      order.customer.phone ?? '',
      order.customer.address ?? '',
      formatDateAr(order.deliveryDate),
      deliveryTimeLabels[order.deliveryTime],
      order.deliveryType === 'envio' ? 'Envío' : 'Retiro',
      order.cooked ? 'Cocinado' : 'Crudo',
      statusConfig[order.status].label,
      order.isPaid ? 'Pagado' : 'No pagado',
      order.itemCount,
      order.total,
    ]);
    const csv = [
      [
        'Pedido',
        'Cliente',
        'Teléfono',
        'Dirección',
        'Entrega',
        'Horario',
        'Método',
        'Cocción',
        'Estado',
        'Pago',
        'Productos',
        'Total',
      ],
      ...rows,
    ]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pedidos-${visibilityFilter}-${getTodayIsoDate()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleTableSort = (col: TableSortColumn) => {
    if (tableSortCol === col) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortCol(col);
      setTableSortDir('asc');
    }
  };

  const handleSortOptionChange = (option: OrderSortOption) => {
    setSortOption(option);
    const sortMap: Record<OrderSortOption, { col: TableSortColumn; dir: TableSortDir }> = {
      date_asc: { col: 'date', dir: 'desc' },
      date_desc: { col: 'date', dir: 'asc' },
      name_asc: { col: 'name', dir: 'asc' },
      name_desc: { col: 'name', dir: 'desc' },
      total_desc: { col: 'total', dir: 'desc' },
      total_asc: { col: 'total', dir: 'asc' },
    };
    setTableSortCol(sortMap[option].col);
    setTableSortDir(sortMap[option].dir);
  };

  const toggleOrderDetail = (id: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (expandedOrderId === id) {
      ignoredOrderParamRef.current = id;
      nextParams.delete('orderId');
      setSearchParams(nextParams, { replace: true });
      setExpandedOrderId(null);
      return;
    }

    ignoredOrderParamRef.current = null;
    nextParams.set('orderId', id);
    setSearchParams(nextParams, { replace: true });
    if (!isDesktopDetail && typeof window !== 'undefined') {
      window.history.pushState({ orderDetailId: id }, '', window.location.href);
    }
    setExpandedOrderId(id);
  };

  const closeOrderDetail = () => {
    ignoredOrderParamRef.current = expandedOrderId ?? searchParams.get('orderId');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('orderId');
    setSearchParams(nextParams, { replace: true });
    if (!isDesktopDetail && expandedOrderId && window.history.state?.orderDetailId) {
      window.history.back();
      return;
    }
    setExpandedOrderId(null);
  };

  const cancelOrderFromDetail = (id: string, customerName: string) => {
    void removeOrder(id, customerName);
  };

  const markStatusFromDetail = (id: string, status: OrderStatus) => {
    void markStatus(id, status);
  };

  const markPaymentFromDetail = (id: string, isPaid: boolean) => {
    void markPayment(id, isPaid);
  };

  const toggleOrderSelection = (id: string) => {
    setKitchenListFeedback(null);
    setGeneratedKitchenList('');
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearOrderSelection = () => {
    setSelectedOrderIds(new Set());
    setKitchenListFeedback(null);
    setGeneratedKitchenList('');
  };

  const generateKitchenList = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsGeneratingKitchenList(true);
    setKitchenListFeedback(null);
    setGeneratedKitchenList('');

    try {
      const selectedDetails = await Promise.all([...selectedOrderIds].map((id) => getOrder(id)));
      const sortedDetails = selectedDetails.sort(
        (a, b) =>
          a.deliveryDate.localeCompare(b.deliveryDate) ||
          a.deliveryTime.localeCompare(b.deliveryTime) ||
          a.customer.name.localeCompare(b.customer.name, 'es-AR'),
      );
      const totalUnits = sortedDetails.reduce(
        (total, order) => total + order.items.reduce((sum, item) => sum + item.quantity, 0),
        0,
      );
      const totalMoney = sortedDetails.reduce((total, order) => total + order.total, 0);
      const itemTotals = sortedDetails
        .flatMap((order) =>
          order.items.map((item) => ({ name: item.menuItemName, quantity: item.quantity })),
        )
        .reduce<Map<string, number>>((totals, item) => {
          totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity);
          return totals;
        }, new Map());
      const addonTotals = sortedDetails
        .flatMap((order) =>
          order.addons.map((addon) => ({ name: addon.name, quantity: addon.quantity })),
        )
        .reduce<Map<string, number>>((totals, addon) => {
          totals.set(addon.name, (totals.get(addon.name) ?? 0) + addon.quantity);
          return totals;
        }, new Map());
      const sortedItemTotals = [...itemTotals.entries()].sort(([a], [b]) =>
        a.localeCompare(b, 'es-AR'),
      );
      const sortedAddonTotals = [...addonTotals.entries()].sort(([a], [b]) =>
        a.localeCompare(b, 'es-AR'),
      );
      const lines = [
        `*LISTA DE COCINA*`,
        `_${sortedDetails.length} pedido${sortedDetails.length === 1 ? '' : 's'} · ${totalUnits} unidades_`,
        `*Total general:* ${formatMoney(totalMoney)}`,
        '',
        ...sortedDetails.flatMap((order, index) => [
          `*${index + 1}. ${order.customer.name}*  ·  _${getOrderCode(order.id)}_`,
          `*Franja:* ${deliveryTimeLabels[order.deliveryTime]} · ${order.deliveryType === 'envio' ? 'ENVÍO' : 'RETIRO'} · ${order.cooked ? 'COCINADO' : 'CRUDO'}`,
          '',
          '*Variedades:*',
          ...order.items.map((item) => `• ${item.menuItemName}: *${item.quantity} u.*`),
          ...order.addons.map((addon) => `• ${addon.name}: *${addon.quantity} u.*`),
          '',
          `*Total pedido:* ${formatMoney(order.total)}`,
          order.notes?.trim() ? `_Notas:_ ${order.notes.trim()}` : null,
          '',
          '— — —',
          '',
        ]),
        '*TOTALES POR VARIEDAD*',
        ...sortedItemTotals.map(([name, quantity]) => `• ${name}: *${quantity} u.*`),
        sortedAddonTotals.length > 0 ? '' : null,
        sortedAddonTotals.length > 0 ? '*Adicionales:*' : null,
        ...sortedAddonTotals.map(([name, quantity]) => `• ${name}: *${quantity} u.*`),
      ].filter((line): line is string => line !== null);

      const kitchenList = lines.join('\n');
      setGeneratedKitchenList(kitchenList);
      const copied = await copyTextToClipboard(kitchenList);
      setKitchenListFeedback(
        copied
          ? 'Lista copiada. Ya podés pegarla en WhatsApp o imprimirla.'
          : 'Lista generada. No se pudo copiar automático, pero la podés copiar desde abajo.',
      );
    } catch {
      setKitchenListFeedback('No se pudo generar la lista. Intentá de nuevo.');
      setGeneratedKitchenList('');
    } finally {
      setIsGeneratingKitchenList(false);
    }
  };

  const renderOrderCard = (order: (typeof visibleOrders)[number]) => {
    const isExpanded = expandedOrderId === order.id;
    const isMenuOpen = openMenuId === order.id;
    const isSelectedForKitchen = selectedOrderIds.has(order.id);
    const previewItems =
      order.items && order.items.length > 0
        ? order.items
        : (previewDetailsByOrderId.get(order.id)?.items ?? []);
    const itemLabels = previewItems.map((item) =>
      formatVarietyLabel(
        item.quantity,
        item.menuItemName.trim() || menuItemNameById.get(item.menuItemId) || 'Variedad',
      ),
    );

    return (
      <article
        aria-label={`Pedido ${order.customer.name}`}
        aria-selected={isExpanded}
        key={order.id}
        onClick={() => toggleOrderDetail(order.id)}
        className={[
          'relative cursor-pointer overflow-visible rounded-2xl border bg-white/95 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-soft',
          isMenuOpen ? 'z-30' : 'z-0',
          isExpanded ? 'border-primary/40 ring-2 ring-primary/15' : 'border-border/70',
        ].join(' ')}
      >
        <span
          aria-label={`Indicador de estado ${statusConfig[order.status].label}`}
          className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${statusConfig[order.status].line}`}
        />

        <div
          className={[
            'grid gap-4 p-4 pl-5 lg:items-center lg:gap-5',
            isDesktopDetailOpen
              ? 'lg:grid-cols-[auto_1fr_1.35fr_1fr_0.9fr_1fr_auto] 2xl:grid-cols-[auto_1fr_1.35fr_1fr_0.9fr_1fr_0.9fr_auto]'
              : 'lg:grid-cols-[auto_1.05fr_1.55fr_1.1fr_1fr_1.2fr_0.95fr_auto]',
          ].join(' ')}
        >
          <label
            className="flex items-center gap-2 text-xs font-black text-muted-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              aria-label={`Seleccionar pedido ${getOrderCode(order.id)} para lista de cocina`}
              checked={isSelectedForKitchen}
              className="h-4 w-4 rounded border-border accent-primary"
              onChange={() => toggleOrderSelection(order.id)}
              type="checkbox"
            />
            <span className="lg:hidden">Seleccionar</span>
          </label>

          {/* Pedido */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Pedido
            </p>
            <p className="font-black text-foreground tabular-nums">{getOrderCode(order.id)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {itemLabels.length > 0 ? (
                itemLabels.map((label) => (
                  <span
                    className="inline-flex max-w-full rounded-full border border-primary/15 bg-primary/8 px-2 py-0.5 text-[0.68rem] font-black leading-tight text-primary"
                    key={label}
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="inline-flex rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {order.totalQuantity} u.
                </span>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Cliente
            </p>
            <p className="font-bold text-foreground">{order.customer.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Phone className="h-3 w-3" /> {order.customer.phone ?? 'Sin teléfono'}
            </p>
            {order.customer.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" /> {order.customer.address}
              </p>
            )}
          </div>

          {/* Entrega — fecha legible + badge franja */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Entrega
            </p>
            <DeliveryDatePill date={order.deliveryDate} deliveryTime={order.deliveryTime} />
          </div>

          {/* Método — badges en columna */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Método
            </p>
            <div className={compactBadgeStackClassName}>
              <span
                className={[
                  compactBadgeClassName,
                  order.deliveryType === 'envio'
                    ? 'bg-sky-600 text-white ring-1 ring-sky-700/20'
                    : 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
                ].join(' ')}
              >
                {order.deliveryType === 'envio' ? 'Envío' : 'Retiro'}
              </span>
              {order.cooked && (
                <span
                  className={`${compactBadgeClassName} bg-red-600 text-white ring-1 ring-red-700/20`}
                >
                  Cocinado
                </span>
              )}
            </div>
          </div>

          {/* Estado + indicador de pago */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Estado
            </p>
            <div className={compactBadgeStackClassName}>
              {order.status === 'entregado' ? (
                <span className={`${compactBadgeClassName} ${statusConfig[order.status].badge}`}>
                  {statusConfig[order.status].label}
                </span>
              ) : (
                <button
                  aria-label={
                    order.status === 'preparado'
                      ? 'Volver pedido a confirmado'
                      : 'Marcar pedido como preparado'
                  }
                  aria-pressed={order.status === 'preparado'}
                  className={[
                    compactBadgeClassName,
                    statusConfig[order.status].badge,
                    'transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60',
                  ].join(' ')}
                  disabled={updateOrderStatus.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    void markStatus(
                      order.id,
                      order.status === 'preparado' ? 'confirmado' : 'preparado',
                    );
                  }}
                  type="button"
                >
                  {statusConfig[order.status].label}
                </button>
              )}
              <button
                aria-label={order.isPaid ? 'Marcar como no pagado' : 'Marcar como pagado'}
                aria-pressed={order.isPaid}
                className={[
                  `${compactBadgeClassName} transition-all duration-150 disabled:opacity-60`,
                  order.isPaid ? paymentBadgeClassNames.paid : paymentBadgeClassNames.unpaid,
                ].join(' ')}
                disabled={updateOrderPayment.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  void markPayment(order.id, !order.isPaid);
                }}
                type="button"
              >
                {order.isPaid ? 'Pagado' : 'No pagado'}
              </button>
            </div>
          </div>

          {/* Total */}
          <div className={isDesktopDetailOpen ? 'lg:hidden 2xl:block' : ''}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
              Total
            </p>
            <p
              aria-label="Total del pedido"
              className="tabular-nums text-lg font-black text-foreground"
            >
              {formatMoney(order.total)}
            </p>
          </div>

          {/* Acciones: ojo + menú 3 puntos */}
          <div
            className="flex items-center gap-1.5 lg:justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label={isExpanded ? 'Cerrar detalle' : 'Ver detalle'}
              aria-expanded={isExpanded}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full border transition',
                isExpanded
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary',
              ].join(' ')}
              onClick={() => toggleOrderDetail(order.id)}
              type="button"
            >
              {isDesktopDetailOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>

            {/* Menú 3 puntos */}
            <div className={isDesktopDetailOpen ? 'relative hidden 2xl:block' : 'relative'}>
              <button
                aria-label="Más opciones"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                onClick={() => setOpenMenuId(isMenuOpen ? null : order.id)}
                type="button"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <>
                  {/* Overlay para cerrar */}
                  <div className="fixed inset-0 z-[80]" onClick={() => setOpenMenuId(null)} />
                  <div
                    className="absolute right-0 top-9 z-[90] min-w-[140px] overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
                    role="menu"
                  >
                    <button
                      aria-label={`Editar pedido de ${order.customer.name}`}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                      disabled={updateOrder.isPending}
                      onClick={() => {
                        setOpenMenuId(null);
                        void editOrder(order.id);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                      Editar
                    </button>
                    <button
                      aria-label={`Eliminar pedido de ${order.customer.name}`}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/8 disabled:opacity-60"
                      disabled={deleteOrder.isPending}
                      onClick={() => {
                        setOpenMenuId(null);
                        void removeOrder(order.id, order.customer.name);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  const mobileStepLabels = ['Cliente y entrega', 'Variedades', 'Extras y resumen'] as const;
  const mobileDialogTitle = isDesktopDetail
    ? editingOrderId
      ? 'Editar pedido'
      : 'Nuevo pedido'
    : mobileOrderStep === 2
      ? 'Variedades'
      : mobileOrderStep === 3
        ? 'Extras y resumen'
        : 'Nuevo pedido';

  const orderForm = (
    <form
      className="grid items-start gap-5 rounded-[2rem] bg-[#FCF8F2] p-2 text-[#2D2622] lg:grid-cols-[minmax(0,1fr)_23rem]"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        {/* ── Sección: Cliente ── */}
        <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm shadow-[#B54431]/5 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-base font-black text-[#2D2622]">
            <UserRound className="h-4 w-4 text-[#B54431]" />
            1. Cliente
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
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60"
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar por nombre, teléfono o dirección…"
                  role="searchbox"
                  type="text"
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
              <div className="h-72 max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
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
                            <Phone className="h-3 w-3" /> {customer.phone ?? 'Sin teléfono'}
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
              <button
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E8D3BF] bg-[#FFFDF9] px-4 py-3 text-sm font-bold text-[#933427] transition hover:border-[#B54431]/50 hover:bg-[#B54431]/5"
                onClick={() =>
                  setForm((c) => ({ ...c, customerMode: 'new', existingCustomerId: '' }))
                }
                type="button"
              >
                <Plus className="h-4 w-4" /> Nuevo cliente
              </button>
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
                  label: 'Teléfono',
                  type: 'tel',
                  inputMode: 'tel' as const,
                },
                {
                  key: 'newCustomerAddress',
                  label: 'Dirección',
                  type: 'text',
                  inputMode: undefined,
                },
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
        <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm shadow-[#B54431]/5 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-base font-black text-[#2D2622]">
            <ClipboardList className="h-4 w-4 text-[#B54431]" />
            2. Detalles del pedido
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
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
          </div>

          {/* ── Sección: Tipo de entrega + Cocción (en la misma fila) ── */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
          </div>
        </section>

        {/* ── Sección: Variedades ── */}
        <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm shadow-[#B54431]/5 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-base font-black text-[#2D2622]">
              <ShoppingBag className="h-4 w-4 text-[#B54431]" />
              3. Productos
            </h4>
            {selectedItems.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {selectedItems.reduce((acc, { quantity }) => acc + quantity, 0)} unidades
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                      className="flex-1 rounded-lg bg-[#17325c] py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#234579] active:scale-95"
                      onClick={() => setQuantity(menuItem.id, 12)}
                      type="button"
                    >
                      + Docena
                    </button>
                    <button
                      aria-label="+ Media"
                      className="flex-1 rounded-lg bg-[#d28a2d] py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#b97318] active:scale-95"
                      onClick={() => setQuantity(menuItem.id, 6)}
                      type="button"
                    >
                      + ½ docena
                    </button>
                    <button
                      aria-label="+ Unidad"
                      className="flex-1 rounded-lg bg-[#b54a32] py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#933427] active:scale-95"
                      onClick={() => setQuantity(menuItem.id, 1)}
                      type="button"
                    >
                      + Unidad
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
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {quantity} u.
                    </span>
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

        {/* ── Sección: Toppings / salsas ── */}
        <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm shadow-[#B54431]/5 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-base font-black text-[#2D2622]">
              <Plus className="h-4 w-4 text-[#B54431]" />
              Toppings / Salsas
            </h4>
            {selectedAddons.length > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                {selectedAddons.reduce((acc, { quantity }) => acc + quantity, 0)} adicionales
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {availableAddons.map((addon) => {
              const quantity = form.addonQuantities[addon.addonId] ?? 0;
              return (
                <article
                  aria-label={`Topping ${addon.name}`}
                  className={[
                    'rounded-2xl border p-3 transition-all duration-150',
                    quantity > 0
                      ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                      : 'border-border bg-card',
                  ].join(' ')}
                  key={addon.addonId}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground text-sm">{addon.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        {formatMoney(addon.price)} c/u
                      </p>
                    </div>
                    {quantity > 0 && (
                      <span className="shrink-0 rounded-xl bg-emerald-100 px-2.5 py-1 text-sm font-black text-emerald-700 tabular-nums">
                        {quantity}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <button
                      aria-label={`Restar ${addon.name}`}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-30 active:scale-95"
                      disabled={quantity === 0}
                      onClick={() => setAddonQuantity(addon.addonId, -1)}
                      type="button"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {quantity} u.
                    </span>
                    <button
                      aria-label={`Sumar ${addon.name}`}
                      className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-700 active:scale-95"
                      onClick={() => setAddonQuantity(addon.addonId, 1)}
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

        {/* ── Sección: Notas ── */}
        <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm shadow-[#B54431]/5 sm:p-5">
          <h4 className="mb-3 flex items-center gap-2 text-base font-black text-[#2D2622]">
            <StickyNote className="h-4 w-4 text-[#B54431]" />
            Notas del pedido
          </h4>
          <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <span className="sr-only">Notas</span>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 focus:border-primary/40"
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              placeholder="Indicaciones especiales, referencias de dirección..."
              rows={3}
              value={form.notes}
            />
          </label>
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
      </div>

      <aside
        aria-label="Preview de total"
        className="rounded-[1.75rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-xl shadow-[#B54431]/10 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto sm:p-5"
      >
        <h4 className="flex items-center gap-2 text-base font-black text-[#2D2622]">
          <ReceiptText className="h-4 w-4 text-[#B54431]" />
          4. Resumen del pedido
        </h4>

        <div className="mt-4 rounded-2xl border border-[#E8D3BF] bg-[#FCF8F2] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#74655B]">Cliente</p>
          <p className="mt-1 text-sm font-black text-[#2D2622]">{summaryCustomerName}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#74655B]">
            {summaryCustomerPhone && <span>Tel: {summaryCustomerPhone}</span>}
            <span>{summaryCustomerAddress || 'Completar dirección'}</span>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-[#E8D3BF]/70 pb-2">
            <dt className="font-bold text-[#2D2622]">Entrega</dt>
            <dd className="text-[#74655B]">{deliverySummaryLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[#E8D3BF]/70 pb-2">
            <dt className="font-bold text-[#2D2622]">Cocción</dt>
            <dd className="text-[#74655B]">{cookingSummaryLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[#E8D3BF]/70 pb-2">
            <dt className="font-bold text-[#2D2622]">Fecha de entrega</dt>
            <dd className="text-right text-[#74655B]">
              {form.deliveryDate || 'Sin fecha'} · {deliveryTimeSummaryLabel}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-bold text-[#2D2622]">Descuento</dt>
            <dd className="text-[#74655B]">{preview.discountPercent}%</dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#74655B]">Productos</p>
          <div className="mt-2 space-y-2">
            {selectedItems.length === 0 && selectedAddons.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#E8D3BF] p-4 text-sm font-semibold text-[#74655B]">
                Agregá variedades o salsas para ver el resumen.
              </p>
            ) : (
              <>
                {selectedItems.map(({ menuItem, quantity }) => {
                  const itemTotal = calculateItemPrice({
                    quantity,
                    priceUnit: menuItem.priceUnit,
                    priceHalfDozen: menuItem.priceHalfDozen,
                    priceDozen: menuItem.priceDozen,
                  }).total;
                  return (
                    <div
                      key={menuItem.id}
                      className="flex items-start justify-between gap-3 border-b border-[#E8D3BF]/70 pb-2 text-sm"
                    >
                      <div>
                        <p className="font-bold text-[#2D2622]">{menuItem.name}</p>
                        <p className="text-xs font-semibold text-[#74655B]">
                          {quantity >= 12 && quantity % 12 === 0
                            ? `${quantity / 12} × ${formatMoney(menuItem.priceDozen)}`
                            : `${quantity} u. × precio según escala`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold tabular-nums text-[#2D2622]">
                          {formatMoney(itemTotal)}
                        </span>
                        <button
                          aria-label={`Quitar ${menuItem.name} del resumen`}
                          className="rounded-full border border-[#E8D3BF] p-1 text-[#B54431] hover:bg-[#B54431]/10"
                          onClick={() => setQuantity(menuItem.id, -quantity)}
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {selectedAddons.map(({ addon, quantity }) => (
                  <div
                    key={addon.addonId}
                    className="flex items-start justify-between gap-3 border-b border-[#E8D3BF]/70 pb-2 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#2D2622]">{addon.name}</p>
                      <p className="text-xs font-semibold text-[#74655B]">
                        {quantity} × {formatMoney(addon.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums text-[#2D2622]">
                        {formatMoney(addon.price * quantity)}
                      </span>
                      <button
                        aria-label={`Quitar ${addon.name} del resumen`}
                        className="rounded-full border border-[#E8D3BF] p-1 text-[#B54431] hover:bg-[#B54431]/10"
                        onClick={() => setAddonQuantity(addon.addonId, -quantity)}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#E8D3BF] bg-[#FCF8F2] p-4">
          <div className="space-y-2 text-sm text-[#74655B]">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span className="font-bold tabular-nums text-[#2D2622]">
                {formatMoney(preview.subtotal)}
              </span>
            </div>
            {combinedDozenPromo && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100">
                <div className="flex justify-between gap-4">
                  <span className="font-black">{combinedDozenPromo.label}</span>
                  <span className="font-black tabular-nums">
                    -{formatMoney(combinedDozenPromo.amount)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-emerald-700/80">
                  {selectedUnitCount} unidades combinadas aplican precio por docena.
                </p>
              </div>
            )}
            {preview.promoSubtotal !== preview.subtotal && (
              <div className="flex justify-between gap-4">
                <span>Subtotal con promos</span>
                <span className="font-bold tabular-nums text-[#088954]">
                  {formatMoney(preview.promoSubtotal)}
                </span>
              </div>
            )}
            {preview.addonsSubtotal > 0 && (
              <div className="flex justify-between gap-4">
                <span>Adicionales</span>
                <span className="font-bold tabular-nums text-[#2D2622]">
                  {formatMoney(preview.addonsSubtotal)}
                </span>
              </div>
            )}
            {preview.deliveryFee > 0 && (
              <div className="flex justify-between gap-4">
                <span>Delivery</span>
                <span className="font-bold tabular-nums text-[#2D2622]">
                  {formatMoney(preview.deliveryFee)}
                </span>
              </div>
            )}
            {preview.cookingFee > 0 && (
              <div className="flex justify-between gap-4">
                <span>Cocinado</span>
                <span className="font-bold tabular-nums text-[#2D2622]">
                  {formatMoney(preview.cookingFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span>Descuento ({preview.discountPercent}%)</span>
              <span className="font-bold tabular-nums text-[#088954]">
                -{formatMoney(preview.discount)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#E8D3BF] pt-4">
            <span className="text-sm font-black text-[#2D2622]">Total del pedido</span>
            <span className="text-2xl font-black tabular-nums text-[#B54431]">
              {formatMoney(preview.total)}
            </span>
          </div>
          {selectedUnitCount + selectedAddonCount > 0 && (
            <p className="mt-2 text-xs font-semibold text-[#74655B]">
              {selectedUnitCount} unidades · {selectedAddonCount} adicionales
            </p>
          )}
        </div>

        <button
          className="mt-4 w-full rounded-2xl bg-[#B54431] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#B54431]/20 transition hover:bg-[#933427] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
        <p className="mt-3 text-center text-xs font-semibold text-[#74655B]">
          Podrás revisar el pedido antes de confirmarlo
        </p>
      </aside>
    </form>
  );

  const mobileOrderForm = (
    <div
      className="flex min-h-[70dvh] flex-col bg-[#FCF8F2] text-[#2D2622]"
      data-testid="mobile-order-wizard"
    >
      <div className="sticky top-0 z-10 border-b border-[#E8D3BF] bg-[#FCF8F2] px-4 pb-3 pt-1">
        <div className="grid grid-cols-3 gap-2" aria-label="Progreso nuevo pedido">
          {mobileStepLabels.map((label, index) => {
            const step = (index + 1) as 1 | 2 | 3;
            const isDone = mobileOrderStep > step;
            const isActive = mobileOrderStep === step;
            const canNavigateToStep = step <= mobileOrderStep;
            return (
              <div key={label} className="text-center">
                <button
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition',
                    canNavigateToStep
                      ? 'cursor-pointer hover:bg-white/70 active:scale-[0.98]'
                      : 'cursor-not-allowed opacity-70',
                  ].join(' ')}
                  disabled={!canNavigateToStep}
                  onClick={() => goToMobileOrderStep(step)}
                  type="button"
                >
                  <span
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black',
                      isDone || isActive
                        ? 'bg-[#B54431] text-white'
                        : 'bg-[#E8D3BF] text-[#74655B]',
                    ].join(' ')}
                  >
                    {isDone ? '✓' : step}
                  </span>
                  <span
                    className={[
                      'mt-1 text-[0.68rem] font-bold',
                      isActive ? 'text-[#2D2622]' : 'text-[#74655B]',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 pb-28">
        {mobileOrderStep === 1 && (
          <>
            <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-lg font-black">
                <UserRound className="h-5 w-5 text-[#B54431]" /> Cliente
              </h4>
              <div className="mb-3 grid grid-cols-2 rounded-2xl border border-[#E8D3BF] bg-[#FCF8F2] p-1">
                {(['existing', 'new'] as CustomerMode[]).map((mode) => (
                  <label
                    key={mode}
                    className={[
                      'cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-black transition',
                      form.customerMode === mode
                        ? 'bg-[#B54431] text-white shadow-sm'
                        : 'text-[#74655B]',
                    ].join(' ')}
                  >
                    <input
                      checked={form.customerMode === mode}
                      className="sr-only"
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3">
                    <Search className="h-4 w-4 text-[#74655B]" />
                    <input
                      aria-label="Buscar cliente"
                      className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-[#74655B]/70"
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Buscar por nombre, teléfono o dirección"
                      role="searchbox"
                      type="text"
                      value={customerSearch}
                    />
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {filteredCustomers.map((customer) => {
                      const isSelected = form.existingCustomerId === customer.id;
                      return (
                        <button
                          key={customer.id}
                          aria-label={`Seleccionar cliente ${customer.name}`}
                          className={[
                            'w-full rounded-2xl border p-3 text-left transition',
                            isSelected
                              ? 'border-[#B54431] bg-[#B54431]/8 ring-2 ring-[#B54431]/15'
                              : 'border-[#E8D3BF] bg-white',
                          ].join(' ')}
                          onClick={() =>
                            setForm((c) => ({ ...c, existingCustomerId: customer.id }))
                          }
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black">{customer.name}</p>
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-[#088954]" />}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#74655B]">
                            {customer.phone ?? 'Sin teléfono'} · {customer.address ?? 'Completar'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                    Nombre *
                    <input
                      aria-label="Nombre nuevo cliente"
                      className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                      onChange={(e) => setForm((c) => ({ ...c, newCustomerName: e.target.value }))}
                      value={form.newCustomerName}
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                    Teléfono
                    <input
                      aria-label="Teléfono nuevo cliente"
                      className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                      onChange={(e) => setForm((c) => ({ ...c, newCustomerPhone: e.target.value }))}
                      type="tel"
                      value={form.newCustomerPhone}
                    />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                    Dirección
                    <input
                      aria-label="Dirección nuevo cliente"
                      className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                      onChange={(e) =>
                        setForm((c) => ({ ...c, newCustomerAddress: e.target.value }))
                      }
                      value={form.newCustomerAddress}
                    />
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-lg font-black">
                <ClipboardList className="h-5 w-5 text-[#B54431]" /> Fecha y franja
              </h4>
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                  Fecha de entrega
                  <input
                    aria-label="Fecha de entrega"
                    className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                    onChange={(e) => setForm((c) => ({ ...c, deliveryDate: e.target.value }))}
                    required
                    type="date"
                    value={form.deliveryDate}
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                  Franja
                  <select
                    aria-label="Franja"
                    className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
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
                <label className="block text-xs font-bold uppercase tracking-wide text-[#74655B]">
                  Descuento
                  <input
                    aria-label="Descuento %"
                    className="mt-1.5 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                    inputMode="numeric"
                    max="100"
                    min="0"
                    onChange={(e) => setForm((c) => ({ ...c, discountPercent: e.target.value }))}
                    type="number"
                    value={form.discountPercent}
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4">
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-lg font-black">
                  <Truck className="h-5 w-5 text-[#B54431]" /> Entrega
                </h4>
                <div className="grid grid-cols-2 gap-3">
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
                <h4 className="mb-2 flex items-center gap-2 text-lg font-black">
                  <Flame className="h-5 w-5 text-[#B54431]" /> Cocción
                </h4>
                <div className="grid grid-cols-2 gap-3">
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
          </>
        )}

        {mobileOrderStep === 2 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3">
              <Search className="h-4 w-4 text-[#74655B]" />
              <input
                className="w-full bg-transparent text-sm font-semibold outline-none"
                placeholder="Buscar variedad..."
                type="text"
              />
              <button
                className="rounded-xl border border-[#E8D3BF] px-3 py-2 text-xs font-black"
                type="button"
              >
                Filtrar
              </button>
            </div>
            <div className="flex gap-2">
              {['Todas', 'Saladas', 'Dulces'].map((filter, index) => (
                <button
                  key={filter}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-black',
                    index === 0
                      ? 'bg-[#B54431] text-white'
                      : 'border border-[#E8D3BF] bg-white text-[#2D2622]',
                  ].join(' ')}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
            {activeMenuItems.map((menuItem) => {
              const quantity = form.quantities[menuItem.id] ?? 0;
              return (
                <article
                  aria-label={`Variedad ${menuItem.name}`}
                  key={menuItem.id}
                  className={[
                    'rounded-[1.35rem] border bg-[#FFFDF9] p-3 shadow-sm',
                    quantity > 0 ? 'border-[#B54431] bg-[#B54431]/5' : 'border-[#E8D3BF]',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#E8D3BF] text-2xl">
                      🥟
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black">{menuItem.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#74655B]">
                        Doc. {formatMoney(menuItem.priceDozen)} · Med.{' '}
                        {formatMoney(menuItem.priceHalfDozen)} · Un.{' '}
                        {formatMoney(menuItem.priceUnit)}
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <button
                          aria-label="+ Docena"
                          className="rounded-xl bg-[#17325c] py-2 text-xs font-black text-white"
                          onClick={() => setQuantity(menuItem.id, 12)}
                          type="button"
                        >
                          + Docena
                        </button>
                        <button
                          aria-label="+ Media"
                          className="rounded-xl bg-[#d28a2d] py-2 text-xs font-black text-white"
                          onClick={() => setQuantity(menuItem.id, 6)}
                          type="button"
                        >
                          + ½
                        </button>
                        <button
                          aria-label="+ Unidad"
                          className="rounded-xl bg-[#b54a32] py-2 text-xs font-black text-white"
                          onClick={() => setQuantity(menuItem.id, 1)}
                          type="button"
                        >
                          + Unidad
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      aria-label={`Restar ${menuItem.name}`}
                      className="rounded-full border border-[#E8D3BF] p-2 text-[#B54431] disabled:opacity-40"
                      disabled={quantity === 0}
                      onClick={() => setQuantity(menuItem.id, -1)}
                      type="button"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-black tabular-nums">{quantity} u.</span>
                    <button
                      aria-label={`Sumar ${menuItem.name}`}
                      className="rounded-full border border-[#B54431] p-2 text-[#B54431]"
                      onClick={() => setQuantity(menuItem.id, 1)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {mobileOrderStep === 3 && (
          <>
            <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-lg font-black">
                <Plus className="h-5 w-5 text-[#B54431]" /> Toppings / Salsas
              </h4>
              <div className="space-y-2">
                {availableAddons.map((addon) => {
                  const quantity = form.addonQuantities[addon.addonId] ?? 0;
                  return (
                    <article
                      aria-label={`Topping ${addon.name}`}
                      className="rounded-2xl border border-[#E8D3BF] bg-white p-3"
                      key={addon.addonId}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">{addon.name}</p>
                          <p className="text-sm font-semibold text-[#74655B]">
                            {formatMoney(addon.price)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            aria-label={`Restar ${addon.name}`}
                            className="rounded-full border border-[#E8D3BF] p-2 text-[#74655B] disabled:opacity-40"
                            disabled={quantity === 0}
                            onClick={() => setAddonQuantity(addon.addonId, -1)}
                            type="button"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-black">{quantity} u.</span>
                          <button
                            aria-label={`Sumar ${addon.name}`}
                            className="rounded-full bg-[#088954] p-2 text-white"
                            onClick={() => setAddonQuantity(addon.addonId, 1)}
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-2 text-lg font-black">
                <StickyNote className="h-5 w-5 text-[#B54431]" /> Notas
              </h4>
              <textarea
                aria-label="Notas"
                className="min-h-36 w-full rounded-2xl border border-[#E8D3BF] bg-white px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#B54431]/25"
                maxLength={250}
                onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                placeholder="Indicaciones especiales, referencias de dirección, etc."
                value={form.notes}
              />
              <p className="mt-1 text-right text-xs font-semibold text-[#74655B]">
                {form.notes.length}/250
              </p>
            </section>

            <section
              aria-label="Preview de total"
              className="rounded-[1.5rem] border border-[#E8D3BF] bg-[#FFFDF9] p-4 shadow-sm"
            >
              <h4 className="mb-3 flex items-center gap-2 text-lg font-black">
                <ReceiptText className="h-5 w-5 text-[#B54431]" /> Resumen del pedido
              </h4>
              <div className="space-y-2 text-sm font-semibold text-[#74655B]">
                {selectedItems.map(({ menuItem, quantity }) => {
                  const itemTotal = calculateItemPrice({
                    quantity,
                    priceUnit: menuItem.priceUnit,
                    priceHalfDozen: menuItem.priceHalfDozen,
                    priceDozen: menuItem.priceDozen,
                  }).total;
                  return (
                    <div className="flex justify-between gap-3" key={menuItem.id}>
                      <span className="min-w-0 truncate">
                        {menuItem.name} · {quantity} u.
                      </span>
                      <span className="font-bold text-[#2D2622]">{formatMoney(itemTotal)}</span>
                    </div>
                  );
                })}
                {selectedAddons.map(({ addon, quantity }) => (
                  <div className="flex justify-between gap-3" key={addon.addonId}>
                    <span>
                      {addon.name} · {quantity} u.
                    </span>
                    <span className="font-bold text-[#2D2622]">
                      {formatMoney(addon.price * quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#E8D3BF] pt-2">
                  <span>Subtotal</span>
                  <span>{formatMoney(preview.subtotal)}</span>
                </div>
                {combinedDozenPromo && (
                  <div className="flex justify-between rounded-xl bg-emerald-50 px-3 py-2 text-[#088954] ring-1 ring-emerald-100">
                    <span>{combinedDozenPromo.label}</span>
                    <span>−{formatMoney(combinedDozenPromo.amount)}</span>
                  </div>
                )}
                {preview.promoSubtotal !== preview.subtotal && (
                  <div className="flex justify-between text-[#088954]">
                    <span>Subtotal con promos</span>
                    <span>{formatMoney(preview.promoSubtotal)}</span>
                  </div>
                )}
                {preview.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{formatMoney(preview.deliveryFee)}</span>
                  </div>
                )}
                {preview.cookingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Cocinado</span>
                    <span>{formatMoney(preview.cookingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#088954]">
                  <span>Descuento ({preview.discountPercent}%)</span>
                  <span>−{formatMoney(preview.discount)}</span>
                </div>
                <div className="border-t border-dashed border-[#E8D3BF] pt-3">
                  <div className="flex items-end justify-between text-[#2D2622]">
                    <span className="font-black">Total</span>
                    <span className="text-3xl font-black text-[#B54431]">
                      {formatMoney(preview.total)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  Pedido seguro y confirmado. Te contactaremos si necesitamos confirmar algún
                  detalle.
                </span>
              </div>
            </div>

            {formErrors.length > 0 && (
              <div
                aria-label="Errores del pedido"
                aria-live="polite"
                className="rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3"
                role="status"
              >
                <ul className="space-y-0.5 text-sm font-semibold text-destructive">
                  {formErrors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sticky bottom-0 z-10 border-t border-[#E8D3BF] bg-[#FCF8F2]/95 px-4 py-3 backdrop-blur">
        {mobileOrderStep < 3 ? (
          <div className="flex items-center justify-between gap-3">
            {mobileOrderStep > 1 && (
              <button
                className="rounded-2xl border border-[#E8D3BF] bg-white px-5 py-3.5 text-sm font-black text-[#2D2622] shadow-sm"
                onClick={goBackMobileOrderStep}
                type="button"
              >
                Volver
              </button>
            )}
            {mobileOrderStep === 2 && (
              <div className="min-w-0 flex-1 text-sm font-black text-[#2D2622]">
                <p>{selectedUnitCount} u. seleccionadas</p>
                <p className="text-[#74655B]">{formatMoney(preview.total)}</p>
              </div>
            )}
            <button
              className="ml-auto rounded-2xl bg-[#B54431] px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-[#B54431]/20"
              onClick={advanceMobileOrderStep}
              type="button"
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl border border-[#E8D3BF] bg-white px-5 py-3.5 text-sm font-black text-[#2D2622] shadow-sm"
              onClick={goBackMobileOrderStep}
              type="button"
            >
              Volver
            </button>
            <div className="min-w-0 flex-1 text-sm font-black text-[#2D2622]">
              <p>Total</p>
              <p className="text-xl text-[#B54431]">{formatMoney(preview.total)}</p>
            </div>
            <button
              className="rounded-2xl bg-[#B54431] px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-[#B54431]/20 disabled:opacity-60"
              disabled={createOrder.isPending || updateOrder.isPending}
              onClick={() => void submitOrder()}
              type="button"
            >
              {editingOrderId ? 'Guardar cambios' : 'Crear pedido'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── Render principal ────────────────────────────────────────────────────────

  const searchControl = (
    <label className="block">
      <span className="sr-only">Buscar pedido</span>
      <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2.5 text-sm shadow-sm transition focus-within:ring-2 focus-within:ring-ring/30">
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
  );

  const dateFilterControl = (
    <label className="block">
      <span className="sr-only">Fecha entrega</span>
      <input
        aria-label="Filtrar por fecha de entrega"
        className="w-full rounded-full border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
        onChange={(event) => setDeliveryDateFilter(event.target.value)}
        type="date"
        value={deliveryDateFilter}
      />
    </label>
  );

  const statusFilterControl = (
    <label className="block">
      <span className="sr-only">Estado</span>
      <select
        aria-label="Estado"
        className="w-full rounded-full border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
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
  );

  const methodFilterControl = (
    <label className="block">
      <span className="sr-only">Método</span>
      <select
        aria-label="Método"
        className="w-full rounded-full border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
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
  );

  const sortFilterControl = (
    <label className="block">
      <span className="sr-only">Más filtros</span>
      <div className="relative">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          aria-label="Ordenar por"
          className="w-full rounded-full border border-border bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-foreground outline-none shadow-sm transition focus:ring-2 focus:ring-ring/30"
          onChange={(event) => handleSortOptionChange(event.target.value as OrderSortOption)}
          value={sortOption}
        >
          {(Object.keys(orderSortLabels) as OrderSortOption[]).map((option) => (
            <option key={option} value={option}>
              {orderSortLabels[option]}
            </option>
          ))}
        </select>
      </div>
    </label>
  );

  const summaryCards = [
    {
      label: 'Pedidos activos',
      value: summary.active,
      hint: 'En preparación',
      icon: ClipboardList,
      tone: 'bg-red-100 text-primary',
      dot: 'bg-red-500',
    },
    {
      label: 'Pedidos finalizados',
      value: summary.finalized,
      hint: 'Entregados y pagos',
      icon: CheckCircle2,
      tone: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-600',
    },
    {
      label: 'Pendientes',
      value: summary.pending,
      hint: 'Por preparar',
      icon: Clock,
      tone: 'bg-yellow-100 text-yellow-900',
      dot: 'bg-amber-500',
    },
    {
      label: 'Ventas del día',
      value: formatMoney(summary.dailySales),
      hint: deliveryDateFilter ? formatDateAr(deliveryDateFilter) : 'Hoy',
      icon: CircleDollarSign,
      tone: 'bg-indigo-100 text-indigo-800',
      dot: 'bg-sky-600',
    },
  ];

  const isDesktopDetailOpen = Boolean(expandedOrderId && isDesktopDetail);

  return (
    <div
      className={[
        'animate-fade-in',
        isDesktopDetailOpen
          ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]'
          : 'space-y-6',
      ].join(' ')}
    >
      <div className="min-w-0 space-y-6">
        <PageHero
          title="Pedidos"
          description="Administrá y seguí todos los pedidos de tu emprendimiento."
        >
          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-4 py-2.5 text-sm font-black text-foreground shadow-card transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={visibleOrders.length === 0}
            onClick={exportVisibleOrders}
            type="button"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            aria-label="+ Nuevo pedido"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nuevo pedido
          </button>
        </PageHero>

        <section
          aria-label="Resumen de pedidos"
          className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4"
        >
          {summaryCards.map(({ label, value, hint, icon: Icon, tone, dot }) => (
            <article
              key={label}
              className="rounded-2xl border border-border/70 bg-white/85 p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft sm:p-5"
            >
              <div className="flex items-start gap-2.5 sm:gap-4">
                <span className={`rounded-full p-2 sm:rounded-2xl sm:p-3 ${tone}`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-black leading-tight text-muted-foreground sm:text-sm sm:font-semibold">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-black text-foreground tabular-nums sm:text-2xl">
                    {value}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] font-bold leading-tight text-muted-foreground sm:mt-2 sm:text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
                    <span className="truncate">{hint}</span>
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section
          aria-label="Variedades pendientes"
          className="rounded-3xl border border-primary/15 bg-white/85 p-4 shadow-card sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                Cocina pendiente
              </p>
              <h2 className="mt-1 text-xl font-black text-foreground">Variedades pendientes</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Suma sólo pedidos activos en confirmado; los listos o entregados no cuentan.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
              {pendingVarietyUnits} u.
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {displayPendingVarieties.length > 0 ? (
              displayPendingVarieties.map((item) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full border border-[#E8D3BF] bg-[#FCF8F2] px-3 py-2 text-sm font-black text-[#2D2622]"
                  key={item.menuItemId}
                >
                  <span className="rounded-full bg-[#B54431] px-2 py-0.5 text-xs text-white">
                    {formatVarietyQuantity(item.quantity)}
                  </span>
                  {item.menuItemName}
                </span>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm font-bold text-muted-foreground">
                No hay variedades pendientes de preparar.
              </p>
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-4">
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

          <div className="rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card">
            {isDesktopDetail ? (
              <div
                className={[
                  'grid gap-3',
                  isDesktopDetailOpen
                    ? 'md:grid-cols-2 2xl:grid-cols-[minmax(220px,1fr)_150px_155px_155px_165px] 2xl:items-center'
                    : 'xl:grid-cols-[minmax(260px,1fr)_170px_170px_170px_180px] xl:items-center',
                ].join(' ')}
              >
                {searchControl}
                {dateFilterControl}
                {statusFilterControl}
                {methodFilterControl}
                {sortFilterControl}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  {searchControl}
                  <button
                    aria-expanded={isFilterPanelOpen}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-black text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary"
                    onClick={() => setIsFilterPanelOpen((open) => !open)}
                    type="button"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[0.65rem] text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
                {isFilterPanelOpen && (
                  <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/60 p-3">
                    {dateFilterControl}
                    {statusFilterControl}
                    {methodFilterControl}
                    {sortFilterControl}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedOrderIds.size > 0 && (
            <div
              aria-live="polite"
              className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/8 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-black text-foreground">
                  {selectedOrderIds.size} pedido{selectedOrderIds.size === 1 ? '' : 's'}{' '}
                  seleccionado
                  {selectedOrderIds.size === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Generá una lista para cocina y se copia automáticamente.
                </p>
                {kitchenListFeedback && (
                  <p className="mt-2 text-xs font-black text-primary">{kitchenListFeedback}</p>
                )}
                {generatedKitchenList ? (
                  <textarea
                    aria-label="Lista de cocina generada"
                    className="mt-3 h-36 w-full rounded-2xl border border-border bg-white p-3 text-xs font-semibold text-foreground shadow-inner outline-none focus:ring-2 focus:ring-ring/30"
                    readOnly
                    value={generatedKitchenList}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm font-black text-foreground transition hover:border-primary/30"
                  onClick={clearOrderSelection}
                  type="button"
                >
                  Limpiar
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 disabled:opacity-60"
                  disabled={isGeneratingKitchenList}
                  onClick={generateKitchenList}
                  type="button"
                >
                  <ClipboardList className="h-4 w-4" />
                  {isGeneratingKitchenList ? 'Generando...' : 'Generar lista'}
                </button>
              </div>
            </div>
          )}

          {/* Header de tabla con sort clickeable */}
          <div
            aria-label="Encabezado de tabla de pedidos"
            className={[
              'hidden rounded-xl border border-border/70 bg-foreground/5 px-5 py-3 text-xs font-black uppercase tracking-wide text-foreground/70 lg:grid lg:gap-5',
              isDesktopDetailOpen
                ? 'lg:grid-cols-[auto_1fr_1.35fr_1fr_0.9fr_1fr_auto] 2xl:grid-cols-[auto_1fr_1.35fr_1fr_0.9fr_1fr_0.9fr_auto]'
                : 'lg:grid-cols-[auto_1.05fr_1.55fr_1.1fr_1fr_1.2fr_0.95fr_auto]',
            ].join(' ')}
          >
            <span aria-hidden="true" />
            <span>Pedido</span>
            {(
              (isDesktopDetailOpen
                ? ['name', 'date', 'method', 'status', 'total']
                : ['name', 'date', 'method', 'status', 'total']) as TableSortColumn[]
            ).map((col) => {
              const labels: Record<TableSortColumn, string> = {
                name: 'Cliente',
                date: 'Entrega',
                method: 'Método',
                status: 'Estado',
                total: 'Total',
              };
              const isActive = tableSortCol === col;
              const Icon = isActive ? (tableSortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <button
                  key={col}
                  className={[
                    'flex items-center gap-1 transition-colors hover:text-foreground',
                    col === 'total' && isDesktopDetailOpen ? 'hidden 2xl:flex' : '',
                    isActive ? 'text-primary' : '',
                  ].join(' ')}
                  onClick={() => toggleTableSort(col)}
                  type="button"
                >
                  {labels[col]}
                  <Icon className="h-3 w-3" />
                </button>
              );
            })}
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

          {orderPagination && orderPagination.total > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/80 p-3 text-sm font-bold text-muted-foreground shadow-card sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando página {orderPagination.page} de {orderPagination.totalPages} ·{' '}
                {orderPagination.total} pedidos
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-foreground transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!orderPagination.hasPreviousPage || ordersQuery.isFetching}
                  onClick={() => setOrderPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-foreground transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!orderPagination.hasNextPage || ordersQuery.isFetching}
                  onClick={() => setOrderPage((page) => page + 1)}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isDesktopDetailOpen && (
        <aside
          aria-label="Detalle del pedido seleccionado"
          aria-modal="false"
          className="hidden h-dvh max-h-dvh overflow-hidden border-l border-border bg-card shadow-2xl lg:sticky lg:top-0 lg:-my-6 lg:flex lg:flex-col"
          role="dialog"
        >
          <OrderDetailPanel
            detail={orderDetailQuery.data}
            isLoading={orderDetailQuery.isLoading}
            onCancel={cancelOrderFromDetail}
            onClose={closeOrderDetail}
            onMarkPayment={markPaymentFromDetail}
            onMarkStatus={markStatusFromDetail}
          />
        </aside>
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
              onMarkPayment={markPaymentFromDetail}
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
              aria-label={mobileDialogTitle}
              aria-modal="true"
              className="animate-modal-enter flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#E8D3BF] bg-[#FCF8F2] shadow-2xl sm:max-h-[92dvh] sm:max-w-7xl sm:rounded-3xl"
              role="dialog"
            >
              {/* Header del modal — sticky */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8D3BF] bg-[#FFFDF9] px-4 py-3.5 sm:px-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {mobileDialogTitle}
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
              <div className="flex-1 overflow-y-auto px-0 py-0 sm:px-5 sm:py-4">
                {isDesktopDetail ? orderForm : mobileOrderForm}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
};
