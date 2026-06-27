import { describe, expect, it } from 'vitest';

import {
  buildWalletMovements,
  calculateWalletBalances,
  filterWalletMovements,
  toWalletAdjustmentRecord,
  type WalletLedgerPurchaseInput,
  type WalletLedgerSaleInput,
} from './wallet-ledger-service';

const paidSale = (overrides: Partial<WalletLedgerSaleInput> = {}): WalletLedgerSaleInput => ({
  id: 'order-1',
  isPaid: true,
  occurredAt: '2026-06-15',
  totalCents: 20_000,
  directCostCents: 8_000,
  ...overrides,
});

const purchase = (
  overrides: Partial<WalletLedgerPurchaseInput> = {},
): WalletLedgerPurchaseInput => ({
  id: 'purchase-1',
  occurredAt: '2026-06-16',
  fundingSource: 'services',
  totalPriceCents: 4_500,
  canceledAt: null,
  ...overrides,
});

describe('wallet ledger service', () => {
  it('allocates paid sale movements with deterministic trace ids', () => {
    const movements = buildWalletMovements({
      sales: [paidSale()],
      purchases: [],
      adjustments: [],
      servicePercent: 25,
    });

    expect(movements).toEqual([
      {
        id: 'sale:order-1:production_cost',
        wallet: 'production_cost',
        direction: 'credit',
        amountCents: 8_000,
        signedAmountCents: 8_000,
        sourceType: 'sale',
        sourceId: 'order-1',
        occurredAt: '2026-06-15',
        reason: 'Sale direct production cost',
      },
      {
        id: 'sale:order-1:services',
        wallet: 'services',
        direction: 'credit',
        amountCents: 3_000,
        signedAmountCents: 3_000,
        sourceType: 'sale',
        sourceId: 'order-1',
        occurredAt: '2026-06-15',
        reason: 'Sale service reserve',
      },
      {
        id: 'sale:order-1:profit',
        wallet: 'profit',
        direction: 'credit',
        amountCents: 9_000,
        signedAmountCents: 9_000,
        sourceType: 'sale',
        sourceId: 'order-1',
        occurredAt: '2026-06-15',
        reason: 'Sale profit reserve',
      },
    ]);
  });

  it('excludes unpaid sales and assigns losses to profit', () => {
    const movements = buildWalletMovements({
      sales: [
        paidSale({ id: 'unpaid-order', isPaid: false }),
        paidSale({
          id: 'loss-order',
          occurredAt: '2026-06-17',
          totalCents: 5_000,
          directCostCents: 7_000,
        }),
      ],
      purchases: [],
      adjustments: [],
      servicePercent: 25,
    });

    expect(movements.map((movement) => movement.id)).toEqual([
      'sale:loss-order:production_cost',
      'sale:loss-order:profit',
    ]);
    expect(movements).toContainEqual(
      expect.objectContaining({
        wallet: 'profit',
        direction: 'debit',
        amountCents: 2_000,
        signedAmountCents: -2_000,
      }),
    );
  });

  it('ignores paid zero-total sales instead of blocking the ledger', () => {
    const movements = buildWalletMovements({
      sales: [paidSale({ id: 'zero-order', totalCents: 0 })],
      purchases: [],
      adjustments: [],
      servicePercent: 25,
    });

    expect(movements).toEqual([]);
  });

  it('debits active purchases from their selected wallet and excludes canceled purchases', () => {
    const movements = buildWalletMovements({
      sales: [],
      purchases: [
        purchase(),
        purchase({
          id: 'canceled-purchase',
          canceledAt: new Date('2026-06-17T10:00:00.000Z'),
          totalPriceCents: 9_900,
        }),
      ],
      adjustments: [],
      servicePercent: 20,
    });

    expect(movements).toEqual([
      {
        id: 'purchase:purchase-1:services',
        wallet: 'services',
        direction: 'debit',
        amountCents: 4_500,
        signedAmountCents: -4_500,
        sourceType: 'purchase',
        sourceId: 'purchase-1',
        occurredAt: '2026-06-16',
        reason: 'Purchase paid from services',
      },
    ]);
  });

  it('validates adjustment input and signs adjustment movements by direction', () => {
    const adjustment = toWalletAdjustmentRecord({
      id: 'adjustment-1',
      wallet: 'profit',
      direction: 'debit',
      amountCents: 1_200,
      reason: ' Owner withdrawal ',
      actorId: 'admin-1',
      actorName: 'Admin Te Pinta',
      occurredAt: new Date('2026-06-18T12:30:00.000Z'),
      createdAt: new Date('2026-06-18T12:31:00.000Z'),
    });

    expect(adjustment.reason).toBe('Owner withdrawal');
    expect(
      buildWalletMovements({
        sales: [],
        purchases: [],
        adjustments: [adjustment],
        servicePercent: 20,
      }),
    ).toEqual([
      {
        id: 'adjustment-1',
        wallet: 'profit',
        direction: 'debit',
        amountCents: 1_200,
        signedAmountCents: -1_200,
        sourceType: 'adjustment',
        sourceId: 'adjustment-1',
        occurredAt: '2026-06-18T12:30:00.000Z',
        reason: 'Owner withdrawal',
        actorId: 'admin-1',
        actorName: 'Admin Te Pinta',
      },
    ]);
    expect(() =>
      toWalletAdjustmentRecord({
        id: 'adjustment-2',
        wallet: 'profit',
        direction: 'credit',
        amountCents: 1_200,
        reason: ' ',
        actorId: 'admin-1',
        actorName: 'Admin Te Pinta',
        occurredAt: new Date('2026-06-18T12:30:00.000Z'),
      }),
    ).toThrow('Wallet adjustment reason is required');
  });

  it('filters movements by wallet, direction, source, and date', () => {
    const movements = buildWalletMovements({
      sales: [paidSale()],
      purchases: [purchase()],
      adjustments: [
        toWalletAdjustmentRecord({
          id: 'adjustment-1',
          wallet: 'profit',
          direction: 'credit',
          amountCents: 500,
          reason: 'Rounding correction',
          actorId: 'admin-1',
          actorName: 'Admin Te Pinta',
          occurredAt: new Date('2026-06-18T12:30:00.000Z'),
        }),
      ],
      servicePercent: 25,
    });

    expect(
      filterWalletMovements(movements, {
        wallet: 'profit',
        direction: 'credit',
        sourceType: 'sale',
        sourceId: 'order-1',
        from: '2026-06-15',
        to: '2026-06-15',
      }).map((movement) => movement.id),
    ).toEqual(['sale:order-1:profit']);
    expect(filterWalletMovements(movements, { sourceId: 'missing-source' })).toEqual([]);
  });

  it('shows the newest wallet movements first', () => {
    const movements = buildWalletMovements({
      sales: [paidSale()],
      purchases: [
        {
          ...purchase(),
          id: 'purchase-new',
          occurredAt: '2026-06-20',
        },
      ],
      adjustments: [],
      servicePercent: 25,
    });

    expect(filterWalletMovements(movements).map(({ id }) => id)).toEqual([
      'purchase:purchase-new:services',
      'sale:order-1:services',
      'sale:order-1:profit',
      'sale:order-1:production_cost',
    ]);
  });

  it('explains balances as the signed movement sum per wallet', () => {
    const movements = buildWalletMovements({
      sales: [paidSale()],
      purchases: [purchase()],
      adjustments: [
        toWalletAdjustmentRecord({
          id: 'adjustment-1',
          wallet: 'profit',
          direction: 'credit',
          amountCents: 500,
          reason: 'Rounding correction',
          actorId: 'admin-1',
          actorName: 'Admin Te Pinta',
          occurredAt: new Date('2026-06-18T12:30:00.000Z'),
        }),
      ],
      servicePercent: 25,
    });

    expect(calculateWalletBalances(movements)).toEqual({
      production_cost: 8_000,
      services: -1_500,
      profit: 9_500,
      reserve: 0,
    });
  });
});
