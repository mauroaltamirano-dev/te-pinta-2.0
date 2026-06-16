import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CircleDollarSign, SlidersHorizontal } from 'lucide-react';

import { FinanceTable, type FinanceTableColumn } from '../../components/FinanceTable';
import { MetricCard } from '../../components/MetricCard';
import { useCreateFinanceWalletAdjustment, useFinanceWalletMovements } from '../../hooks';
import type {
  FinanceWallet,
  FinanceWalletMovement,
  FinanceWalletMovementDirection,
  FinanceWalletMovementFilters,
  FinanceWalletMovementSourceType,
} from '../../types';

type FinanceWalletLedgerProps = {
  initialWallet?: FinanceWallet;
};

type WalletFilterState = {
  wallet: FinanceWallet | '';
  direction: FinanceWalletMovementDirection | '';
  sourceType: FinanceWalletMovementSourceType | '';
  sourceId: string;
  from: string;
  to: string;
};

type AdjustmentFormState = {
  wallet: FinanceWallet;
  direction: FinanceWalletMovementDirection;
  amount: string;
  reason: string;
  occurredAt: string;
};

const walletLabels: Record<FinanceWallet, string> = {
  production_cost: 'Costo base',
  services: 'Servicios',
  profit: 'Ganancia',
};

const directionLabels: Record<FinanceWalletMovementDirection, string> = {
  credit: 'Ingreso',
  debit: 'Egreso',
};

const sourceTypeLabels: Record<FinanceWalletMovementSourceType, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
};

const wallets = Object.keys(walletLabels) as FinanceWallet[];
const directions = Object.keys(directionLabels) as FinanceWalletMovementDirection[];
const sourceTypes = Object.keys(sourceTypeLabels) as FinanceWalletMovementSourceType[];

const numberFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const formatMoneyFromCents = (cents: number): string =>
  `$${numberFormatter.format(Math.round(cents / 100))}`;

const formatSignedMoneyFromCents = (cents: number): string => {
  const formatted = formatMoneyFromCents(Math.abs(cents));

  return `${cents > 0 ? '+' : cents < 0 ? '-' : ''}${formatted}`;
};

const formatDate = (value: string): string => {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);

  return dateFormatter.format(date);
};

const toCents = (value: string): number => Math.round(Number(value || 0) * 100);
const toIsoTimestamp = (value: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const buildFilters = (state: WalletFilterState): FinanceWalletMovementFilters => ({
  ...(state.wallet ? { wallet: state.wallet } : {}),
  ...(state.direction ? { direction: state.direction } : {}),
  ...(state.sourceType ? { sourceType: state.sourceType } : {}),
  ...(state.sourceId.trim() ? { sourceId: state.sourceId.trim() } : {}),
  ...(state.from ? { from: state.from } : {}),
  ...(state.to ? { to: state.to } : {}),
});

const initialAdjustmentForm = (wallet: FinanceWallet = 'production_cost'): AdjustmentFormState => ({
  wallet,
  direction: 'credit',
  amount: '0',
  reason: '',
  occurredAt: '',
});

const getErrorDescription = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

export const FinanceWalletLedger = ({ initialWallet }: FinanceWalletLedgerProps) => {
  const [filterState, setFilterState] = useState<WalletFilterState>({
    wallet: initialWallet ?? '',
    direction: '',
    sourceType: '',
    sourceId: '',
    from: '',
    to: '',
  });
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(() =>
    initialAdjustmentForm(initialWallet),
  );
  const filters = useMemo(() => buildFilters(filterState), [filterState]);
  const movementsQuery = useFinanceWalletMovements(filters);
  const createAdjustment = useCreateFinanceWalletAdjustment();
  const ledger = movementsQuery.data;

  useEffect(() => {
    if (!initialWallet) return;

    setFilterState((current) =>
      current.wallet === initialWallet ? current : { ...current, wallet: initialWallet },
    );
    setAdjustmentForm((current) =>
      current.wallet === initialWallet ? current : { ...current, wallet: initialWallet },
    );
  }, [initialWallet]);

  const columns: FinanceTableColumn<FinanceWalletMovement>[] = [
    {
      id: 'date',
      header: 'Fecha',
      render: (movement) => formatDate(movement.occurredAt),
    },
    {
      id: 'wallet',
      header: 'Billetera',
      render: (movement) => walletLabels[movement.wallet],
    },
    {
      id: 'direction',
      header: 'Movimiento',
      render: (movement) => directionLabels[movement.direction],
    },
    {
      id: 'amount',
      header: 'Monto',
      align: 'right',
      render: (movement) => formatSignedMoneyFromCents(movement.signedAmountCents),
    },
    {
      id: 'source',
      header: 'Origen',
      render: (movement) => `${sourceTypeLabels[movement.sourceType]} ${movement.sourceId}`,
    },
    {
      id: 'reason',
      header: 'Motivo',
      render: (movement) => movement.reason ?? '—',
    },
  ];

  const handleAdjustmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const occurredAt = toIsoTimestamp(adjustmentForm.occurredAt);

    createAdjustment.mutate(
      {
        wallet: adjustmentForm.wallet,
        direction: adjustmentForm.direction,
        amountCents: toCents(adjustmentForm.amount),
        reason: adjustmentForm.reason.trim(),
        ...(occurredAt ? { occurredAt } : {}),
      },
      {
        onSuccess: () =>
          setAdjustmentForm((current) => ({
            ...initialAdjustmentForm(current.wallet),
            direction: current.direction,
          })),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <SlidersHorizontal className="h-4 w-4" aria-hidden={true} /> Ledger financiero
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
              Trazabilidad de billeteras
            </h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-muted-foreground">
              Cada saldo sale de movimientos visibles: ventas pagadas, compras activas y ajustes
              auditados con motivo.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm font-bold text-foreground">
            Billetera
            <select
              aria-label="Billetera"
              className={`${inputClassName} appearance-none`}
              onChange={(event) =>
                setFilterState((current) => ({
                  ...current,
                  wallet: event.target.value as FinanceWallet | '',
                }))
              }
              value={filterState.wallet}
            >
              <option value="">Todas</option>
              {wallets.map((wallet) => (
                <option key={wallet} value={wallet}>
                  {walletLabels[wallet]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-foreground">
            Movimiento
            <select
              aria-label="Movimiento"
              className={`${inputClassName} appearance-none`}
              onChange={(event) =>
                setFilterState((current) => ({
                  ...current,
                  direction: event.target.value as FinanceWalletMovementDirection | '',
                }))
              }
              value={filterState.direction}
            >
              <option value="">Todos</option>
              {directions.map((direction) => (
                <option key={direction} value={direction}>
                  {directionLabels[direction]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-foreground">
            Origen
            <select
              aria-label="Origen"
              className={`${inputClassName} appearance-none`}
              onChange={(event) =>
                setFilterState((current) => ({
                  ...current,
                  sourceType: event.target.value as FinanceWalletMovementSourceType | '',
                }))
              }
              value={filterState.sourceType}
            >
              <option value="">Todos</option>
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceTypeLabels[sourceType]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-foreground">
            ID de origen
            <input
              aria-label="ID de origen"
              className={inputClassName}
              onChange={(event) =>
                setFilterState((current) => ({ ...current, sourceId: event.target.value }))
              }
              placeholder="order-1"
              value={filterState.sourceId}
            />
          </label>

          <label className="text-sm font-bold text-foreground">
            Desde
            <input
              aria-label="Desde"
              className={inputClassName}
              onChange={(event) =>
                setFilterState((current) => ({ ...current, from: event.target.value }))
              }
              type="date"
              value={filterState.from}
            />
          </label>

          <label className="text-sm font-bold text-foreground">
            Hasta
            <input
              aria-label="Hasta"
              className={inputClassName}
              onChange={(event) =>
                setFilterState((current) => ({ ...current, to: event.target.value }))
              }
              type="date"
              value={filterState.to}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {wallets.map((wallet) => (
          <MetricCard
            accent={wallet === 'profit' ? 'success' : wallet === 'services' ? 'primary' : 'neutral'}
            helpText="Saldo visible del ledger filtrado."
            key={wallet}
            label={walletLabels[wallet]}
            value={formatMoneyFromCents(ledger?.balances[wallet] ?? 0)}
          />
        ))}
      </div>

      {movementsQuery.isError ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">
          {getErrorDescription(movementsQuery.error)}
        </div>
      ) : null}

      <FinanceTable
        ariaLabel="Movimientos de billetera"
        caption={
          movementsQuery.isLoading
            ? 'Cargando movimientos...'
            : `${ledger?.movements.length ?? 0} movimiento(s) visibles`
        }
        columns={columns}
        emptyState="No hay movimientos para los filtros seleccionados."
        getRowKey={(movement) => movement.id}
        rows={ledger?.movements ?? []}
      />

      <form
        className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-card"
        onSubmit={handleAdjustmentSubmit}
      >
        <div className="flex items-center gap-2 text-primary">
          <CircleDollarSign className="h-4 w-4" aria-hidden={true} />
          <h3 className="text-sm font-black uppercase tracking-wide">Ajuste manual</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-bold text-foreground">
            Billetera del ajuste
            <select
              aria-label="Billetera del ajuste"
              className={`${inputClassName} appearance-none`}
              onChange={(event) =>
                setAdjustmentForm((current) => ({
                  ...current,
                  wallet: event.target.value as FinanceWallet,
                }))
              }
              value={adjustmentForm.wallet}
            >
              {wallets.map((wallet) => (
                <option key={wallet} value={wallet}>
                  {walletLabels[wallet]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-foreground">
            Tipo de ajuste
            <select
              aria-label="Tipo de ajuste"
              className={`${inputClassName} appearance-none`}
              onChange={(event) =>
                setAdjustmentForm((current) => ({
                  ...current,
                  direction: event.target.value as FinanceWalletMovementDirection,
                }))
              }
              value={adjustmentForm.direction}
            >
              {directions.map((direction) => (
                <option key={direction} value={direction}>
                  {directionLabels[direction]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-foreground">
            Monto del ajuste
            <input
              aria-label="Monto del ajuste"
              className={inputClassName}
              min="0.01"
              onChange={(event) =>
                setAdjustmentForm((current) => ({ ...current, amount: event.target.value }))
              }
              required
              step="0.01"
              type="number"
              value={adjustmentForm.amount}
            />
          </label>

          <label className="text-sm font-bold text-foreground">
            Fecha del ajuste
            <input
              aria-label="Fecha del ajuste"
              className={inputClassName}
              onChange={(event) =>
                setAdjustmentForm((current) => ({ ...current, occurredAt: event.target.value }))
              }
              type="datetime-local"
              value={adjustmentForm.occurredAt}
            />
          </label>

          <label className="text-sm font-bold text-foreground xl:col-span-5">
            Motivo del ajuste
            <textarea
              aria-label="Motivo del ajuste"
              className={inputClassName}
              onChange={(event) =>
                setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))
              }
              required
              rows={3}
              value={adjustmentForm.reason}
            />
          </label>
        </div>

        {createAdjustment.isError ? (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-900">
            {getErrorDescription(createAdjustment.error)}
          </p>
        ) : null}
        {createAdjustment.isSuccess ? (
          <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
            Ajuste registrado y dashboard listo para recalcularse.
          </p>
        ) : null}

        <button
          className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          disabled={createAdjustment.isPending}
          type="submit"
        >
          Registrar ajuste
        </button>
      </form>
    </div>
  );
};
