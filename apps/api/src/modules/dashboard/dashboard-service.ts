import {
  getBusinessDateIso,
  type DashboardQuery,
  type DeliveryTime,
  type OrderStatus,
} from '@te-pinta/shared';

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
  deliveryDate: string;
  deliveryTime: DeliveryTime;
  status: OrderStatus;
  isPaid: boolean;
  createdAt: Date;
  subtotal: number;
  total: number;
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

export type DashboardRange = 'all' | 'last31' | 'last7';

export type DashboardRangeAnalytics = {
  totals: DashboardTotals;
  topClients: DashboardTopClient[];
  topVarieties: DashboardTopVariety[];
  statusSummary: DashboardStatusSummary;
  recentOrders: DashboardRecentOrder[];
  chartDays: DashboardCalendarDay[];
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
  weeklyVarietyAnalytics: DashboardWeeklyVarietyAnalytics;
  varietySales: {
    all: DashboardTopVariety[];
    last31: DashboardTopVariety[];
    last7: DashboardTopVariety[];
    selectedDate: DashboardTopVariety[];
  };
};

export type DashboardRepository = {
  listOrders(): Promise<DashboardOrder[]>;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

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
  startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };

const weekRangeFromStart = (startDate: string): DashboardWeekRange => {
  const start = startOfMondayWeek(parseIsoDate(startDate));
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(addDays(start, 6)),
  };
};

const isFinalized = (order: DashboardOrder): boolean =>
  order.status === 'entregado' && order.isPaid;

const sumEstimatedCost = (orders: DashboardOrder[]): number =>
  roundMoney(
    orders.reduce(
      (orderTotal, order) =>
        orderTotal +
        order.items.reduce(
          (itemTotal, item) => itemTotal + (item.quantity / 12) * item.costPerDozen,
          0,
        ),
      0,
    ),
  );

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
  const allOrders = await repository.listOrders();
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
  ): DashboardRangeAnalytics => ({
    totals: buildTotals(orders),
    topClients: buildTopClients(orders),
    topVarieties: buildTopVarieties(orders),
    statusSummary: buildStatusSummary(orders),
    recentOrders: buildRecentOrders(orders),
    chartDays,
  });
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
  const presetLabels: Record<DashboardRange, string> = {
    all: 'Siempre',
    last31: 'Últimos 31 días',
    last7: 'Últimos 7 días',
  };
  const presetDateRanges: Record<DashboardRange, DashboardWeekRange | null> = {
    all: null,
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
          order.deliveryDate >= selectedRange.startDate && order.deliveryDate <= selectedRange.endDate,
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
    weeklyVarietyAnalytics,
    varietySales: {
      all: buildTopVarieties(allOrders),
      last31: buildTopVarieties(last31Orders),
      last7: buildTopVarieties(last7Orders),
      selectedDate: buildTopVarieties(selectedDateOrders),
    },
  };
};
