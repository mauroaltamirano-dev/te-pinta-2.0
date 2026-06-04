import { UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

import { CustomerActions } from './CustomerActions';
import { StatusBadge } from './StatusBadge';
import { formatMoney, formatRelativePurchaseDate } from '../customers-utils';
import type { CustomerProfile } from '../types';

type CustomersTableProps = {
  profiles: CustomerProfile[];
  selectedId: string | null;
  onSelect: (profile: CustomerProfile) => void;
  onEdit: (profile: CustomerProfile) => void;
};

export const CustomersTable = ({
  profiles,
  selectedId,
  onSelect,
  onEdit,
}: CustomersTableProps) => (
  <div className="overflow-hidden rounded-2xl border border-border/70 bg-white/85 shadow-card">
    <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-border/70 bg-muted/40 text-xs font-black uppercase tracking-wide text-muted-foreground">
          <th className="px-4 py-3" scope="col">
            Cliente
          </th>
          <th className="px-4 py-3" scope="col">
            Contacto
          </th>
          <th className="px-4 py-3" scope="col">
            Pedidos
          </th>
          <th className="px-4 py-3" scope="col">
            Total comprado
          </th>
          <th className="px-4 py-3" scope="col">
            Última compra
          </th>
          <th className="px-4 py-3" scope="col">
            Variedad favorita
          </th>
          <th className="px-4 py-3" scope="col">
            Estado
          </th>
          <th className="px-4 py-3 text-right" scope="col">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {profiles.map((profile) => (
          <tr
            aria-label={`Cliente ${profile.name}`}
            className={cn(
              'cursor-pointer border-b border-border/50 transition hover:bg-primary/5',
              selectedId === profile.id && 'bg-primary/8',
            )}
            key={profile.id}
            onClick={() => onSelect(profile)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(profile);
              }
            }}
            tabIndex={0}
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-primary">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-black text-foreground">{profile.name}</p>
                  {profile.neighborhood ? (
                    <p className="text-xs font-semibold text-muted-foreground">{profile.neighborhood}</p>
                  ) : null}
                </div>
              </div>
            </td>
            <td className="px-4 py-3 font-semibold text-muted-foreground">
              {profile.phone ? 'WhatsApp' : 'Sin teléfono'}
            </td>
            <td className="px-4 py-3 font-black tabular-nums">{profile.orderCount}</td>
            <td className="px-4 py-3 font-black tabular-nums">{formatMoney(profile.totalPurchased)}</td>
            <td className="px-4 py-3 font-semibold text-muted-foreground">
              {formatRelativePurchaseDate(profile.lastPurchaseAt)}
            </td>
            <td className="px-4 py-3 font-semibold">{profile.favoriteVariety}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {profile.displayStatuses.slice(0, 2).map((status) => (
                  <StatusBadge key={`${profile.id}-${status}`} status={status} />
                ))}
              </div>
            </td>
            <td className="px-4 py-3">
              <CustomerActions
                compact
                onEdit={() => onEdit(profile)}
                onViewDetail={() => onSelect(profile)}
                profile={profile}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
