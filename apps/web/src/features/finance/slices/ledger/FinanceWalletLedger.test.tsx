import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useCreateFinanceReserveMovement,
  useCreateFinanceWalletAdjustment,
  useFinanceWalletMovements,
} from '../../hooks';
import { FinanceWalletLedger } from './FinanceWalletLedger';
import type { FinanceWalletMovementLedger } from '../../types';

vi.mock('../../hooks', () => ({
  useCreateFinanceReserveMovement: vi.fn(),
  useCreateFinanceWalletAdjustment: vi.fn(),
  useFinanceWalletMovements: vi.fn(),
}));

const ledger: FinanceWalletMovementLedger = {
  movements: [
    {
      id: 'sale:order-1:production_cost',
      wallet: 'production_cost',
      direction: 'credit',
      amountCents: 600000,
      signedAmountCents: 600000,
      sourceType: 'sale',
      sourceId: 'order-1',
      occurredAt: '2026-06-15',
    },
    {
      id: 'sale:order-1:services',
      wallet: 'services',
      direction: 'credit',
      amountCents: 100000,
      signedAmountCents: 100000,
      sourceType: 'sale',
      sourceId: 'order-1',
      occurredAt: '2026-06-15',
    },
    {
      id: 'sale:order-1:profit',
      wallet: 'profit',
      direction: 'credit' as const,
      amountCents: 200000,
      signedAmountCents: 200000,
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
  balances: { production_cost: 600000, services: -150000, profit: 200000, reserve: 0 },
};

const createMutation = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

const reserveMutation = {
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
    vi.mocked(useCreateFinanceReserveMovement).mockReturnValue(
      reserveMutation as unknown as ReturnType<typeof useCreateFinanceReserveMovement>,
    );
  });

  it('filters wallet movements and renders traceable balances plus source rows', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger initialWallet="profit" />);

    expect(
      screen.getByRole('heading', { name: /trazabilidad de billeteras/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^billetera$/i)).toHaveValue('profit');
    expect(screen.getByRole('article', { name: /ganancia: \$2\.000/i })).toBeInTheDocument();

    const table = screen.getByRole('table', { name: /movimientos de billetera/i });
    expect(within(table).getByRole('cell', { name: /pedido #1/i })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: /compra #1/i })).toBeInTheDocument();
    expect(within(table).getByText(/costo base/i)).toBeInTheDocument();
    expect(within(table).getByText(/distribución de venta/i)).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3);

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

  it('shows newest operations first and paginates grouped movements', async () => {
    const user = userEvent.setup();
    const movements = Array.from({ length: 21 }, (_, index) => ({
      id: `adjustment-${index + 1}`,
      wallet: 'profit' as const,
      direction: 'credit' as const,
      amountCents: 100,
      signedAmountCents: 100,
      sourceType: 'adjustment' as const,
      sourceId: `adjustment-${index + 1}`,
      occurredAt: `2026-06-${String(index + 1).padStart(2, '0')}`,
      reason: `Adjustment ${index + 1}`,
    }));
    vi.mocked(useFinanceWalletMovements).mockReturnValue({
      data: {
        movements,
        balances: { production_cost: 0, services: 0, profit: 2_100, reserve: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useFinanceWalletMovements>);

    render(<FinanceWalletLedger />);

    const table = screen.getByRole('table', { name: /movimientos de billetera/i });
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    expect(within(table).getByRole('cell', { name: /ajuste #21/i })).toBeInTheDocument();
    expect(within(table).queryByRole('cell', { name: /ajuste #1$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByRole('cell', { name: /ajuste #1$/i })).toBeInTheDocument();
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

  it('renders reserve loading with profit selected and keeps reserve out of manual adjustments', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    expect(screen.getByRole('heading', { name: /cargar reserva/i })).toBeInTheDocument();
    const source = screen.getByLabelText(/origen de la carga/i);
    expect(source).toHaveValue('profit');
    expect(
      within(source).getByRole('option', { name: /otra \(aporte externo\)/i }),
    ).toBeInTheDocument();
    await user.selectOptions(source, 'external');
    expect(source).toHaveValue('external');
    expect(screen.getByText(/otra.*aporte externo.*no descuenta ganancia/i)).toBeInTheDocument();

    const adjustmentWallet = screen.getByLabelText(/billetera del ajuste/i);
    expect(within(adjustmentWallet).queryByRole('option', { name: /reserva/i })).toBeNull();
  });

  it('loads reserve from profit and clears the form after success', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    await user.type(screen.getByLabelText(/^monto$/i), '1500.25');
    await user.type(screen.getByLabelText(/motivo \/ nota/i), 'Fondo de emergencia');
    await user.click(screen.getByRole('button', { name: /^cargar reserva$/i }));

    expect(reserveMutation.mutate).toHaveBeenCalledWith(
      {
        source: 'profit',
        amountCents: 150025,
        reason: 'Fondo de emergencia',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const onSuccess = reserveMutation.mutate.mock.calls[0]?.[1]?.onSuccess;
    act(() => onSuccess?.());

    expect(screen.getByLabelText(/^monto$/i)).toHaveValue(null);
    expect(screen.getByLabelText(/motivo \/ nota/i)).toHaveValue('');
    expect(screen.getByLabelText(/origen de la carga/i)).toHaveValue('profit');
  });

  it('loads reserve from an external contribution', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    await user.type(screen.getByLabelText(/^monto$/i), '500');
    await user.selectOptions(screen.getByLabelText(/origen de la carga/i), 'external');
    await user.type(screen.getByLabelText(/motivo \/ nota/i), 'Aporte de socios');
    await user.click(screen.getByRole('button', { name: /^cargar reserva$/i }));

    expect(reserveMutation.mutate).toHaveBeenCalledWith(
      {
        source: 'external',
        amountCents: 50000,
        reason: 'Aporte de socios',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('requires a positive reserve amount before calling the API', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    await user.type(screen.getByLabelText(/^monto$/i), '0');
    await user.type(screen.getByLabelText(/motivo \/ nota/i), 'Fondo de emergencia');
    await user.click(screen.getByRole('button', { name: /^cargar reserva$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/monto mayor a 0/i);
    expect(screen.getByLabelText(/^monto$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(reserveMutation.mutate).not.toHaveBeenCalled();
  });

  it('rejects a reserve reason containing only spaces', async () => {
    const user = userEvent.setup();

    render(<FinanceWalletLedger />);

    await user.type(screen.getByLabelText(/^monto$/i), '500');
    await user.type(screen.getByLabelText(/motivo \/ nota/i), '   ');
    await user.click(screen.getByRole('button', { name: /^cargar reserva$/i }));

    const reason = screen.getByLabelText(/motivo \/ nota/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/ingresá un motivo o nota/i);
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAttribute('aria-describedby', 'reserve-form-error');
    expect(reserveMutation.mutate).not.toHaveBeenCalled();
  });

  it('shows the API validation error returned while loading reserve', () => {
    vi.mocked(useCreateFinanceReserveMovement).mockReturnValue({
      ...reserveMutation,
      isError: true,
      error: Object.assign(new Error('Request failed with status code 400'), {
        isAxiosError: true,
        response: { data: { error: 'El monto debe ser mayor a cero.' } },
      }),
    } as unknown as ReturnType<typeof useCreateFinanceReserveMovement>);

    render(<FinanceWalletLedger />);

    expect(screen.getByRole('alert')).toHaveTextContent('El monto debe ser mayor a cero.');
  });
});
