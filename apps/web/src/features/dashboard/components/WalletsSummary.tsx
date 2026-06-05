import { Banknote, Wallet } from 'lucide-react';

import { cn } from '@/lib/utils';

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

const WalletCard = ({ wallet }: { wallet: DashboardWallet }) => (
  <article className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-black text-foreground">{wallet.title}</h3>
        <p className="mt-1 text-xs font-bold text-muted-foreground">{wallet.description}</p>
      </div>
      <StatusBadge
        tone={
          wallet.status === 'correct' ? 'success' : wallet.status === 'low' ? 'warning' : 'danger'
        }
      >
        {walletStatusLabels[wallet.status]}
      </StatusBadge>
    </div>
    <p className="mt-4 font-sans text-3xl font-black text-foreground tabular-nums">
      {formatMoney(wallet.amount)}
    </p>
    <p className="mt-1 text-sm font-black text-muted-foreground">
      {wallet.percent}% del total asignado
    </p>
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-border/70">
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
    <p className="mt-3 text-xs font-black text-foreground">{wallet.objectiveLabel}</p>
    <p className={cn('mt-1 text-xs font-bold', walletStatusClasses[wallet.status])}>
      {wallet.differenceLabel}
    </p>
  </article>
);

export const WalletsSummary = ({ wallets }: { wallets: DashboardWallet[] }) => (
  <SectionCard className="order-5">
    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
          <Wallet className="size-4" aria-hidden /> Billeteras internas
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
          Dinero asignado, no solo caja
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Estos saldos representan reservas internas. Cuando conectemos medios de pago, conviene
          separar caja real de dinero asignado.
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-black text-sidebar ring-1 ring-border/70">
        <Banknote className="size-3.5" aria-hidden /> Estructura lista para backend
      </span>
    </div>
    <div className="grid gap-3 lg:grid-cols-3">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </div>
  </SectionCard>
);
