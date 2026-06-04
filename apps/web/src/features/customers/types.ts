import type { Customer } from './customers-api';

export type CustomerStatus =
  | 'nuevo'
  | 'activo'
  | 'recurrente'
  | 'inactivo'
  | 'mayorista'
  | 'frecuente'
  | 'con-deuda'
  | 'para-reactivar';

export type CustomerFilterId =
  | 'todos'
  | 'activos'
  | 'recurrentes'
  | 'nuevos'
  | 'inactivos'
  | 'mayoristas'
  | 'con-deuda'
  | 'para-reactivar';

export type CustomerPaymentStatus = 'pagado' | 'pendiente' | 'parcial' | 'debe';

export type CustomerOrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'por-producir'
  | 'producido'
  | 'entregado'
  | 'cancelado';

export type CustomerNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type CustomerOrderLine = {
  variety: string;
  units: number;
  dozens?: number;
};

export type CustomerPurchaseRecord = {
  id: string;
  date: string;
  summary: string;
  total: number;
  dozens: number;
  status: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
  lines?: CustomerOrderLine[];
};

export type CustomerVarietyRank = {
  variety: string;
  units: number;
  percent: number;
};

export type CustomerEnrichment = {
  neighborhood?: string;
  createdAt?: string;
  tags?: string[];
  notes?: CustomerNote[];
  importantNote?: string;
  nextOrderLabel?: string;
  isWholesale?: boolean;
  isLost?: boolean;
  isBlocked?: boolean;
  varietyBreakdown?: CustomerVarietyRank[];
  purchaseHistory?: CustomerPurchaseRecord[];
  debtAmount?: number;
};

export type CustomerProfile = Customer & {
  neighborhood: string | null;
  createdAt: string;
  status: CustomerStatus;
  displayStatuses: CustomerStatus[];
  tags: string[];
  notes: CustomerNote[];
  importantNote: string | null;
  nextOrderLabel: string | null;
  orders: CustomerPurchaseRecord[];
  debtAmount: number;
  favoriteVariety: string;
  lastPurchaseAt: string | null;
  daysSinceLastPurchase: number | null;
  orderCount: number;
  totalPurchased: number;
  averageTicket: number;
  dozensPurchased: number;
  purchaseFrequencyDays: number | null;
  varietyRanking: CustomerVarietyRank[];
  varietyInsight: string;
  pendingCollection: number;
  isForReactivation: boolean;
  isWholesale: boolean;
};

export type CustomersSummaryMetrics = {
  total: number;
  active: number;
  newThisMonth: number;
  recurring: number;
  withDebt: number;
  totalSold: number;
};
