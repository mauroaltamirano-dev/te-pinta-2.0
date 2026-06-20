import { type ComponentType } from 'react';

import {
  getBusinessDateIso,
  type DashboardQuery,
  type DeliveryTime,
  type OrderStatus,
} from '@te-pinta/shared';

import type {
  DashboardCalendarDay,
  DashboardKpiComparison,
  DashboardTotals,
  DashboardTopClient,
  DashboardTopVariety,
} from './dashboard-api';
import {
  type DashboardAlert,
  type DashboardCustomerSummary,
  type DashboardWallet,
  type DashboardWalletStatus,
  type DashboardMockOrder,
  type DashboardPaymentStatus,
  type DashboardProductionStatus,
  type DashboardProductionSummary,
  type DashboardUrgency,
  type DashboardVarietySale,
  type DashboardWeeklySale,
} from './dashboard.mock';
import type { OrderListItem } from '../orders/orders-api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DashboardPeriod = 'week' | 'month' | 'all' | 'custom';

export type PeriodRange = {
  startDate: string;
  endDate: string;
  label: string;
};

export type DashboardOrderCard = Omit<DashboardMockOrder, 'dozens'> & {
  dozens: number | null;
  href: string;
  isPaid: boolean;
  status: OrderStatus;
};

export type KpiCardData = {
  id: string;
  title: string;
  value: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  comparison: DashboardKpiComparison;
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'olive' | 'neutral';
  helpText?: string;
};

export type DashboardMoneyChartPoint = {
  date: string;
  day: string;
  value: number;
};

type PurchaseSpendSource = {
  purchaseDate: string;
  canceledAt: string | Date | null;
  items: Array<{ totalPriceCents: number }>;
};

type PurchaseFundingSummary = {
  productionCostCents: number;
  profitCents: number;
  servicesCents: number;
};

// ── Formatters ─────────────────────────────────────────────────────────────────

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const headerDateFormatter = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const compactDateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
});

const weekdayFormatter = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

// ── Lookup maps ────────────────────────────────────────────────────────────────

export const deliveryTextLabels: Record<DeliveryTime, string> = {
  mediodia: 'Mediodía',
  tarde: 'Tarde',
  noche: 'Noche',
};

export const productionStatusByOrderStatus: Record<OrderStatus, DashboardProductionStatus> = {
  confirmado: 'Por producir',
  preparado: 'Producido',
  entregado: 'Producido',
};

export const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'all', label: 'Siempre' },
  { value: 'custom', label: 'Personalizado' },
];

// ── Pure helpers ───────────────────────────────────────────────────────────────

export const formatMoney = (value: number | null | undefined): string =>
  `$${moneyFormatter.format(Math.round(value ?? 0))}`;

export const formatDozens = (value: number | null | undefined): string =>
  `${numberFormatter.format(value ?? 0)} doc${(value ?? 0) === 1 ? 'ena' : 'enas'}`;

export const formatQuantity = (value: number | null | undefined): string =>
  numberFormatter.format(value ?? 0);

export const parseLocalDate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
};

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const addLocalDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
};

export const today = (): string => getBusinessDateIso(new Date());

const startOfMondayWeek = (date: Date): Date => addLocalDays(date, -((date.getDay() + 6) % 7));

const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const formatHeaderDate = (date: string): string =>
  capitalize(headerDateFormatter.format(parseLocalDate(date)));

export const formatCompactDate = (date: string): string =>
  compactDateFormatter.format(parseLocalDate(date));

export const getDashboardOrderCode = (id: string): string => {
  const lastSegment = id.split('-').at(-1) ?? id;

  return /^\d+$/.test(lastSegment)
    ? `#${lastSegment.padStart(4, '0')}`
    : `#${lastSegment.slice(-6).toUpperCase()}`;
};

export const getPeriodRange = (
  period: DashboardPeriod,
  baseDate: string,
  customStartDate: string,
  customEndDate: string,
): PeriodRange => {
  const date = parseLocalDate(baseDate);

  if (period === 'week') {
    const startDate = toIsoDate(startOfMondayWeek(date));
    const endDate = toIsoDate(addLocalDays(parseLocalDate(startDate), 6));

    return {
      startDate,
      endDate,
      label: `Semana · ${formatCompactDate(startDate)} al ${formatCompactDate(endDate)}`,
    };
  }

  if (period === 'month') {
    const startDate = toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const endDate = toIsoDate(endOfMonth(date));

    return {
      startDate,
      endDate,
      label: `Mes actual · ${formatCompactDate(startDate)} al ${formatCompactDate(endDate)}`,
    };
  }

  if (period === 'custom') {
    const startDate = customStartDate <= customEndDate ? customStartDate : customEndDate;
    const endDate = customStartDate <= customEndDate ? customEndDate : customStartDate;

    return {
      startDate,
      endDate,
      label: `${formatCompactDate(startDate)} al ${formatCompactDate(endDate)}`,
    };
  }

  if (period === 'all') {
    return { startDate: baseDate, endDate: baseDate, label: 'Siempre' };
  }

  const startDate = toIsoDate(startOfMondayWeek(date));
  const endDate = toIsoDate(addLocalDays(parseLocalDate(startDate), 6));

  return {
    startDate,
    endDate,
    label: `Semana · ${formatCompactDate(startDate)} al ${formatCompactDate(endDate)}`,
  };
};

export const buildDashboardRequest = (
  period: DashboardPeriod,
  periodRange: PeriodRange,
  date: string,
): DashboardQuery =>
  period === 'all'
    ? { date, analyticsMode: 'preset', preset: 'all' }
    : {
        date,
        analyticsMode: 'custom',
        startDate: periodRange.startDate,
        endDate: periodRange.endDate,
      };

export const getRelativeDeliveryLabel = (
  deliveryDate: string,
  deliveryTime: DeliveryTime,
  referenceDate: string,
): string => {
  const diffDays = Math.round(
    (parseLocalDate(deliveryDate).getTime() - parseLocalDate(referenceDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );
  const dayLabel =
    diffDays === 0 ? 'Hoy' : diffDays === 1 ? 'Mañana' : formatCompactDate(deliveryDate);

  return `${dayLabel} · ${deliveryTextLabels[deliveryTime]}`;
};

export const getUrgency = (deliveryDate: string, referenceDate: string): DashboardUrgency => {
  const diffDays = Math.round(
    (parseLocalDate(deliveryDate).getTime() - parseLocalDate(referenceDate).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (diffDays <= 0) return 'Urgente';
  if (diffDays === 1) return 'Mañana';

  return 'Próximo';
};

// ── Tone helpers ───────────────────────────────────────────────────────────────

export const getPaymentTone = (
  status: DashboardPaymentStatus,
): 'success' | 'warning' | 'danger' => {
  if (status === 'Pagado') return 'success';
  if (status === 'Cobro parcial') return 'warning';

  return 'danger';
};

export const getProductionTone = (
  status: DashboardProductionStatus,
): 'success' | 'warning' | 'info' => {
  if (status === 'Producido' || status === 'Confirmado') return 'success';
  if (status === 'Por producir') return 'warning';

  return 'info';
};

export const getUrgencyTone = (
  urgency: DashboardUrgency,
): 'danger' | 'warning' | 'info' | 'neutral' => {
  if (urgency === 'Urgente') return 'danger';
  if (urgency === 'Hoy') return 'warning';
  if (urgency === 'Mañana') return 'info';

  return 'neutral';
};

export const buildSalesMoneySeries = (
  chartDays: DashboardCalendarDay[],
): DashboardMoneyChartPoint[] =>
  chartDays.map((day) => ({
    date: day.date,
    day: formatCompactDate(day.date),
    value: day.revenue,
  }));

export const buildPurchaseSpendSeries = (
  purchases: PurchaseSpendSource[],
  chartDays: DashboardCalendarDay[],
): DashboardMoneyChartPoint[] => {
  const spendByDate = new Map<string, number>();

  purchases
    .filter((purchase) => !purchase.canceledAt)
    .forEach((purchase) => {
      const total = purchase.items.reduce((sum, item) => sum + item.totalPriceCents, 0) / 100;
      spendByDate.set(purchase.purchaseDate, (spendByDate.get(purchase.purchaseDate) ?? 0) + total);
    });

  const dates =
    chartDays.length > 0
      ? chartDays.map((day) => day.date)
      : [...spendByDate.keys()].sort((left, right) => left.localeCompare(right));

  return dates.map((date) => ({
    date,
    day: formatCompactDate(date),
    value: spendByDate.get(date) ?? 0,
  }));
};

export const getMoneyAxisTicks = (maxValue: number): number[] => {
  const safeMaxValue = Math.max(Math.round(maxValue), 0);

  return [safeMaxValue, Math.round(safeMaxValue / 2), 0];
};

const purchaseCentsToMoney = (cents: number): number => Math.round(cents / 100);

const calculateWalletStatus = (amount: number, objective: number): DashboardWalletStatus => {
  if (amount < 0) return 'critical';
  if (objective > 0 && amount < objective * 0.2) return 'low';

  return 'correct';
};

const calculateWalletProgress = (amount: number, objective: number): number => {
  if (objective <= 0) return amount > 0 ? 100 : 0;

  return Math.round((amount / objective) * 100);
};

const calculateWalletPercent = (amount: number, totalAssigned: number): number =>
  totalAssigned > 0 ? Math.round((amount / totalAssigned) * 100) : 0;

const reserveDifferenceLabel = (amount: number, positiveLabel: string, negativeLabel: string) =>
  amount < 0
    ? `${negativeLabel}: ${formatMoney(Math.abs(amount))}`
    : `${positiveLabel}: ${formatMoney(amount)}`;

export const buildDashboardWallets = ({
  totals,
  servicePercent,
  purchaseSummary,
}: {
  totals: DashboardTotals;
  servicePercent: number;
  purchaseSummary: PurchaseFundingSummary;
}): DashboardWallet[] => {
  const grossRevenue = Math.max(totals.grossRevenue, 0);
  const serviceObjective = Math.round(grossRevenue * (Math.max(servicePercent, 0) / 100));
  const productionObjective = Math.max(Math.round(totals.estimatedCosts), 0);
  const profitObjective = Math.max(Math.round(totals.estimatedProfit - serviceObjective), 0);
  const productionAmount =
    productionObjective - purchaseCentsToMoney(purchaseSummary.productionCostCents);
  const servicesAmount = serviceObjective - purchaseCentsToMoney(purchaseSummary.servicesCents);
  const profitAmount = profitObjective - purchaseCentsToMoney(purchaseSummary.profitCents);
  const totalAssigned = grossRevenue || productionObjective + serviceObjective + profitObjective;

  return [
    {
      id: 'base-cost',
      title: 'Costo base',
      amount: productionAmount,
      percent: calculateWalletPercent(productionAmount, totalAssigned),
      objectiveLabel: `Reserva estimada: ${formatMoney(productionObjective)}`,
      differenceLabel: reserveDifferenceLabel(
        productionAmount,
        'Disponible para producción',
        'Sobregiro de producción',
      ),
      status: calculateWalletStatus(productionAmount, productionObjective),
      progress: calculateWalletProgress(productionAmount, productionObjective),
      description: 'Ventas reservadas para relleno, tapas, packaging y compras de producción.',
    },
    {
      id: 'services',
      title: 'Servicios',
      amount: servicesAmount,
      percent: calculateWalletPercent(servicesAmount, totalAssigned),
      objectiveLabel: `Objetivo: ${servicePercent}% de ventas (${formatMoney(serviceObjective)})`,
      differenceLabel: reserveDifferenceLabel(
        servicesAmount,
        'Disponible para servicios',
        'Sobregiro de servicios',
      ),
      status: calculateWalletStatus(servicesAmount, serviceObjective),
      progress: calculateWalletProgress(servicesAmount, serviceObjective),
      description: 'Reserva para luz, gas, agua, combustible, comisiones y gastos operativos.',
    },
    {
      id: 'profit',
      title: 'Ganancia',
      amount: profitAmount,
      percent: calculateWalletPercent(profitAmount, totalAssigned),
      objectiveLabel: `Ganancia libre objetivo: ${formatMoney(profitObjective)}`,
      differenceLabel: reserveDifferenceLabel(
        profitAmount,
        'Ganancia libre disponible',
        'Sobregiro de ganancia',
      ),
      status: calculateWalletStatus(profitAmount, profitObjective),
      progress: calculateWalletProgress(profitAmount, profitObjective),
      description: 'Utilidad disponible luego de reservar costos, servicios y compras asignadas.',
    },
  ];
};

// ── Mappers ────────────────────────────────────────────────────────────────────

export const mapOrderToCard = (
  order: OrderListItem,
  referenceDate: string,
): DashboardOrderCard => ({
  id: order.id,
  customerName: order.customer.name,
  deliveryDate: order.deliveryDate,
  deliveryTime: deliveryTextLabels[order.deliveryTime],
  deliveryLabel: getRelativeDeliveryLabel(order.deliveryDate, order.deliveryTime, referenceDate),
  dozens: order.totalQuantity ? order.totalQuantity / 12 : null,
  paymentStatus: order.isPaid ? 'Pagado' : 'Pendiente',
  productionStatus: productionStatusByOrderStatus[order.status],
  urgency: getUrgency(order.deliveryDate, referenceDate),
  href: `/orders?orderId=${encodeURIComponent(order.id)}`,
  isPaid: order.isPaid,
  status: order.status,
});

// ── Builders ───────────────────────────────────────────────────────────────────

export const buildProductionSummaryFromOrders = (
  orders: OrderListItem[],
  referenceDate: string,
): DashboardProductionSummary => {
  const tomorrowDate = toIsoDate(addLocalDays(parseLocalDate(referenceDate), 1));
  const ordersToProduce = orders.filter((order) => order.status === 'confirmado');
  const totalUnits = ordersToProduce.reduce(
    (total, order) => total + (order.totalQuantity ?? 0),
    0,
  );
  const todayUnits = ordersToProduce
    .filter((order) => order.deliveryDate === referenceDate)
    .reduce((total, order) => total + (order.totalQuantity ?? 0), 0);
  const tomorrowUnits = ordersToProduce
    .filter((order) => order.deliveryDate === tomorrowDate)
    .reduce((total, order) => total + (order.totalQuantity ?? 0), 0);
  const varietyMap = new Map<string, number>();

  for (const order of ordersToProduce) {
    for (const item of order.items ?? []) {
      varietyMap.set(
        item.menuItemName,
        (varietyMap.get(item.menuItemName) ?? 0) + item.quantity / 12,
      );
    }
  }

  const totalDozens = totalUnits / 12;
  const boxes = Math.ceil(totalDozens);

  return {
    totalDozens,
    todayDozens: todayUnits / 12,
    tomorrowDozens: tomorrowUnits / 12,
    varieties: [...varietyMap.entries()]
      .map(([name, dozens]) => ({ name, dozens }))
      .sort((a, b) => b.dozens - a.dozens || a.name.localeCompare(b.name, 'es-AR')),
    packaging:
      totalDozens > 0
        ? [
            { name: 'Cajas', dozens: boxes },
            { name: 'Separadores', dozens: boxes * 2 },
            { name: 'Bolsas kraft', dozens: Math.ceil(boxes / 3) },
          ]
        : [],
    stockAlert: '',
  };
};

export const buildVarietySales = (topVarieties: DashboardTopVariety[]): DashboardVarietySale[] => {
  const totalUnits = topVarieties.reduce((total, variety) => total + variety.quantity, 0);

  if (totalUnits <= 0) return [];

  return topVarieties.map((variety) => ({
    name: variety.name,
    units: variety.quantity,
    percent: Math.round((variety.quantity / totalUnits) * 100),
  }));
};

export const buildWeeklySales = (days: DashboardCalendarDay[]): DashboardWeeklySale[] =>
  days.slice(-7).map((day) => ({
    day: capitalize(weekdayFormatter.format(parseLocalDate(day.date)).replace('.', '')),
    value: day.revenue,
  }));

export const buildCustomerSummary = (
  topClients: DashboardTopClient[],
): DashboardCustomerSummary | null => {
  const topCustomer = topClients[0];

  if (!topCustomer) return null;

  return {
    newCustomers: 0,
    recurringCustomers: topClients.filter((client) => client.orderCount > 1).length,
    topCustomer: {
      name: topCustomer.name,
      revenue: topCustomer.totalRevenue,
      orders: topCustomer.orderCount,
    },
    latestCustomers: topClients.slice(0, 4).map((client) => client.name),
  };
};

export const buildCriticalAlerts = ({
  orders,
  pendingRevenue,
  productionSummary,
}: {
  orders: DashboardOrderCard[];
  pendingRevenue: number;
  productionSummary: DashboardProductionSummary;
}): DashboardAlert[] => {
  const alerts: DashboardAlert[] = [];
  const urgentOrder = orders.find(
    (order) => order.urgency === 'Urgente' || order.urgency === 'Hoy',
  );

  if (urgentOrder) {
    alerts.push({
      id: `urgent-${urgentOrder.id}`,
      level: urgentOrder.urgency === 'Urgente' ? 'critical' : 'warning',
      title: urgentOrder.urgency === 'Urgente' ? 'Pedido urgente hoy' : 'Pedido para hoy',
      detail: `${urgentOrder.customerName} · ${urgentOrder.deliveryLabel}.`,
      actionLabel: 'Ver pedido',
    });
  }

  if (productionSummary.stockAlert) {
    alerts.push({
      id: 'stock-alert',
      level: 'warning',
      title: 'Stock bajo',
      detail: productionSummary.stockAlert,
      actionLabel: 'Revisar stock',
    });
  }

  if (pendingRevenue > 0) {
    alerts.push({
      id: 'pending-revenue',
      level: pendingRevenue >= 30_000 ? 'warning' : 'info',
      title: 'Pendiente de cobro',
      detail: `${formatMoney(pendingRevenue)} todavía sin ingresar.`,
      actionLabel: 'Cobros',
    });
  }

  return alerts;
};

export const buildSecondaryAlerts = ({
  criticalAlerts,
  pendingRevenue,
}: {
  criticalAlerts: DashboardAlert[];
  pendingRevenue: number;
}): DashboardAlert[] => {
  const alerts: DashboardAlert[] = [...criticalAlerts];

  if (pendingRevenue === 0) {
    alerts.push({
      id: 'collections-ok',
      level: 'info',
      title: 'Cobros al día',
      detail: 'No hay pendientes de cobro en el período.',
      actionLabel: 'Ver detalle',
    });
  }

  alerts.push({
    id: 'wallet-base-low',
    level: 'warning',
    title: 'Billetera costo base',
    detail: 'Revisar reserva contra producción estimada.',
    actionLabel: 'Ver gestión',
  });

  return alerts.slice(0, 5);
};
