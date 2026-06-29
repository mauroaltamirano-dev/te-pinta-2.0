import { Banknote, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import type { FinanceWallet } from '../../finance/types';
import { formatMoney } from '../dashboard-utils';
import type { DashboardWallet, DashboardWalletStatus } from '../dashboard.mock';
import { SectionCard, StatusBadge } from './shared';

const walletStatusLabels: Record<DashboardWalletStatus, string> = {
  correct: 'Correcto',
  low: 'Bajo',
  critical: 'Crítico',
};

const walletStatusClasses: Record<DashboardWalletStatus, string> = {
  correct: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  low: 'bg-amber-50 text-amber-800 ring-amber-100',
  critical: 'bg-red-50 text-red-800 ring-red-100',
};

const walletLedgerParams: Record<string, FinanceWallet> = {
  'base-cost': 'production_cost',
  production_cost: 'production_cost',
  services: 'services',
  profit: 'profit',
};

const getWalletLedgerPath = (wallet: DashboardWallet): string => {
  const ledgerWallet = walletLedgerParams[wallet.id] ?? 'production_cost';

  return `/finanzas?section=ledger&wallet=${ledgerWallet}`;
};

const WalletCard = ({ wallet }: { wallet: DashboardWallet }) => (
  <article className="snap-start rounded-[1.35rem] border border-border/70 bg-background/70 p-3 lg:p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-black text-foreground">{wallet.title}</h3>
        <p className="mt-1 hidden text-xs font-bold text-muted-foreground lg:block">
          {wallet.description}
        </p>
      </div>
      <StatusBadge
        tone={
          wallet.status === 'correct' ? 'success' : wallet.status === 'low' ? 'warning' : 'danger'
        }
      >
        {walletStatusLabels[wallet.status]}
      </StatusBadge>
    </div>
    <p className="mt-3 font-sans text-2xl font-black text-foreground tabular-nums lg:mt-4 lg:text-3xl">
      {formatMoney(wallet.amount)}
    </p>
    <p className="mt-1 text-sm font-black text-muted-foreground">
      {wallet.percent}% del total asignado
    </p>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-border/70 lg:mt-4 lg:h-3">
      <div
        className={cn(
          'h-full rounded-full',
          wallet.status === 'correct'
            ? 'bg-success'
            : wallet.status === 'low'
              ? 'bg-warning'
              : 'bg-destructive',
        )}
        style={{ width: `${Math.max(Math.min(wallet.progress, 100), 0)}%` }}
      />
    </div>
    <p className="mt-2 text-xs font-black text-foreground lg:mt-3">{wallet.objectiveLabel}</p>
    <p className={cn('mt-1 text-xs font-bold', walletStatusClasses[wallet.status])}>
      {wallet.differenceLabel}
    </p>
    <Link
      className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary/10 px-3 text-xs font-black text-primary ring-1 ring-primary/15 transition hover:bg-primary/15 lg:mt-4"
      to={getWalletLedgerPath(wallet)}
    >
      Ver movimientos de {wallet.title}
    </Link>
  </article>
);

export const WalletsSummary = ({ wallets }: { wallets: DashboardWallet[] }) => (
  <SectionCard className="order-5 p-3 lg:p-5">
    <div className="mb-3 flex flex-col gap-2 lg:mb-5 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Wallet className="size-4" aria-hidden /> Billeteras internas
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-foreground lg:text-2xl">
          Dinero asignado, no solo caja
        </h2>
        <p className="mt-1 hidden text-sm font-semibold text-muted-foreground lg:block">
          Estos saldos representan reservas internas. Cuando conectemos medios de pago, conviene
          separar caja real de dinero asignado.
        </p>
      </div>
      <span className="hidden w-fit items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-black text-sidebar ring-1 ring-border/70 lg:inline-flex">
        <Banknote className="size-3.5" aria-hidden /> Estructura lista para backend
      </span>
    </div>
    <div className="-mx-3 grid snap-x snap-mandatory grid-flow-col auto-cols-[85%] gap-2 overflow-x-auto px-3 pb-1 lg:mx-0 lg:grid-flow-row lg:grid-cols-3 lg:px-0">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </div>
  </SectionCard>
);
