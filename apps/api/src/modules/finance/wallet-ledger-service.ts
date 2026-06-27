import {
  createFinanceWalletAdjustmentSchema,
  financeAssumptionsSchema,
  type CreateFinanceWalletAdjustmentInput,
  type FinancePurchaseFundingSource,
  type FinanceWallet,
  type FinanceWalletMovement,
  type FinanceWalletMovementDirection,
  type FinanceWalletMovementFilters,
} from '@te-pinta/shared';

export type WalletLedgerSaleInput = {
  id: string;
  isPaid: boolean;
  occurredAt: string;
  totalCents: number;
  directCostCents: number;
};

export type WalletLedgerPurchaseInput = {
  id: string;
  occurredAt: string;
  fundingSource: FinancePurchaseFundingSource;
  totalPriceCents: number;
  canceledAt: Date | string | null;
};

export type FinanceWalletAdjustmentRecord = {
  id: string;
  wallet: FinanceWallet;
  direction: FinanceWalletMovementDirection;
  amountCents: number;
  reason: string;
  actorId: string;
  actorName: string;
  occurredAt: Date;
  createdAt: Date;
};

export type WalletLedgerBuildInput = {
  sales: WalletLedgerSaleInput[];
  purchases: WalletLedgerPurchaseInput[];
  adjustments: FinanceWalletAdjustmentRecord[];
  servicePercent: number;
};

export type CreateWalletAdjustmentRecordInput = Omit<
  CreateFinanceWalletAdjustmentInput,
  'occurredAt'
> & {
  id: string;
  actorId: string;
  actorName: string;
  occurredAt?: Date;
  createdAt?: Date;
};

export type WalletBalances = Record<FinanceWallet, number>;

export type WalletLedgerRepository = {
  listWalletLedgerSales(): Promise<WalletLedgerSaleInput[]>;
  listWalletLedgerPurchases(): Promise<WalletLedgerPurchaseInput[]>;
  listWalletAdjustments(): Promise<FinanceWalletAdjustmentRecord[]>;
  createWalletAdjustment(
    input: FinanceWalletAdjustmentRecord,
  ): Promise<FinanceWalletAdjustmentRecord>;
};

const emptyBalances = (): WalletBalances => ({
  production_cost: 0,
  services: 0,
  profit: 0,
  reserve: 0,
});

const signedAmountFor = (direction: FinanceWalletMovementDirection, amountCents: number): number =>
  direction === 'credit' ? amountCents : -amountCents;

const movement = ({
  id,
  wallet,
  direction,
  amountCents,
  sourceType,
  sourceId,
  occurredAt,
  reason,
  actorId,
  actorName,
}: Omit<FinanceWalletMovement, 'signedAmountCents'>): FinanceWalletMovement => ({
  id,
  wallet,
  direction,
  amountCents,
  signedAmountCents: signedAmountFor(direction, amountCents),
  sourceType,
  sourceId,
  occurredAt,
  reason,
  actorId,
  actorName,
});

const assertPositiveIntegerCents = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer amount of cents`);
  }
};

const assertNonNegativeIntegerCents = (value: number, field: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer amount of cents`);
  }
};

const addIfPositive = (
  movements: FinanceWalletMovement[],
  input: Omit<FinanceWalletMovement, 'amountCents' | 'signedAmountCents'> & {
    amountCents: number;
  },
): void => {
  if (input.amountCents <= 0) {
    return;
  }

  movements.push(movement(input));
};

const buildSaleMovements = (
  sale: WalletLedgerSaleInput,
  servicePercent: number,
): FinanceWalletMovement[] => {
  if (!sale.isPaid) {
    return [];
  }

  assertNonNegativeIntegerCents(sale.totalCents, 'sale.totalCents');
  if (sale.totalCents === 0) {
    return [];
  }
  assertNonNegativeIntegerCents(sale.directCostCents, 'sale.directCostCents');

  const movements: FinanceWalletMovement[] = [];
  const grossProfitCents = sale.totalCents - sale.directCostCents;
  const serviceReserveCents = Math.round(Math.max(grossProfitCents, 0) * (servicePercent / 100));
  const profitReserveCents = grossProfitCents - serviceReserveCents;

  addIfPositive(movements, {
    id: `sale:${sale.id}:production_cost`,
    wallet: 'production_cost',
    direction: 'credit',
    amountCents: sale.directCostCents,
    sourceType: 'sale',
    sourceId: sale.id,
    occurredAt: sale.occurredAt,
    reason: 'Sale direct production cost',
  });
  addIfPositive(movements, {
    id: `sale:${sale.id}:services`,
    wallet: 'services',
    direction: 'credit',
    amountCents: serviceReserveCents,
    sourceType: 'sale',
    sourceId: sale.id,
    occurredAt: sale.occurredAt,
    reason: 'Sale service reserve',
  });
  addIfPositive(movements, {
    id: `sale:${sale.id}:profit`,
    wallet: 'profit',
    direction: profitReserveCents >= 0 ? 'credit' : 'debit',
    amountCents: Math.abs(profitReserveCents),
    sourceType: 'sale',
    sourceId: sale.id,
    occurredAt: sale.occurredAt,
    reason: 'Sale profit reserve',
  });

  return movements;
};

const buildPurchaseMovement = (purchase: WalletLedgerPurchaseInput): FinanceWalletMovement[] => {
  if (purchase.canceledAt) {
    return [];
  }

  assertPositiveIntegerCents(purchase.totalPriceCents, 'purchase.totalPriceCents');

  return [
    movement({
      id: `purchase:${purchase.id}:${purchase.fundingSource}`,
      wallet: purchase.fundingSource,
      direction: 'debit',
      amountCents: purchase.totalPriceCents,
      sourceType: 'purchase',
      sourceId: purchase.id,
      occurredAt: purchase.occurredAt,
      reason: `Purchase paid from ${purchase.fundingSource}`,
    }),
  ];
};

const buildAdjustmentMovement = (
  adjustment: FinanceWalletAdjustmentRecord,
): FinanceWalletMovement =>
  movement({
    id: adjustment.id,
    wallet: adjustment.wallet,
    direction: adjustment.direction,
    amountCents: adjustment.amountCents,
    sourceType: 'adjustment',
    sourceId: adjustment.id,
    occurredAt: adjustment.occurredAt.toISOString(),
    reason: adjustment.reason,
    actorId: adjustment.actorId,
    actorName: adjustment.actorName,
  });

const normalizeRequiredText = (value: string, errorMessage: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(errorMessage);
  }

  return normalized;
};

const movementDate = (occurredAt: string): string => occurredAt.slice(0, 10);

export const toWalletAdjustmentRecord = ({
  id,
  actorId,
  actorName,
  occurredAt = new Date(),
  createdAt = new Date(),
  ...input
}: CreateWalletAdjustmentRecordInput): FinanceWalletAdjustmentRecord => {
  const reason = normalizeRequiredText(input.reason, 'Wallet adjustment reason is required');
  const parsed = createFinanceWalletAdjustmentSchema.parse({ ...input, reason });

  return {
    id: normalizeRequiredText(id, 'Wallet adjustment id is required'),
    wallet: parsed.wallet,
    direction: parsed.direction,
    amountCents: parsed.amountCents,
    reason: parsed.reason,
    actorId: normalizeRequiredText(actorId, 'Wallet adjustment actor id is required'),
    actorName: normalizeRequiredText(actorName, 'Wallet adjustment actor name is required'),
    occurredAt,
    createdAt,
  };
};

export const buildWalletMovements = ({
  sales,
  purchases,
  adjustments,
  servicePercent,
}: WalletLedgerBuildInput): FinanceWalletMovement[] => {
  const { servicePercent: validServicePercent } = financeAssumptionsSchema.parse({
    servicePercent,
    targetMarginPercent: 0,
  });

  return [
    ...sales.flatMap((sale) => buildSaleMovements(sale, validServicePercent)),
    ...purchases.flatMap(buildPurchaseMovement),
    ...adjustments.map(buildAdjustmentMovement),
  ];
};

export const filterWalletMovements = (
  movements: FinanceWalletMovement[],
  filters: FinanceWalletMovementFilters = {},
): FinanceWalletMovement[] =>
  movements
    .filter((item) => {
      if (filters.wallet && item.wallet !== filters.wallet) return false;
      if (filters.direction && item.direction !== filters.direction) return false;
      if (filters.sourceType && item.sourceType !== filters.sourceType) return false;
      if (filters.sourceId && item.sourceId !== filters.sourceId) return false;
      if (filters.from && movementDate(item.occurredAt) < filters.from) return false;
      if (filters.to && movementDate(item.occurredAt) > filters.to) return false;

      return true;
    })
    .sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id),
    );

export const calculateWalletBalances = (movements: FinanceWalletMovement[]): WalletBalances =>
  movements.reduce<WalletBalances>((balances, item) => {
    balances[item.wallet] += item.signedAmountCents;
    return balances;
  }, emptyBalances());
