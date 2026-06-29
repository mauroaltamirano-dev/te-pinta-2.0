import {
  getBusinessDateIso,
  type DashboardQuery,
  type DeliveryTime,
  type FinancePurchaseFundingSource,
  type OrderStatus,
} from '@te-pinta/shared';
import {
  buildWalletMovements,
  calculateWalletBalances,
  type FinanceWalletAdjustmentRecord,
  type WalletLedgerPurchaseInput,
  type WalletLedgerSaleInput,
} from '../finance/wallet-ledger-service';

export type DashboardOrderItem = {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  costPerDozen: number;
  priceDozen: number;
};

export type DashboardOrder = {
  id: string;
  customerId: string;
  customerName: string;
  customerCreatedAt: Date;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  createdAt: Date;
  subtotal: number;
  total: number;
  costTotalCents?: number | null;
  items: DashboardOrderItem[];
};

export type DashboardTopVariety = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type DashboardWeekRange = {
  startDate: string;
  endDate: string;
};

export type DashboardVarietyWeekComparison = {
  menuItemId: string;
  name: string;
  currentWeekQuantity: number;
  previousWeekQuantity: number;
  difference: number;
  changePercent: number | null;
};

export type DashboardWeeklyVarietyAnalytics = {
  currentWeek: DashboardWeekRange;
  comparisonWeek: DashboardWeekRange;
  varieties: DashboardVarietyWeekComparison[];
};

export type DashboardTopClient = {
  customerId: string;
  name: string;
  orderCount: number;
  totalRevenue: number;
};

export type DashboardUpcomingOrder = {
  id: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  total: number;
};

export type DashboardCalendarDay = {
  date: string;
  count: number;
  revenue: number;
  estimatedProfit: number;
};

export type DashboardStatusSummary = {
  confirmed: number;
  inProduction: number;
  ready: number;
  delivered: number;
  total: number;
};

export type DashboardRecentOrder = {
  id: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  total: number;
};

export type DashboardTotals = {
  orderCount: number;
  activeOrderCount: number;
  finalizedOrderCount: number;
  unpaidOrderCount: number;
  grossRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  estimatedCosts: number;
  estimatedProfit: number;
  totalUnits: number;
  soldDozens: number;
  averageTicket: number;
};

export type DashboardTrendDirection = 'positive' | 'negative' | 'neutral';

export type DashboardKpiComparison = {
  value: string;
  label: string;
  direction: DashboardTrendDirection;
  currentValue: number;
  previousValue: number | null;
  difference: number | null;
  changePercent: number | null;
};

export type DashboardKpiComparisons = {
  sales: DashboardKpiComparison;
  profit: DashboardKpiComparison;
  orders: DashboardKpiComparison;
  dozens: DashboardKpiComparison;
  averageTicket: DashboardKpiComparison;
  pendingRevenue: DashboardKpiComparison;
};

export type DashboardWalletStatus = 'correct' | 'low' | 'critical';

export type DashboardAccountingWallet = {
  id: 'base-cost' | 'services' | 'profit';
  title: string;
  amount: number;
  percent: number;
  objectiveLabel: string;
  differenceLabel: string;
  status: DashboardWalletStatus;
  progress: number;
  description: string;
};

export type DashboardPurchaseItem = {
  totalPriceCents: number;
};

export type DashboardPurchase = {
  id: string;
  purchaseDate: string;
  fundingSource: FinancePurchaseFundingSource;
  canceledAt: Date | string | null;
  items: DashboardPurchaseItem[];
};

export type DashboardSetting = {
  key: string;
  value: string;
};

export type DashboardPurchaseTotals = {
  productionCost: number;
  services: number;
  profit: number;
};

export type DashboardAccountingTotals = {
  paidRevenue: number;
  directCost: number;
  grossProfit: number;
  serviceReserve: number;
  profitReserve: number;
  purchases: DashboardPurchaseTotals;
};

export type DashboardAccountingSummary = {
  servicePercent: number;
  totals: DashboardAccountingTotals;
  wallets: DashboardAccountingWallet[];
};

export type DashboardRange = 'all' | 'last31' | 'last7';

export type DashboardRangeAnalytics = {
  totals: DashboardTotals;
  customerStats: DashboardCustomerStats;
  topClients: DashboardTopClient[];
  topVarieties: DashboardTopVariety[];
  statusSummary: DashboardStatusSummary;
  recentOrders: DashboardRecentOrder[];
  chartDays: DashboardCalendarDay[];
};

export type DashboardCustomerStats = {
  newCustomers: number;
  recurringCustomers: number;
};

export type DashboardSelectedRange = {
  mode: 'preset' | 'custom' | 'weekComparison';
  label: string;
  startDate: string | null;
  endDate: string | null;
  preset?: DashboardRange;
};

export type DailyDashboard = {
  date: string;
  orderCount: number;
  totalRevenue: number;
  deliveryShifts: Record<DeliveryTime, number>;
  topVarieties: DashboardTopVariety[];
  topClients: DashboardTopClient[];
  upcomingOrders: DashboardUpcomingOrder[];
  nextSevenDays: DashboardCalendarDay[];
  lastSevenDays: DashboardCalendarDay[];
  statusSummary: DashboardStatusSummary;
  recentOrders: DashboardRecentOrder[];
  totals: DashboardTotals;
  rangeTotals: Record<DashboardRange, DashboardTotals>;
  rangeAnalytics: Record<DashboardRange, DashboardRangeAnalytics>;
  selectedRange: DashboardSelectedRange;
  selectedRangeAnalytics: DashboardRangeAnalytics;
  kpiComparisons: DashboardKpiComparisons;
  weeklyVarietyAnalytics: DashboardWeeklyVarietyAnalytics;
  accountingSummary: DashboardAccountingSummary;
  varietySales: {
    all: DashboardTopVariety[];
    last31: DashboardTopVariety[];
    last7: DashboardTopVariety[];
    selectedDate: DashboardTopVariety[];
  };
};

export type DashboardRepository = {
  listOrders(): Promise<DashboardOrder[]>;
  listPurchases(): Promise<DashboardPurchase[]>;
  listWalletAdjustments(): Promise<FinanceWalletAdjustmentRecord[]>;
  getSetting(key: string): Promise<DashboardSetting | null>;
};

const SERVICE_PERCENT_SETTING_KEY = 'finance_dashboard_service_percent';
const DEFAULT_SERVICE_PERCENT = 20;

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const moneyToCents = (value: number): number => Math.round(value * 100);

const centsToMoney = (value: number): number => roundMoney(value / 100);

const formatMoney = (value: number): string =>
  `$${Math.round(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const formatSignedMoney = (value: number): string => {
  if (value === 0) return formatMoney(0);

  return `${value > 0 ? '+' : '-'}${formatMoney(Math.abs(value))}`;
};

const formatSignedNumber = (value: number): string => {
  if (value === 0) return '0';

  return `${value > 0 ? '+' : '-'}${Math.abs(value).toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })}`;
};

const formatSignedPercent = (value: number): string => {
  if (value === 0) return '0%';

  return `${value > 0 ? '+' : '-'}${Math.abs(value).toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })}%`;
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
};

const formatIsoDateLabel = (date: string): string => {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMondayWeek = (date: Date): Date => {
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  return addDays(date, -daysSinceMonday);
};

const normalizeRange = (startDate: string, endDate: string): DashboardWeekRange =>
  startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };

const weekRangeFromStart = (startDate: string): DashboardWeekRange => {
  const start = startOfMondayWeek(parseIsoDate(startDate));
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(start, 6)),
  };
};

const isFinalized = (order: DashboardOrder): boolean =>
  order.status === 'entregado' && order.isPaid;

const getOrderDirectCostCents = (order: DashboardOrder): number => {
  if (order.costTotalCents !== undefined && order.costTotalCents !== null) {
    return order.costTotalCents;
  }

  return moneyToCents(
    order.items.reduce(
      (itemTotal, item) => itemTotal + (item.quantity / 12) * item.costPerDozen,
      0,
    ),
  );
};

const sumEstimatedCost = (orders: DashboardOrder[]): number =>
  roundMoney(
    orders.reduce((orderTotal, order) => orderTotal + getOrderDirectCostCents(order) / 100, 0),
  );

const parseServicePercent = (setting: DashboardSetting | null): number => {
  const value = Number(setting?.value);

  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_SERVICE_PERCENT;
};

const calculateWalletStatus = (amount: number, objective: number): DashboardWalletStatus => {
  if (amount < 0) return 'critical';
  if (objective > 0 && amount < objective * 0.2) return 'low';

  return 'correct';
};

const calculateWalletProgress = (amount: number, objective: number): number => {
  if (objective <= 0) return amount > 0 ? 100 : 0;

  return Math.round((amount / objective) * 100);
};

const calculateWalletPercent = (amountCents: number, totalAssignedCents: number): number =>
  totalAssignedCents > 0 ? Math.round((amountCents / totalAssignedCents) * 100) : 0;

const reserveDifferenceLabel = (
  amount: number,
  positiveLabel: string,
  negativeLabel: string,
): string =>
  amount < 0
    ? `${negativeLabel}: ${formatMoney(Math.abs(amount))}`
    : `${positiveLabel}: ${formatMoney(amount)}`;

const purchaseTotalsToMoney = (
  purchaseTotalsCents: Record<FinancePurchaseFundingSource, number>,
): DashboardPurchaseTotals => ({
  productionCost: centsToMoney(purchaseTotalsCents.production_cost),
  services: centsToMoney(purchaseTotalsCents.services),
  profit: centsToMoney(purchaseTotalsCents.profit),
});

const toWalletLedgerSale = (order: DashboardOrder): WalletLedgerSaleInput => ({
  id: order.id,
  isPaid: order.isPaid,
  occurredAt: order.deliveryDate,
  totalCents: moneyToCents(order.total),
  directCostCents: getOrderDirectCostCents(order),
});

const toWalletLedgerPurchase = (purchase: DashboardPurchase): WalletLedgerPurchaseInput => ({
  id: purchase.id,
  occurredAt: purchase.purchaseDate,
  fundingSource: purchase.fundingSource,
  totalPriceCents: purchase.items.reduce((total, item) => total + item.totalPriceCents, 0),
  canceledAt: purchase.canceledAt,
});

const buildAccountingSummary = (
  orders: DashboardOrder[],
  purchases: DashboardPurchase[],
  adjustments: FinanceWalletAdjustmentRecord[],
  servicePercent: number,
): DashboardAccountingSummary => {
  const paidOrders = orders.filter((order) => order.isPaid);
  const accountingCents = paidOrders.reduce(
    (totals, order) => {
      const paidRevenueCents = moneyToCents(order.total);
      const directCostCents = getOrderDirectCostCents(order);
      const grossProfitCents = paidRevenueCents - directCostCents;
      const serviceReserveCents = Math.round(
        Math.max(grossProfitCents, 0) * (servicePercent / 100),
      );

      totals.paidRevenue += paidRevenueCents;
      totals.directCost += directCostCents;
      totals.grossProfit += grossProfitCents;
      totals.serviceReserve += serviceReserveCents;
      totals.profitReserve += grossProfitCents - serviceReserveCents;

      return totals;
    },
    {
      paidRevenue: 0,
      directCost: 0,
      grossProfit: 0,
      serviceReserve: 0,
      profitReserve: 0,
    },
  );
  const purchaseTotalsCents: Record<FinancePurchaseFundingSource, number> = {
    production_cost: 0,
    services: 0,
    profit: 0,
  };

  for (const purchase of purchases) {
    if (purchase.canceledAt) continue;

    purchaseTotalsCents[purchase.fundingSource] += purchase.items.reduce(
      (total, item) => total + item.totalPriceCents,
      0,
    );
  }

  const walletBalancesCents = calculateWalletBalances(
    buildWalletMovements({
      sales: orders.map(toWalletLedgerSale),
      purchases: purchases.map(toWalletLedgerPurchase),
      adjustments,
      servicePercent,
    }),
  );
  const totalAssignedCents =
    accountingCents.directCost + accountingCents.serviceReserve + accountingCents.profitReserve;
  const wallet = ({
    id,
    title,
    amountCents,
    objectiveCents,
    objectiveLabel,
    positiveDifferenceLabel,
    negativeDifferenceLabel,
    description,
  }: {
    id: DashboardAccountingWallet['id'];
    title: string;
    amountCents: number;
    objectiveCents: number;
    objectiveLabel: string;
    positiveDifferenceLabel: string;
    negativeDifferenceLabel: string;
    description: string;
  }): DashboardAccountingWallet => {
    const amount = centsToMoney(amountCents);
    const objective = centsToMoney(objectiveCents);

    return {
      id,
      title,
      amount,
      percent: calculateWalletPercent(amountCents, totalAssignedCents),
      objectiveLabel,
      differenceLabel: reserveDifferenceLabel(
        amount,
        positiveDifferenceLabel,
        negativeDifferenceLabel,
      ),
      status: calculateWalletStatus(amount, objective),
      progress: calculateWalletProgress(amount, objective),
      description,
    };
  };

  return {
    servicePercent,
    totals: {
      paidRevenue: centsToMoney(accountingCents.paidRevenue),
      directCost: centsToMoney(accountingCents.directCost),
      grossProfit: centsToMoney(accountingCents.grossProfit),
      serviceReserve: centsToMoney(accountingCents.serviceReserve),
      profitReserve: centsToMoney(accountingCents.profitReserve),
      purchases: purchaseTotalsToMoney(purchaseTotalsCents),
    },
    wallets: [
      wallet({
        id: 'base-cost',
        title: 'Costo base',
        amountCents: walletBalancesCents.production_cost,
        objectiveCents: accountingCents.directCost,
        objectiveLabel: `Reserva estimada: ${formatMoney(
          centsToMoney(accountingCents.directCost),
        )}`,
        positiveDifferenceLabel: 'Disponible para producción',
        negativeDifferenceLabel: 'Sobregiro de producción',
        description: 'Ventas reservadas para relleno, tapas, packaging y compras de producción.',
      }),
      wallet({
        id: 'services',
        title: 'Servicios',
        amountCents: walletBalancesCents.services,
        objectiveCents: accountingCents.serviceReserve,
        objectiveLabel: `Objetivo: ${servicePercent}% de ganancia bruta (${formatMoney(
          centsToMoney(accountingCents.serviceReserve),
        )})`,
        positiveDifferenceLabel: 'Disponible para servicios',
        negativeDifferenceLabel: 'Sobregiro de servicios',
        description: 'Reserva para luz, gas, agua, combustible, comisiones y gastos operativos.',
      }),
      wallet({
        id: 'profit',
        title: 'Ganancia',
        amountCents: walletBalancesCents.profit,
        objectiveCents: accountingCents.profitReserve,
        objectiveLabel: `Ganancia libre objetivo: ${formatMoney(
          centsToMoney(accountingCents.profitReserve),
        )}`,
        positiveDifferenceLabel: 'Ganancia libre disponible',
        negativeDifferenceLabel: 'Sobregiro de ganancia',
        description: 'Utilidad disponible luego de reservar costos, servicios y compras asignadas.',
      }),
    ],
  };
};

const buildTopVarieties = (orders: DashboardOrder[]): DashboardTopVariety[] => {
  const varieties = new Map<string, DashboardTopVariety>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = varieties.get(item.menuItemId) ?? {
        menuItemId: item.menuItemId,
        name: item.menuItemName,
        quantity: 0,
      };
      current.quantity += item.quantity;
      varieties.set(item.menuItemId, current);
    }
  }

  return [...varieties.values()].sort((a, b) => b.quantity - a.quantity);
};

const buildVarietyQuantityMap = (orders: DashboardOrder[]): Map<string, DashboardTopVariety> => {
  const varieties = new Map<string, DashboardTopVariety>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = varieties.get(item.menuItemId) ?? {
        menuItemId: item.menuItemId,
        name: item.menuItemName,
        quantity: 0,
      };
      current.quantity += item.quantity;
      varieties.set(item.menuItemId, current);
    }
  }

  return varieties;
};

const buildWeeklyVarietyAnalytics = (
  orders: DashboardOrder[],
  currentWeekStartDate: string,
  comparisonWeekStartDate?: string,
): DashboardWeeklyVarietyAnalytics => {
  const currentWeekRange = weekRangeFromStart(currentWeekStartDate);
  const currentWeekStart = parseIsoDate(currentWeekRange.startDate);
  const comparisonWeekRange = comparisonWeekStartDate
    ? weekRangeFromStart(comparisonWeekStartDate)
    : {
        startDate: toIsoDate(addDays(currentWeekStart, -7)),
        endDate: toIsoDate(addDays(currentWeekStart, -1)),
      };
  const filterByRange = ({ startDate, endDate }: DashboardWeekRange): DashboardOrder[] =>
    orders.filter((order) => order.deliveryDate >= startDate && order.deliveryDate <= endDate);
  const currentWeekVarieties = buildVarietyQuantityMap(filterByRange(currentWeekRange));
  const comparisonWeekVarieties = buildVarietyQuantityMap(filterByRange(comparisonWeekRange));
  const menuItemIds = new Set([...currentWeekVarieties.keys(), ...comparisonWeekVarieties.keys()]);

  return {
    currentWeek: currentWeekRange,
    comparisonWeek: comparisonWeekRange,
    varieties: [...menuItemIds]
      .map((menuItemId) => {
        const current = currentWeekVarieties.get(menuItemId);
        const previous = comparisonWeekVarieties.get(menuItemId);
        const currentWeekQuantity = current?.quantity ?? 0;
        const previousWeekQuantity = previous?.quantity ?? 0;
        const difference = currentWeekQuantity - previousWeekQuantity;

        return {
          menuItemId,
          name: current?.name ?? previous?.name ?? 'Sin nombre',
          currentWeekQuantity,
          previousWeekQuantity,
          difference,
          changePercent:
            previousWeekQuantity > 0 ? roundMoney((difference / previousWeekQuantity) * 100) : null,
        };
      })
      .sort(
        (a, b) =>
          b.currentWeekQuantity - a.currentWeekQuantity ||
          b.previousWeekQuantity - a.previousWeekQuantity ||
          a.name.localeCompare(b.name, 'es-AR'),
      ),
  };
};

const buildTopClients = (orders: DashboardOrder[]): DashboardTopClient[] => {
  const clients = new Map<string, DashboardTopClient>();

  for (const order of orders) {
    const current = clients.get(order.customerId) ?? {
      customerId: order.customerId,
      name: order.customerName,
      orderCount: 0,
      totalRevenue: 0,
    };
    current.orderCount += 1;
    current.totalRevenue = roundMoney(current.totalRevenue + order.total);
    clients.set(order.customerId, current);
  }

  return [...clients.values()]
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.orderCount - a.orderCount)
    .slice(0, 6);
};

const buildCustomerStats = (
  orders: DashboardOrder[],
  range: DashboardWeekRange | null,
): DashboardCustomerStats => {
  if (!range) return { newCustomers: 0, recurringCustomers: 0 };

  const customers = new Map<string, Date>();

  for (const order of orders) {
    customers.set(order.customerId, order.customerCreatedAt);
  }

  let newCustomers = 0;
  let recurringCustomers = 0;

  for (const createdAt of customers.values()) {
    const createdDate = getBusinessDateIso(createdAt);

    if (createdDate >= range.startDate && createdDate <= range.endDate) {
      newCustomers += 1;
    } else if (createdDate < range.startDate) {
      recurringCustomers += 1;
    }
  }

  return { newCustomers, recurringCustomers };
};

const buildTotals = (orders: DashboardOrder[]): DashboardTotals => {
  const grossRevenue = roundMoney(orders.reduce((total, order) => total + order.total, 0));
  const paidRevenue = roundMoney(
    orders.filter((order) => order.isPaid).reduce((total, order) => total + order.total, 0),
  );
  const estimatedCosts = sumEstimatedCost(orders);
  const orderCount = orders.length;
  const totalUnits = orders.reduce(
    (total, order) => total + order.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
    0,
  );

  return {
    orderCount,
    activeOrderCount: orders.filter((order) => !isFinalized(order)).length,
    finalizedOrderCount: orders.filter(isFinalized).length,
    unpaidOrderCount: orders.filter((order) => !order.isPaid).length,
    grossRevenue,
    paidRevenue,
    pendingRevenue: roundMoney(grossRevenue - paidRevenue),
    estimatedCosts,
    estimatedProfit: roundMoney(grossRevenue - estimatedCosts),
    totalUnits,
    soldDozens: roundMoney(totalUnits / 12),
    averageTicket: orderCount > 0 ? roundMoney(grossRevenue / orderCount) : 0,
  };
};

const getPreviousEquivalentRange = ({
  startDate,
  endDate,
}: DashboardWeekRange): DashboardWeekRange => {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const dayCount = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    startDate: toIsoDate(previousStart),
    endDate: toIsoDate(previousEnd),
  };
};

const filterOrdersByRange = (
  orders: DashboardOrder[],
  { startDate, endDate }: DashboardWeekRange,
): DashboardOrder[] =>
  orders.filter((order) => order.deliveryDate >= startDate && order.deliveryDate <= endDate);

const resolveDirection = (
  difference: number,
  preference: 'higher' | 'lower' = 'higher',
): DashboardTrendDirection => {
  if (difference === 0) return 'neutral';

  const isPositive = preference === 'higher' ? difference > 0 : difference < 0;

  return isPositive ? 'positive' : 'negative';
};

const buildKpiComparison = ({
  currentValue,
  previousValue,
  label,
  valueFormat,
  preference = 'higher',
}: {
  currentValue: number;
  previousValue: number;
  label: string;
  valueFormat: 'money' | 'number' | 'percent' | 'quantity';
  preference?: 'higher' | 'lower';
}): DashboardKpiComparison => {
  const difference = roundMoney(currentValue - previousValue);
  const changePercent =
    previousValue !== 0 ? roundMoney((difference / Math.abs(previousValue)) * 100) : null;
  const value =
    valueFormat === 'percent' && changePercent !== null
      ? formatSignedPercent(changePercent)
      : valueFormat === 'number' || valueFormat === 'quantity'
        ? formatSignedNumber(difference)
        : formatSignedMoney(difference);

  return {
    value,
    label,
    direction: resolveDirection(difference, preference),
    currentValue,
    previousValue,
    difference,
    changePercent,
  };
};

const buildNeutralKpiComparison = (
  key: keyof Pick<
    DashboardTotals,
    | 'grossRevenue'
    | 'estimatedProfit'
    | 'orderCount'
    | 'soldDozens'
    | 'averageTicket'
    | 'pendingRevenue'
  >,
  totals: DashboardTotals,
): DashboardKpiComparison => ({
  value: '—',
  label: 'Sin comparación equivalente para Siempre',
  direction: 'neutral',
  currentValue: totals[key],
  previousValue: null,
  difference: null,
  changePercent: null,
});

const buildKpiComparisons = ({
  allOrders,
  currentTotals,
  currentRange,
}: {
  allOrders: DashboardOrder[];
  currentTotals: DashboardTotals;
  currentRange: DashboardWeekRange | null;
}): DashboardKpiComparisons => {
  if (!currentRange) {
    return {
      sales: buildNeutralKpiComparison('grossRevenue', currentTotals),
      profit: buildNeutralKpiComparison('estimatedProfit', currentTotals),
      orders: buildNeutralKpiComparison('orderCount', currentTotals),
      dozens: buildNeutralKpiComparison('soldDozens', currentTotals),
      averageTicket: buildNeutralKpiComparison('averageTicket', currentTotals),
      pendingRevenue: buildNeutralKpiComparison('pendingRevenue', currentTotals),
    };
  }

  const previousRange = getPreviousEquivalentRange(currentRange);
  const previousTotals = buildTotals(filterOrdersByRange(allOrders, previousRange));
  const label = `vs período anterior (${formatIsoDateLabel(
    previousRange.startDate,
  )} – ${formatIsoDateLabel(previousRange.endDate)})`;

  return {
    sales: buildKpiComparison({
      currentValue: currentTotals.grossRevenue,
      previousValue: previousTotals.grossRevenue,
      label,
      valueFormat: 'percent',
    }),
    profit: buildKpiComparison({
      currentValue: currentTotals.estimatedProfit,
      previousValue: previousTotals.estimatedProfit,
      label,
      valueFormat: 'percent',
    }),
    orders: buildKpiComparison({
      currentValue: currentTotals.orderCount,
      previousValue: previousTotals.orderCount,
      label,
      valueFormat: 'number',
    }),
    dozens: buildKpiComparison({
      currentValue: currentTotals.soldDozens,
      previousValue: previousTotals.soldDozens,
      label,
      valueFormat: 'quantity',
    }),
    averageTicket: buildKpiComparison({
      currentValue: currentTotals.averageTicket,
      previousValue: previousTotals.averageTicket,
      label,
      valueFormat: 'money',
    }),
    pendingRevenue: buildKpiComparison({
      currentValue: currentTotals.pendingRevenue,
      previousValue: previousTotals.pendingRevenue,
      label,
      valueFormat: 'money',
      preference: 'lower',
    }),
  };
};

const buildStatusSummary = (orders: DashboardOrder[]): DashboardStatusSummary => ({
  confirmed: orders.filter((order) => order.status === 'confirmado').length,
  inProduction: 0,
  ready: orders.filter((order) => order.status === 'preparado').length,
  delivered: orders.filter((order) => order.status === 'entregado').length,
  total: orders.length,
});

const buildRecentOrders = (orders: DashboardOrder[]): DashboardRecentOrder[] =>
  [...orders]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map((order) => ({
      id: order.id,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      status: order.status,
      isPaid: order.isPaid,
      total: order.total,
    }));

export const getDailyDashboard = async (
  query: DashboardQuery,
  repository: DashboardRepository,
  now: () => Date = () => new Date(),
): Promise<DailyDashboard> => {
  const currentDate = now();
  const currentBusinessDate = getBusinessDateIso(currentDate);
  const date = query.date ?? currentBusinessDate;
  const anchorDate = parseIsoDate(date);
  const [allOrders, purchases, adjustments, servicePercentSetting] = await Promise.all([
    repository.listOrders(),
    repository.listPurchases(),
    repository.listWalletAdjustments(),
    repository.getSetting(SERVICE_PERCENT_SETTING_KEY),
  ]);
  const servicePercent = parseServicePercent(servicePercentSetting);
  const accountingSummary = buildAccountingSummary(
    allOrders,
    purchases,
    adjustments,
    servicePercent,
  );
  const selectedDateOrders = allOrders.filter((order) => order.deliveryDate === date);
  const last31Start = toIsoDate(addDays(anchorDate, -30));
  const last7Start = toIsoDate(addDays(anchorDate, -6));
  const last31Orders = allOrders.filter(
    (order) => order.deliveryDate >= last31Start && order.deliveryDate <= date,
  );
  const last7Orders = allOrders.filter(
    (order) => order.deliveryDate >= last7Start && order.deliveryDate <= date,
  );
  const rangeTotals = {
    all: buildTotals(allOrders),
    last31: buildTotals(last31Orders),
    last7: buildTotals(last7Orders),
  };
  const deliveryShifts: Record<DeliveryTime, number> = {
    mediodia: 0,
    tarde: 0,
    noche: 0,
  };

  let selectedDateRevenue = 0;
  for (const order of selectedDateOrders) {
    selectedDateRevenue += order.total;
    deliveryShifts[order.deliveryTime] += 1;
  }

  const buildCalendarDay = (dayDate: string): DashboardCalendarDay => {
    const dayOrders = allOrders.filter((order) => order.deliveryDate === dayDate);
    const revenue = roundMoney(dayOrders.reduce((total, order) => total + order.total, 0));
    const estimatedProfit = roundMoney(revenue - sumEstimatedCost(dayOrders));

    return {
      date: dayDate,
      count: dayOrders.length,
      revenue,
      estimatedProfit,
    };
  };
  const buildCalendarRange = (length: number): DashboardCalendarDay[] =>
    Array.from({ length }, (_, index) =>
      buildCalendarDay(toIsoDate(addDays(anchorDate, index - length + 1))),
    );
  const buildCalendarBetween = (startDate: string, endDate: string): DashboardCalendarDay[] => {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    const dayCount = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );

    return Array.from({ length: dayCount }, (_, index) =>
      buildCalendarDay(toIsoDate(addDays(start, index))),
    );
  };
  const buildHistoricalCalendar = (orders: DashboardOrder[]): DashboardCalendarDay[] =>
    [...new Set(orders.map((order) => order.deliveryDate))]
      .sort((a, b) => a.localeCompare(b))
      .map(buildCalendarDay);
  const buildRangeAnalytics = (
    orders: DashboardOrder[],
    chartDays: DashboardCalendarDay[],
  ): DashboardRangeAnalytics => {
    const firstDay = chartDays[0]?.date;
    const lastDay = chartDays.at(-1)?.date;

    return {
      totals: buildTotals(orders),
      customerStats:
        firstDay && lastDay
          ? buildCustomerStats(orders, { startDate: firstDay, endDate: lastDay })
          : buildCustomerStats(orders, null),
      topClients: buildTopClients(orders),
      topVarieties: buildTopVarieties(orders),
      statusSummary: buildStatusSummary(orders),
      recentOrders: buildRecentOrders(orders),
      chartDays,
    };
  };
  const todayIso = currentBusinessDate;
  const nextSevenDays = Array.from({ length: 7 }, (_, index) =>
    buildCalendarDay(toIsoDate(addDays(anchorDate, index))),
  );
  const lastSevenDays = buildCalendarRange(7);
  const rangeOrders: Record<DashboardRange, DashboardOrder[]> = {
    all: allOrders,
    last31: last31Orders,
    last7: last7Orders,
  };
  const rangeAnalytics: Record<DashboardRange, DashboardRangeAnalytics> = {
    all: buildRangeAnalytics(rangeOrders.all, buildHistoricalCalendar(rangeOrders.all)),
    last31: buildRangeAnalytics(rangeOrders.last31, buildCalendarRange(31)),
    last7: buildRangeAnalytics(rangeOrders.last7, lastSevenDays),
  };
  const firstOrderDate = rangeOrders.all.reduce<string | null>(
    (firstDate, order) =>
      firstDate === null || order.deliveryDate < firstDate ? order.deliveryDate : firstDate,
    null,
  );
  const presetLabels: Record<DashboardRange, string> = {
    all: firstOrderDate ? `Siempre · desde ${formatIsoDateLabel(firstOrderDate)}` : 'Siempre',
    last31: 'Últimos 31 días',
    last7: 'Últimos 7 días',
  };
  const presetDateRanges: Record<DashboardRange, DashboardWeekRange | null> = {
    all: firstOrderDate ? { startDate: firstOrderDate, endDate: date } : null,
    last31: { startDate: last31Start, endDate: date },
    last7: { startDate: last7Start, endDate: date },
  };
  const requestedPreset = query.preset ?? 'all';
  const requestedMode = query.analyticsMode ?? 'preset';
  const weeklyVarietyAnalytics = buildWeeklyVarietyAnalytics(
    allOrders,
    query.currentWeekStart ?? date,
    query.comparisonWeekStart,
  );
  const currentWeekRange = weeklyVarietyAnalytics.currentWeek;
  const selectedRange =
    requestedMode === 'custom' && query.startDate && query.endDate
      ? normalizeRange(query.startDate, query.endDate)
      : requestedMode === 'weekComparison'
        ? currentWeekRange
        : null;
  const selectedRangeOrders = selectedRange
    ? allOrders.filter(
        (order) =>
          order.deliveryDate >= selectedRange.startDate &&
          order.deliveryDate <= selectedRange.endDate,
      )
    : rangeOrders[requestedPreset];
  const selectedRangeAnalytics = selectedRange
    ? buildRangeAnalytics(
        selectedRangeOrders,
        buildCalendarBetween(selectedRange.startDate, selectedRange.endDate),
      )
    : rangeAnalytics[requestedPreset];
  const selectedRangeMetadata: DashboardSelectedRange =
    requestedMode === 'custom' && selectedRange && query.startDate && query.endDate
      ? {
          mode: 'custom',
          label: `${formatIsoDateLabel(selectedRange.startDate)} – ${formatIsoDateLabel(
            selectedRange.endDate,
          )}`,
          startDate: selectedRange.startDate,
          endDate: selectedRange.endDate,
        }
      : requestedMode === 'weekComparison' && selectedRange
        ? {
            mode: 'weekComparison',
            label: `Semana ${formatIsoDateLabel(selectedRange.startDate)} – ${formatIsoDateLabel(
              selectedRange.endDate,
            )}`,
            startDate: selectedRange.startDate,
            endDate: selectedRange.endDate,
          }
        : {
            mode: 'preset',
            preset: requestedPreset,
            label: presetLabels[requestedPreset],
            startDate: presetDateRanges[requestedPreset]?.startDate ?? null,
            endDate: presetDateRanges[requestedPreset]?.endDate ?? null,
          };
  const kpiComparisonRange =
    selectedRangeMetadata.mode === 'preset' && selectedRangeMetadata.preset === 'all'
      ? null
      : selectedRangeMetadata.startDate && selectedRangeMetadata.endDate
        ? {
            startDate: selectedRangeMetadata.startDate,
            endDate: selectedRangeMetadata.endDate,
          }
        : null;
  const kpiComparisons = buildKpiComparisons({
    allOrders,
    currentTotals: selectedRangeAnalytics.totals,
    currentRange: kpiComparisonRange,
  });

  const upcomingOrders = allOrders
    .filter((order) => order.deliveryDate >= todayIso && !isFinalized(order))
    .sort(
      (a, b) =>
        a.deliveryDate.localeCompare(b.deliveryDate) ||
        a.deliveryTime.localeCompare(b.deliveryTime) ||
        a.customerName.localeCompare(b.customerName, 'es-AR'),
    )
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      customerName: order.customerName,
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime,
      status: order.status,
      isPaid: order.isPaid,
      total: order.total,
    }));

  return {
    date,
    orderCount: selectedDateOrders.length,
    totalRevenue: roundMoney(selectedDateRevenue),
    deliveryShifts,
    topVarieties: buildTopVarieties(selectedDateOrders),
    topClients: buildTopClients(allOrders),
    upcomingOrders,
    nextSevenDays,
    lastSevenDays,
    statusSummary: rangeAnalytics.all.statusSummary,
    recentOrders: rangeAnalytics.all.recentOrders,
    totals: rangeTotals.all,
    rangeTotals,
    rangeAnalytics,
    selectedRange: selectedRangeMetadata,
    selectedRangeAnalytics,
    kpiComparisons,
    weeklyVarietyAnalytics,
    accountingSummary,
    varietySales: {
      all: buildTopVarieties(allOrders),
      last31: buildTopVarieties(last31Orders),
      last7: buildTopVarieties(last7Orders),
      selectedDate: buildTopVarieties(selectedDateOrders),
    },
  };
};
