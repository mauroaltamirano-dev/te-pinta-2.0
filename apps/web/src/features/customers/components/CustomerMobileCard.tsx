import { UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

import { CustomerActions } from './CustomerActions';
import { StatusBadge } from './StatusBadge';
import { formatMoney, formatRelativePurchaseDate } from '../customers-utils';
import type { CustomerProfile } from '../types';

type CustomerMobileCardProps = {
  profile: CustomerProfile;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

export const CustomerMobileCard = ({
  profile,
  selected,
  onSelect,
  onEdit,
}: CustomerMobileCardProps) => (
  <article
    aria-label={`Cliente ${profile.name}`}
    className={cn(
      'cursor-pointer rounded-2xl border bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card',
      selected ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border/80',
    )}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect();
      }
    }}
    role="button"
    tabIndex={0}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-foreground">{profile.name}</h3>
          <StatusBadge status={profile.status} />
        </div>
      </div>
    </div>

    <p className="mt-3 text-sm font-bold text-foreground">
      {profile.orderCount} pedido{profile.orderCount === 1 ? '' : 's'} ·{' '}
      {formatMoney(profile.totalPurchased)} comprados
    </p>
    <p className="mt-1 text-xs font-semibold text-muted-foreground">
      Última compra: {formatRelativePurchaseDate(profile.lastPurchaseAt)}
    </p>
    <p className="mt-1 text-xs font-semibold text-muted-foreground">
      Favorita: {profile.favoriteVariety}
    </p>
    {profile.debtAmount > 0 ? (
      <p className="mt-2 text-xs font-black text-red-800">
        Deuda: {formatMoney(profile.debtAmount)}
      </p>
    ) : null}

    <div className="mt-4 border-t border-border/60 pt-3">
      <CustomerActions compact onEdit={onEdit} onViewDetail={onSelect} profile={profile} />
    </div>
  </article>
);
