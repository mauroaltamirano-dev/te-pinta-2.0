export type DashboardTrendDirection = 'positive' | 'negative' | 'neutral';
export type DashboardAlertLevel = 'critical' | 'warning' | 'info';
export type DashboardWalletStatus = 'correct' | 'low' | 'critical';
export type DashboardPaymentStatus = 'Pagado' | 'Cobro parcial' | 'Pendiente';
export type DashboardProductionStatus = 'Por producir' | 'Producido' | 'Pendiente' | 'Confirmado';
export type DashboardUrgency = 'Urgente' | 'Hoy' | 'Mañana' | 'Próximo';

export type DashboardKpiComparison = {
  value: string;
  label: string;
  direction: DashboardTrendDirection;
};

export type DashboardMockOrder = {
  id: string;
  customerName: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryLabel: string;
  dozens: number;
  paymentStatus: DashboardPaymentStatus;
  productionStatus: DashboardProductionStatus;
  urgency: DashboardUrgency;
};

export type DashboardProductionItem = {
  name: string;
  dozens: number;
};

export type DashboardProductionSummary = {
  totalDozens: number;
  todayDozens: number;
  tomorrowDozens: number;
  varieties: DashboardProductionItem[];
  packaging: DashboardProductionItem[];
  stockAlert: string;
};

export type DashboardWallet = {
  id: string;
  title: string;
  amount: number;
  percent: number;
  objectiveLabel: string;
  differenceLabel: string;
  status: DashboardWalletStatus;
  progress: number;
  description: string;
};

export type DashboardVarietySale = {
  name: string;
  units: number;
  percent: number;
};

export type DashboardWeeklySale = {
  day: string;
  value: number;
};

export type DashboardCustomerSummary = {
  newCustomers: number;
  recurringCustomers: number;
  topCustomer: {
    name: string;
    revenue: number;
    orders: number;
  };
  latestCustomers: string[];
};

export type DashboardAlert = {
  id: string;
  level: DashboardAlertLevel;
  title: string;
  detail: string;
  actionLabel?: string;
};

export const dashboardTotalsMock = {
  grossRevenue: 185_000,
  paidRevenue: 153_000,
  estimatedProfit: 54_500,
  estimatedCosts: 130_500,
  orderCount: 13,
  activeOrderCount: 10,
  finalizedOrderCount: 3,
  soldDozens: 17,
  totalUnits: 204,
  averageTicket: 14_230,
  pendingRevenue: 32_000,
  unpaidOrderCount: 3,
};

export const dashboardKpiComparisons = {
  sales: { value: '+12,4%', label: 'vs semana anterior', direction: 'positive' },
  profit: { value: '+9,8%', label: 'vs semana anterior', direction: 'positive' },
  orders: { value: '+3', label: 'pedidos vs semana anterior', direction: 'positive' },
  dozens: { value: '+5,5', label: 'docenas vs semana anterior', direction: 'positive' },
  averageTicket: { value: '-2,1%', label: 'vs semana anterior', direction: 'neutral' },
  pendingRevenue: { value: '+18%', label: 'vs semana anterior', direction: 'negative' },
} satisfies Record<string, DashboardKpiComparison>;

export const dashboardMockOrders: DashboardMockOrder[] = [
  {
    id: 'mock-order-1043',
    customerName: 'María Gómez',
    deliveryDate: '2026-06-04',
    deliveryTime: '18:30',
    deliveryLabel: 'Hoy 18:30',
    dozens: 3,
    paymentStatus: 'Pendiente',
    productionStatus: 'Por producir',
    urgency: 'Urgente',
  },
  {
    id: 'mock-order-1044',
    customerName: 'Juan Pérez',
    deliveryDate: '2026-06-04',
    deliveryTime: '20:00',
    deliveryLabel: 'Hoy 20:00',
    dozens: 2,
    paymentStatus: 'Cobro parcial',
    productionStatus: 'Pendiente',
    urgency: 'Hoy',
  },
  {
    id: 'mock-order-1045',
    customerName: 'Sofía López',
    deliveryDate: '2026-06-05',
    deliveryTime: '11:00',
    deliveryLabel: 'Mañana 11:00',
    dozens: 1.5,
    paymentStatus: 'Pagado',
    productionStatus: 'Confirmado',
    urgency: 'Mañana',
  },
  {
    id: 'mock-order-1046',
    customerName: 'Local Centro',
    deliveryDate: '2026-06-05',
    deliveryTime: '13:00',
    deliveryLabel: 'Viernes 13:00',
    dozens: 2.5,
    paymentStatus: 'Pagado',
    productionStatus: 'Por producir',
    urgency: 'Próximo',
  },
];

export const dashboardProductionMock: DashboardProductionSummary = {
  totalDozens: 9,
  todayDozens: 6,
  tomorrowDozens: 3,
  varieties: [
    { name: 'Salteña', dozens: 3 },
    { name: 'Jamón y queso', dozens: 2 },
    { name: 'Caprese', dozens: 1.5 },
    { name: 'Humita', dozens: 1 },
    { name: 'Hongos', dozens: 1 },
    { name: 'Carne dulce', dozens: 0.5 },
  ],
  packaging: [
    { name: 'Cajas', dozens: 9 },
    { name: 'Separadores', dozens: 18 },
    { name: 'Bolsas kraft', dozens: 3 },
  ],
  stockAlert: 'Stock bajo: tapas criollas disponibles para 4 docenas.',
};

export const dashboardWalletsMock: DashboardWallet[] = [
  {
    id: 'base-cost',
    title: 'Costo base',
    amount: 112_000,
    percent: 60,
    objectiveLabel: 'Mínimo recomendado: $140.000',
    differenceLabel: 'Faltan $28.000 para cubrir producción estimada',
    status: 'low',
    progress: 80,
    description: 'Relleno, tapas, packaging y descartables asignados a producción.',
  },
  {
    id: 'services',
    title: 'Servicios',
    amount: 18_500,
    percent: 10,
    objectiveLabel: 'Objetivo: 10% de ventas',
    differenceLabel: 'Dentro del objetivo operativo',
    status: 'correct',
    progress: 100,
    description: 'Luz, gas, agua, combustible, comisiones y gastos operativos.',
  },
  {
    id: 'profit',
    title: 'Ganancia',
    amount: 54_500,
    percent: 30,
    objectiveLabel: 'Utilidad libre del emprendimiento',
    differenceLabel: 'Margen saludable para reinversión',
    status: 'correct',
    progress: 92,
    description: 'Utilidad disponible luego de reservar costos y servicios.',
  },
];

export const dashboardVarietySalesMock: DashboardVarietySale[] = [
  { name: 'Salteña', units: 34, percent: 18 },
  { name: 'Jamón y queso', units: 31, percent: 16 },
  { name: 'Caprese', units: 26, percent: 14 },
  { name: 'Humita', units: 24, percent: 13 },
  { name: 'Hongos', units: 21, percent: 11 },
  { name: 'Carne dulce', units: 27, percent: 14 },
  { name: 'Carne salada', units: 29, percent: 15 },
];

export const dashboardWeeklySalesMock: DashboardWeeklySale[] = [
  { day: 'Lun', value: 18_000 },
  { day: 'Mar', value: 22_000 },
  { day: 'Mié', value: 27_000 },
  { day: 'Jue', value: 31_000 },
  { day: 'Vie', value: 24_000 },
  { day: 'Sáb', value: 38_000 },
  { day: 'Dom', value: 25_000 },
];

export const dashboardCustomerSummaryMock: DashboardCustomerSummary = {
  newCustomers: 4,
  recurringCustomers: 9,
  topCustomer: {
    name: 'Distribuidora San Martín',
    revenue: 48_000,
    orders: 4,
  },
  latestCustomers: ['María Gómez', 'Juan Pérez', 'Sofía López', 'Ana Ríos'],
};

export const dashboardCriticalAlertsMock: DashboardAlert[] = [
  {
    id: 'urgent-order',
    level: 'critical',
    title: 'Pedido urgente hoy',
    detail: 'María Gómez entrega a las 18:30.',
    actionLabel: 'Ver pedido',
  },
  {
    id: 'low-stock',
    level: 'warning',
    title: 'Stock bajo',
    detail: 'Tapas criollas disponibles para 4 docenas.',
    actionLabel: 'Revisar stock',
  },
  {
    id: 'pending-revenue',
    level: 'warning',
    title: 'Pendiente de cobro elevado',
    detail: '$32.000 todavía sin ingresar.',
    actionLabel: 'Cobros',
  },
];

export const dashboardSecondaryAlertsMock: DashboardAlert[] = [
  {
    id: 'today-order',
    level: 'critical',
    title: 'Pedido urgente para hoy',
    detail: 'María Gómez — 18:30.',
    actionLabel: 'Abrir',
  },
  {
    id: 'stock-tapas',
    level: 'warning',
    title: 'Stock bajo',
    detail: 'Tapas criollas para 4 docenas.',
    actionLabel: 'Ver insumos',
  },
  {
    id: 'pending-payment',
    level: 'warning',
    title: 'Pendiente de cobro',
    detail: 'Juan Pérez — $12.000.',
    actionLabel: 'Registrar pago',
  },
  {
    id: 'low-margin',
    level: 'info',
    title: 'Margen bajo',
    detail: 'Pedido #1042 — 18%.',
    actionLabel: 'Revisar costo',
  },
  {
    id: 'base-wallet-low',
    level: 'warning',
    title: 'Billetera costo base',
    detail: 'Por debajo del objetivo recomendado.',
    actionLabel: 'Ver gestión',
  },
];
