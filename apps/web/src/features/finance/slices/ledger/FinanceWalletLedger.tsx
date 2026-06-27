import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CircleDollarSign, SlidersHorizontal } from 'lucide-react';

import { FinanceTable, type FinanceTableColumn } from '../../components/FinanceTable';
import { MetricCard } from '../../components/MetricCard';
import { useCreateFinanceWalletAdjustment, useFinanceWalletMovements } from '../../hooks';
import type {
  CreateFinanceWalletAdjustmentInput,
  FinanceWallet,
  FinanceWalletMovement,
  FinanceWalletMovementDirection,
  FinanceWalletMovementFilters,
  FinanceWalletMovementSourceType,
} from '../../types';

type FinanceWalletLedgerProps = {
  initialWallet?: FinanceWallet;
};

type AdjustableFinanceWallet = CreateFinanceWalletAdjustmentInput['wallet'];

type WalletFilterState = {
  wallet: FinanceWallet | '';
  direction: FinanceWalletMovementDirection | '';
  sourceType: FinanceWalletMovementSourceType | '';
  sourceId: string;
  from: string;
  to: string;
};

type AdjustmentFormState = {
  wallet: AdjustableFinanceWallet;
  direction: FinanceWalletMovementDirection;
  amount: string;
  reason: string;
  occurredAt: string;
};

type WalletMovementGroup = {
  id: string;
  sourceType: FinanceWalletMovementSourceType;
  sourceId: string;
  occurredAt: string;
  movements: FinanceWalletMovement[];
};

const MOVEMENT_GROUPS_PAGE_SIZE = 20;

const walletLabels: Record<AdjustableFinanceWallet, string> = {
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

const wallets = Object.keys(walletLabels) as AdjustableFinanceWallet[];
const directions = Object.keys(directionLabels) as FinanceWalletMovementDirection[];
const sourceTypes = Object.keys(sourceTypeLabels) as FinanceWalletMovementSourceType[];

const isAdjustableWallet = (wallet: FinanceWallet): wallet is AdjustableFinanceWallet =>
  wallet in walletLabels;

const walletLabel = (wallet: FinanceWallet): string =>
  isAdjustableWallet(wallet) ? walletLabels[wallet] : wallet;

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

const sourceCode = (sourceId: string): string => {
  const segment = sourceId.split(/[-_]/).filter(Boolean).at(-1) ?? sourceId;

  return segment.slice(-6).toUpperCase();
};

const formatSource = (group: WalletMovementGroup): string => {
  const prefix =
    group.sourceType === 'sale'
      ? 'Pedido'
      : group.sourceType === 'purchase'
        ? 'Compra'
        : 'Ajuste';

  return `${prefix} #${sourceCode(group.sourceId)}`;
};

const groupWalletMovements = (movements: FinanceWalletMovement[]): WalletMovementGroup[] => {
  const groups = new Map<string, WalletMovementGroup>();

  for (const movement of movements) {
    const id = `${movement.sourceType}:${movement.sourceId}`;
    const group = groups.get(id);

    if (group) {
      group.movements.push(movement);
    } else {
      groups.set(id, {
        id,
        sourceType: movement.sourceType,
        sourceId: movement.sourceId,
        occurredAt: movement.occurredAt,
        movements: [movement],
      });
    }
  }

  return [...groups.values()].sort(
    (left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) || right.id.localeCompare(left.id),
  );
};

const groupReason = (group: WalletMovementGroup): string => {
  if (group.sourceType === 'sale') return 'Distribución de venta';

  return group.movements[0]?.reason ?? '—';
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

const initialAdjustmentForm = (wallet: FinanceWallet = 'production_cost'): AdjustmentFormState => {
  const adjustmentWallet = isAdjustableWallet(wallet) ? wallet : 'production_cost';

  return {
    wallet: adjustmentWallet,
    direction: 'credit',
    amount: '0',
    reason: '',
    occurredAt: '',
  };
};

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
  const [movementPage, setMovementPage] = useState(1);
  const filters = useMemo(() => buildFilters(filterState), [filterState]);
  const movementsQuery = useFinanceWalletMovements(filters);
  const createAdjustment = useCreateFinanceWalletAdjustment();
  const ledger = movementsQuery.data;
  const movementGroups = useMemo(
    () => groupWalletMovements(ledger?.movements ?? []),
    [ledger?.movements],
  );
  const totalMovementPages = Math.max(
    1,
    Math.ceil(movementGroups.length / MOVEMENT_GROUPS_PAGE_SIZE),
  );
  const currentMovementPage = Math.min(movementPage, totalMovementPages);
  const visibleMovementGroups = movementGroups.slice(
    (currentMovementPage - 1) * MOVEMENT_GROUPS_PAGE_SIZE,
    currentMovementPage * MOVEMENT_GROUPS_PAGE_SIZE,
  );

  useEffect(() => {
    if (!initialWallet) return;

    setFilterState((current) =>
      current.wallet === initialWallet ? current : { ...current, wallet: initialWallet },
    );
    setAdjustmentForm((current) =>
      current.wallet === initialWallet || !isAdjustableWallet(initialWallet)
        ? current
        : { ...current, wallet: initialWallet },
    );
  }, [initialWallet]);

  useEffect(() => {
    setMovementPage(1);
  }, [filters]);

  const columns: FinanceTableColumn<WalletMovementGroup>[] = [
    {
      id: 'date',
      header: 'Fecha',
      render: (group) => formatDate(group.occurredAt),
    },
    {
      id: 'source',
      header: 'Origen',
      render: (group) => <span title={group.sourceId}>{formatSource(group)}</span>,
    },
    {
      id: 'distribution',
      header: 'Distribución',
      render: (group) => (
        <div className="space-y-1">
          {group.movements.map((movement) => (
            <div className="flex items-center justify-between gap-4" key={movement.id}>
              <span className="font-bold">{walletLabel(movement.wallet)}</span>
              <span className="whitespace-nowrap text-muted-foreground">
                {formatSignedMoneyFromCents(movement.signedAmountCents)}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Total',
      align: 'right',
      render: (group) =>
        formatSignedMoneyFromCents(
          group.movements.reduce((total, movement) => total + movement.signedAmountCents, 0),
        ),
    },
    {
      id: 'reason',
      header: 'Motivo',
      render: groupReason,
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
                  {walletLabel(wallet)}
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="min-w-0 space-y-3">
          <FinanceTable
            ariaLabel="Movimientos de billetera"
            caption={
              movementsQuery.isLoading
                ? 'Cargando movimientos...'
                : `${movementGroups.length} operación(es) · ${ledger?.movements.length ?? 0} movimiento(s)`
            }
            columns={columns}
            emptyState="No hay movimientos para los filtros seleccionados."
            getRowKey={(group) => group.id}
            rows={visibleMovementGroups}
          />

          {movementGroups.length > MOVEMENT_GROUPS_PAGE_SIZE ? (
            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/85 p-3 text-sm font-bold text-muted-foreground shadow-card">
              <span>
                Página {currentMovementPage} de {totalMovementPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-foreground disabled:opacity-45"
                  disabled={currentMovementPage === 1}
                  onClick={() => setMovementPage((page) => Math.max(1, page - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-foreground disabled:opacity-45"
                  disabled={currentMovementPage === totalMovementPages}
                  onClick={() => setMovementPage((page) => Math.min(totalMovementPages, page + 1))}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <form
          className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-card xl:sticky xl:top-4"
          onSubmit={handleAdjustmentSubmit}
        >
          <div className="flex items-center gap-2 text-primary">
            <CircleDollarSign className="h-4 w-4" aria-hidden={true} />
            <h3 className="text-sm font-black uppercase tracking-wide">Ajuste manual</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="text-sm font-bold text-foreground">
              Billetera del ajuste
              <select
                aria-label="Billetera del ajuste"
                className={`${inputClassName} appearance-none`}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    wallet: event.target.value as AdjustableFinanceWallet,
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

            <label className="text-sm font-bold text-foreground sm:col-span-2 xl:col-span-1">
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
            className="mt-4 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={createAdjustment.isPending}
            type="submit"
          >
            Registrar ajuste
          </button>
        </form>
      </div>
    </div>
  );
};
