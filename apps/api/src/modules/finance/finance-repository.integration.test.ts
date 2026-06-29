import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { createDbClient } from '../../db/index';
import {
  financeLedgerEntries,
  financeLedgerEvents,
  financeReserveMovements,
  financeWalletAdjustments,
} from '../../db/schema';
import { createFinanceRepository } from './finance-repository';
import type { FinanceReserveMovementRecord } from './finance-service';
import type { FinanceWalletAdjustmentRecord } from './wallet-ledger-service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('finance repository ledger integration', () => {
  const client = createDbClient(databaseUrl ?? 'postgresql://unused');
  const repository = createFinanceRepository(client.db);

  beforeAll(async () => {
    await client.sql`select 1`;
  });

  afterAll(async () => {
    await client.sql.end();
  });

  const adjustment = (
    id: string,
    overrides: Partial<FinanceWalletAdjustmentRecord> = {},
  ): FinanceWalletAdjustmentRecord => ({
    id,
    wallet: 'services',
    direction: 'debit',
    amountCents: 2_500,
    reason: 'Integration test adjustment',
    actorId: 'test-actor',
    actorName: 'Test Actor',
    occurredAt: new Date('2026-06-21T12:00:00.000Z'),
    createdAt: new Date('2026-06-21T12:01:00.000Z'),
    ...overrides,
  });

  const reserveMovement = (
    id: string,
    overrides: Partial<FinanceReserveMovementRecord> = {},
  ): FinanceReserveMovementRecord => ({
    id,
    source: 'profit',
    amountCents: 10_000,
    reason: 'Integration test reserve movement',
    createdAt: new Date('2026-06-27T12:00:00.000Z'),
    createdById: 'test-actor',
    createdByName: 'Test Actor',
    ...overrides,
  });

  it('creates one idempotent ledger event and entry with the wallet adjustment', async () => {
    const input = adjustment(`integration-adjustment-${randomUUID()}`);

    await repository.createWalletAdjustment(input);
    await repository.createWalletAdjustment(input);

    const adjustments = await client.db
      .select()
      .from(financeWalletAdjustments)
      .where(eq(financeWalletAdjustments.id, input.id));
    const events = await client.db
      .select()
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `wallet-adjustment:${input.id}`));
    const entries = await client.db
      .select()
      .from(financeLedgerEntries)
      .where(eq(financeLedgerEntries.eventId, events[0]?.id ?? 'missing'));

    expect(adjustments).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(entries).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'wallet_adjustment',
      origin: 'live',
      sourceType: 'wallet_adjustment',
      sourceId: input.id,
      createdById: input.actorId,
      createdByName: input.actorName,
    });
    expect(entries[0]).toMatchObject({
      lineKey: 'main',
      entryKind: 'adjustment',
      direction: input.direction,
      wallet: input.wallet,
      category: 'wallet_adjustment',
      amountCents: input.amountCents,
      currency: 'ARS',
      description: input.reason,
    });
  });

  it('rolls back the adjustment when the ledger entry cannot be inserted', async () => {
    const input = adjustment(`integration-adjustment-rollback-${randomUUID()}`, {
      reason: 'force-ledger-failure',
    });

    await client.sql`
      alter table finance_ledger_entries
      drop constraint if exists finance_ledger_entries_test_failure
    `;
    await client.sql`
      alter table finance_ledger_entries
      add constraint finance_ledger_entries_test_failure
      check (description <> 'force-ledger-failure')
    `;

    try {
      await expect(repository.createWalletAdjustment(input)).rejects.toThrow();
    } finally {
      await client.sql`
        alter table finance_ledger_entries
        drop constraint finance_ledger_entries_test_failure
      `;
    }

    const adjustments = await client.db
      .select({ id: financeWalletAdjustments.id })
      .from(financeWalletAdjustments)
      .where(eq(financeWalletAdjustments.id, input.id));
    const events = await client.db
      .select({ id: financeLedgerEvents.id })
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `wallet-adjustment:${input.id}`));

    expect(adjustments).toEqual([]);
    expect(events).toEqual([]);
  });

  it('does not create ledger rows for pre-existing historical adjustments', async () => {
    const historical = adjustment(`integration-adjustment-historical-${randomUUID()}`);

    await client.db.insert(financeWalletAdjustments).values({
      id: historical.id,
      wallet: historical.wallet,
      direction: historical.direction,
      amountCents: historical.amountCents,
      reason: historical.reason,
      actorId: historical.actorId,
      actorName: historical.actorName,
      occurredAt: historical.occurredAt,
      createdAt: historical.createdAt,
    });
    const events = await client.db
      .select({ id: financeLedgerEvents.id })
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.sourceId, historical.id));

    expect(events).toEqual([]);
  });

  it('creates one idempotent profit-to-reserve transfer with balanced entries', async () => {
    const input = reserveMovement(`integration-reserve-profit-${randomUUID()}`);

    await repository.createReserveMovement(input);
    await repository.createReserveMovement(input);
    await expect(
      repository.createReserveMovement({ ...input, amountCents: input.amountCents + 1 }),
    ).rejects.toThrow('Reserve movement id already exists with different data');

    const movements = await client.db
      .select()
      .from(financeReserveMovements)
      .where(eq(financeReserveMovements.id, input.id));
    const events = await client.db
      .select()
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `reserve-movement:${input.id}`));
    const entries = await client.db
      .select()
      .from(financeLedgerEntries)
      .where(eq(financeLedgerEntries.eventId, events[0]?.id ?? 'missing'));

    expect(movements).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(entries).toHaveLength(2);
    expect(events[0]).toMatchObject({
      eventType: 'reserve_transfer',
      origin: 'live',
      sourceType: 'reserve_movement',
      sourceId: input.id,
      idempotencyKey: `reserve-movement:${input.id}`,
      createdById: input.createdById,
      createdByName: input.createdByName,
    });
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineKey: 'profit_debit',
          entryKind: 'adjustment',
          direction: 'debit',
          wallet: 'profit',
          category: 'reserve_transfer',
          amountCents: input.amountCents,
          currency: 'ARS',
        }),
        expect.objectContaining({
          lineKey: 'reserve_credit',
          entryKind: 'adjustment',
          direction: 'credit',
          wallet: 'reserve',
          category: 'reserve_transfer',
          amountCents: input.amountCents,
          currency: 'ARS',
        }),
      ]),
    );
    expect(entries.every((entry) => entry.description === input.reason)).toBe(true);
  });

  it('creates an external reserve contribution without an internal debit', async () => {
    const input = reserveMovement(`integration-reserve-external-${randomUUID()}`, {
      source: 'external',
      amountCents: 15_000,
      reason: 'External integration contribution',
    });

    const created = await repository.createReserveMovement(input);

    const events = await client.db
      .select()
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `reserve-movement:${input.id}`));
    const entries = await client.db
      .select()
      .from(financeLedgerEntries)
      .where(eq(financeLedgerEntries.eventId, events[0]?.id ?? 'missing'));

    expect(created).toMatchObject({
      id: input.id,
      source: 'external',
      amountCents: input.amountCents,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: 'reserve_external_contribution',
      origin: 'live',
      sourceType: 'reserve_movement',
      sourceId: input.id,
      idempotencyKey: `reserve-movement:${input.id}`,
    });
    expect(entries).toEqual([
      expect.objectContaining({
        lineKey: 'reserve_credit',
        entryKind: 'adjustment',
        direction: 'credit',
        wallet: 'reserve',
        category: 'reserve_external_contribution',
        amountCents: input.amountCents,
        currency: 'ARS',
      }),
    ]);
    expect(entries.some((entry) => entry.direction === 'debit')).toBe(false);
  });

  it('rolls back a reserve movement when its ledger entry cannot be inserted', async () => {
    const input = reserveMovement(`integration-reserve-rollback-${randomUUID()}`, {
      reason: 'force-reserve-ledger-failure',
    });

    await client.sql`
      alter table finance_ledger_entries
      drop constraint if exists finance_ledger_entries_reserve_test_failure
    `;
    await client.sql`
      alter table finance_ledger_entries
      add constraint finance_ledger_entries_reserve_test_failure
      check (description <> 'force-reserve-ledger-failure')
    `;

    try {
      await expect(repository.createReserveMovement(input)).rejects.toThrow();
    } finally {
      await client.sql`
        alter table finance_ledger_entries
        drop constraint finance_ledger_entries_reserve_test_failure
      `;
    }

    const movements = await client.db
      .select({ id: financeReserveMovements.id })
      .from(financeReserveMovements)
      .where(eq(financeReserveMovements.id, input.id));
    const events = await client.db
      .select({ id: financeLedgerEvents.id })
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `reserve-movement:${input.id}`));

    expect(movements).toEqual([]);
    expect(events).toEqual([]);
  });

  it('does not create ledger rows when the reserve movement insert fails', async () => {
    const input = reserveMovement(`integration-reserve-invalid-${randomUUID()}`, {
      amountCents: 0,
    });

    await expect(repository.createReserveMovement(input)).rejects.toThrow();

    const events = await client.db
      .select({ id: financeLedgerEvents.id })
      .from(financeLedgerEvents)
      .where(eq(financeLedgerEvents.idempotencyKey, `reserve-movement:${input.id}`));

    expect(events).toEqual([]);
  });
});
