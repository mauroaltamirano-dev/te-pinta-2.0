import type { OrderStatus } from '@te-pinta/shared';

import type { OrderListItem } from '../orders/orders-api';
import type { Customer } from './customers-api';
import type {
  CustomerEnrichment,
  CustomerFilterId,
  CustomerOrderStatus,
  CustomerPaymentStatus,
  CustomerProfile,
  CustomerPurchaseRecord,
  CustomerStatus,
  CustomerVarietyRank,
  CustomersSummaryMetrics,
} from './types';

export const ACTIVE_PURCHASE_DAYS = 30;
export const REACTIVATION_DAYS = 45;
export const NEW_CUSTOMER_DAYS = 30;
export const RECURRING_ORDER_THRESHOLD = 3;

const MS_PER_DAY = 86_400_000;

export const formatMoney = (value: number): string =>
  `$ ${Math.round(value).toLocaleString('es-AR')}`;

export const normalizePhoneDigits = (phone: string): string => phone.replace(/\D/g, '');

export const buildWhatsAppHref = (phone: string): string => {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '';
  const normalized = digits.startsWith('54') ? digits : `54${digits}`;
  return `https://wa.me/${normalized}`;
};

export const buildPhoneHref = (phone: string): string => `tel:${normalizePhoneDigits(phone)}`;

export const parseIsoDate = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);

export const daysSinceIsoDate = (isoDate: string | null, reference = new Date()): number | null => {
  if (!isoDate) return null;
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return null;
  return Math.max(0, daysBetween(parsed, reference));
};

export const formatShortDate = (isoDate: string): string => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    parsed,
  );
};

export const formatCompactDate = (isoDate: string): string => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(parsed);
};

export const formatRelativePurchaseDate = (
  isoDate: string | null,
  reference = new Date(),
): string => {
  if (!isoDate) return 'Sin compras';

  const days = daysSinceIsoDate(isoDate, reference);
  if (days === null) return 'Sin compras';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;

  return formatShortDate(isoDate);
};

const mapOrderStatus = (status: OrderStatus): CustomerOrderStatus => {
  if (status === 'confirmado') return 'confirmado';
  if (status === 'preparado') return 'por-producir';
  if (status === 'entregado') return 'entregado';
  return 'pendiente';
};

const mapPaymentStatus = (isPaid: boolean, total: number, paidAmount?: number): CustomerPaymentStatus => {
  if (isPaid) return 'pagado';
  if (paidAmount && paidAmount > 0 && paidAmount < total) return 'parcial';
  return 'pendiente';
};

export const orderListItemToPurchaseRecord = (order: OrderListItem): CustomerPurchaseRecord => ({
  id: order.id,
  date: order.deliveryDate,
  summary:
    order.itemCount > 0
      ? `${order.itemCount} ítem${order.itemCount === 1 ? '' : 's'} · ${order.totalQuantity} u.`
      : `Pedido · ${order.totalQuantity} u.`,
  total: order.total,
  dozens: Math.round((order.totalQuantity / 12) * 10) / 10,
  status: mapOrderStatus(order.status),
  paymentStatus: mapPaymentStatus(order.isPaid, order.total),
});

const recalculateVarietyPercents = (ranking: CustomerVarietyRank[]): CustomerVarietyRank[] => {
  const totalUnits = ranking.reduce((sum, item) => sum + item.units, 0);
  if (!totalUnits) return ranking;

  return ranking.map((item) => ({
    ...item,
    percent: Math.round((item.units / totalUnits) * 100),
  }));
};

export const buildVarietyInsight = (ranking: CustomerVarietyRank[], customerName: string): string => {
  if (!ranking.length) return `${customerName} todavía no tiene variedades destacadas.`;
  const [first, second] = ranking;
  if (!first) return `${customerName} todavía no tiene variedades destacadas.`;
  if (!second || second.percent < 12) {
    return `${customerName.split(' ')[0]} suele pedir más ${first.variety}.`;
  }
  return `${customerName.split(' ')[0]} suele pedir más ${first.variety} y ${second.variety}.`;
};

const computePurchaseFrequencyDays = (orders: CustomerPurchaseRecord[]): number | null => {
  if (orders.length < 2) return null;

  const sortedDates = [...orders]
    .map((order) => parseIsoDate(order.date))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (sortedDates.length < 2) return null;

  let totalGap = 0;
  for (let index = 1; index < sortedDates.length; index += 1) {
    totalGap += daysBetween(sortedDates[index - 1]!, sortedDates[index]!);
  }

  return Math.round(totalGap / (sortedDates.length - 1));
};

export const resolveCustomerStatuses = ({
  orderCount,
  daysSinceLastPurchase,
  debtAmount,
  enrichment,
  reference = new Date(),
}: {
  orderCount: number;
  daysSinceLastPurchase: number | null;
  debtAmount: number;
  enrichment?: CustomerEnrichment;
  reference?: Date;
}): { status: CustomerStatus; displayStatuses: CustomerStatus[] } => {
  const createdAt = enrichment?.createdAt;
  const daysSinceCreated = createdAt ? daysSinceIsoDate(createdAt, reference) : null;
  const isWholesale =
    enrichment?.isWholesale || enrichment?.tags?.some((tag) => tag.toLowerCase().includes('mayorista'));

  const displayStatuses: CustomerStatus[] = [];

  if (debtAmount > 0) displayStatuses.push('con-deuda');
  if (isWholesale) displayStatuses.push('mayorista');

  const inactiveForReactivation =
    orderCount > 0 &&
    daysSinceLastPurchase !== null &&
    daysSinceLastPurchase > REACTIVATION_DAYS &&
    !enrichment?.isLost &&
    !enrichment?.isBlocked;

  if (inactiveForReactivation) {
    displayStatuses.push('para-reactivar');
    return { status: 'para-reactivar', displayStatuses };
  }

  if (daysSinceLastPurchase !== null && daysSinceLastPurchase <= ACTIVE_PURCHASE_DAYS) {
    if (orderCount >= RECURRING_ORDER_THRESHOLD) {
      displayStatuses.push('recurrente');
      return { status: 'recurrente', displayStatuses };
    }
    if (orderCount >= 2) {
      displayStatuses.push('frecuente');
      return { status: 'frecuente', displayStatuses };
    }
    displayStatuses.push('activo');
    return { status: 'activo', displayStatuses };
  }

  if (
    daysSinceCreated !== null &&
    daysSinceCreated <= NEW_CUSTOMER_DAYS &&
    orderCount <= 1
  ) {
    displayStatuses.push('nuevo');
    return { status: 'nuevo', displayStatuses };
  }

  if (daysSinceLastPurchase !== null && daysSinceLastPurchase > ACTIVE_PURCHASE_DAYS) {
    displayStatuses.push('inactivo');
    return { status: 'inactivo', displayStatuses };
  }

  displayStatuses.push('activo');
  return { status: 'activo', displayStatuses };
};

export const buildCustomerProfile = (
  customer: Customer,
  apiOrders: OrderListItem[],
  reference = new Date(),
): CustomerProfile => {
  const customerOrders = apiOrders
    .filter((order) => order.customer.id === customer.id)
    .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate));

  const apiPurchaseHistory = customerOrders.map(orderListItemToPurchaseRecord);
  const orders = apiPurchaseHistory.slice(0, 20);

  const orderCount = customerOrders.length;
  const totalPurchased = customerOrders.reduce((sum, order) => sum + order.total, 0);

  const unpaidFromApi = customerOrders
    .filter((order) => !order.isPaid)
    .reduce((sum, order) => sum + order.total, 0);

  const debtAmount = unpaidFromApi;
  const lastPurchaseAt = orders[0]?.date ?? null;
  const daysSinceLastPurchase = daysSinceIsoDate(lastPurchaseAt, reference);

  const dozensPurchased =
    customerOrders.reduce((sum, order) => sum + order.totalQuantity, 0) / 12;

  const averageTicket = orderCount ? totalPurchased / orderCount : 0;
  const purchaseFrequencyDays = computePurchaseFrequencyDays(orders);

  const varietyRanking = recalculateVarietyPercents([]);
  const favoriteVariety = varietyRanking[0]?.variety ?? 'Sin datos';

  const { status, displayStatuses } = resolveCustomerStatuses({
    orderCount,
    daysSinceLastPurchase,
    debtAmount,
    reference,
  });

  const pendingFromOrders = customerOrders
    .filter((order) => order.status !== 'entregado')
    .reduce((sum, order) => sum + order.total, 0);

  return {
    ...customer,
    neighborhood: extractNeighborhood(customer.address),
    createdAt: inferCreatedAt(customerOrders),
    status,
    displayStatuses,
    tags: [],
    notes: [],
    importantNote: null,
    nextOrderLabel: null,
    orders,
    debtAmount,
    favoriteVariety,
    lastPurchaseAt,
    daysSinceLastPurchase,
    orderCount,
    totalPurchased,
    averageTicket,
    dozensPurchased: Math.round(dozensPurchased * 10) / 10,
    purchaseFrequencyDays,
    varietyRanking,
    varietyInsight: buildVarietyInsight(varietyRanking, customer.name),
    pendingCollection: debtAmount > 0 ? debtAmount : pendingFromOrders,
    isForReactivation: displayStatuses.includes('para-reactivar'),
    isWholesale: false,
  };
};

const extractNeighborhood = (address: string | null): string | null => {
  if (!address?.trim()) return null;
  const parts = address.split(',').map((part) => part.trim());
  return parts.length > 1 ? (parts[parts.length - 1] ?? null) : null;
};

const inferCreatedAt = (orders: OrderListItem[]): string => {
  if (!orders.length) return new Date().toISOString().slice(0, 10);
  const earliest = [...orders].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0];
  return earliest?.deliveryDate ?? new Date().toISOString().slice(0, 10);
};

export const buildCustomerProfiles = (
  customers: Customer[],
  orders: OrderListItem[],
  reference = new Date(),
): CustomerProfile[] =>
  customers.map((customer) => buildCustomerProfile(customer, orders, reference));

export const computeCustomersSummary = (profiles: CustomerProfile[]): CustomersSummaryMetrics => {
  const reference = new Date();
  const month = reference.getMonth();
  const year = reference.getFullYear();

  const newThisMonth = profiles.filter((profile) => {
    const created = parseIsoDate(profile.createdAt);
    return created && created.getMonth() === month && created.getFullYear() === year;
  }).length;

  const active = profiles.filter(
    (profile) =>
      profile.daysSinceLastPurchase !== null &&
      profile.daysSinceLastPurchase <= ACTIVE_PURCHASE_DAYS,
  ).length;

  const recurring = profiles.filter(
    (profile) =>
      profile.status === 'recurrente' ||
      profile.status === 'frecuente' ||
      profile.orderCount >= RECURRING_ORDER_THRESHOLD,
  ).length;

  const withDebt = profiles.filter((profile) => profile.debtAmount > 0).length;
  const totalSold = profiles.reduce((sum, profile) => sum + profile.totalPurchased, 0);

  return {
    total: profiles.length,
    active,
    newThisMonth,
    recurring,
    withDebt,
    totalSold,
  };
};

export const matchesCustomerSearch = (profile: CustomerProfile, query: string): boolean => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    profile.name,
    profile.phone ?? '',
    profile.address ?? '',
    profile.neighborhood ?? '',
    profile.importantNote ?? '',
    ...profile.tags,
    ...profile.notes.map((note) => note.text),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
};

export const matchesCustomerFilter = (
  profile: CustomerProfile,
  filter: CustomerFilterId,
): boolean => {
  switch (filter) {
    case 'todos':
      return true;
    case 'activos':
      return (
        profile.status === 'activo' ||
        profile.status === 'recurrente' ||
        profile.status === 'frecuente'
      );
    case 'recurrentes':
      return (
        profile.status === 'recurrente' ||
        profile.status === 'frecuente' ||
        profile.orderCount >= RECURRING_ORDER_THRESHOLD
      );
    case 'nuevos':
      return profile.status === 'nuevo';
    case 'inactivos':
      return profile.status === 'inactivo';
    case 'mayoristas':
      return profile.isWholesale || profile.displayStatuses.includes('mayorista');
    case 'con-deuda':
      return profile.debtAmount > 0 || profile.displayStatuses.includes('con-deuda');
    case 'para-reactivar':
      return profile.isForReactivation;
    default:
      return true;
  }
};

export const statusLabels: Record<CustomerStatus, string> = {
  nuevo: 'Nuevo',
  activo: 'Activo',
  recurrente: 'Recurrente',
  inactivo: 'Inactivo',
  mayorista: 'Mayorista',
  frecuente: 'Frecuente',
  'con-deuda': 'Con deuda',
  'para-reactivar': 'Para reactivar',
};

export const filterLabels: Record<CustomerFilterId, string> = {
  todos: 'Todos',
  activos: 'Activos',
  recurrentes: 'Recurrentes',
  nuevos: 'Nuevos',
  inactivos: 'Inactivos',
  mayoristas: 'Mayoristas',
  'con-deuda': 'Con deuda',
  'para-reactivar': 'Para reactivar',
};
