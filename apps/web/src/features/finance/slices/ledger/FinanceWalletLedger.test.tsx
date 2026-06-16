import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateFinanceWalletAdjustment, useFinanceWalletMovements } from '../../hooks';
import { FinanceWalletLedger } from './FinanceWalletLedger';
import type { FinanceWalletMovementLedger } from '../../types';

vi.mock('../../hooks', () => ({
  useCreateFinanceWalletAdjustment: vi.fn(),
  useFinanceWalletMovements: vi.fn(),
}));

const ledger: FinanceWalletMovementLedger = {
  movements: [
    {
      id: 'sale:order-1:profit',
      wallet: 'profit',
      direction: 'credit',
      amountCents: 900000,
      signedAmountCents: 900000,
      sourceType: 'sale',
      sourceId: 'order-1',
      occurredAt: '2026-06-15',
    },
    {
      id: 'purchase:purchase-1',
      wallet: 'services',
      direction: 'debit',
      amountCents: 250000,
      signedAmountCents: -250000,
      sourceType: 'purchase',
      sourceId: 'purchase-1',
      occurredAt: '2026-06-16',
      reason: 'Gas bill',
    },
  ],
  balances: { production_cost: 0, services: -250000, profit: 900000 },
};

const createMutation = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

describe('FinanceWalletLedger', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFinanceWalletMovements).mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useFinanceWalletMovements>);
    vi.mocked(useCreateFinanceWalletAdjustment).mockReturnValue(
      createMutation as unknown as ReturnType<typeof useCreateFinanceWalletAdjustment>,
    );
  });

  it('filters wallet movements and renders traceable balances plus source rows', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger initialWallet="profit" />);

    expect(
      screen.getByRole('heading', { name: /trazabilidad de billeteras/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^billetera$/i)).toHaveValue('profit');
    expect(screen.getByRole('article', { name: /ganancia: \$9\.000/i })).toBeInTheDocument();

    const table = screen.getByRole('table', { name: /movimientos de billetera/i });
    expect(within(table).getByRole('cell', { name: /venta order-1/i })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: /\+\$9\.000/i })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: /compra purchase-1/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^billetera$/i), 'services');
    await user.selectOptions(screen.getByLabelText(/^origen$/i), 'purchase');
    await user.type(screen.getByLabelText(/id de origen/i), 'purchase-1');
    await user.type(screen.getByLabelText(/desde/i), '2026-06-16');

    await waitFor(() =>
      expect(useFinanceWalletMovements).toHaveBeenLastCalledWith({
        wallet: 'services',
        sourceType: 'purchase',
        sourceId: 'purchase-1',
        from: '2026-06-16',
      }),
    );
  });

  it('submits wallet adjustments with a required reason and pesos converted to cents', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    await user.selectOptions(screen.getByLabelText(/billetera del ajuste/i), 'services');
    await user.selectOptions(screen.getByLabelText(/tipo de ajuste/i), 'debit');
    await user.clear(screen.getByLabelText(/monto del ajuste/i));
    await user.type(screen.getByLabelText(/monto del ajuste/i), '2500');
    await user.type(screen.getByLabelText(/motivo del ajuste/i), 'Gas bill');
    await user.click(screen.getByRole('button', { name: /registrar ajuste/i }));

    expect(createMutation.mutate).toHaveBeenCalledWith(
      {
        wallet: 'services',
        direction: 'debit',
        amountCents: 250000,
        reason: 'Gas bill',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
