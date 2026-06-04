import { cn } from '@/lib/utils';

import { filterLabels } from '../customers-utils';
import type { CustomerFilterId } from '../types';

const filterOrder: CustomerFilterId[] = [
  'todos',
  'activos',
  'recurrentes',
  'nuevos',
  'inactivos',
  'mayoristas',
  'con-deuda',
  'para-reactivar',
];

type CustomerFiltersProps = {
  activeFilter: CustomerFilterId;
  onFilterChange: (filter: CustomerFilterId) => void;
  counts: Partial<Record<CustomerFilterId, number>>;
};

export const CustomerFilters = ({
  activeFilter,
  onFilterChange,
  counts,
}: CustomerFiltersProps) => (
  <div
    aria-label="Filtros de clientes"
    className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="tablist"
  >
    {filterOrder.map((filter) => {
      const count = counts[filter];
      const isActive = activeFilter === filter;

      return (
        <button
          aria-selected={isActive}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
            isActive
              ? 'bg-primary text-primary-foreground shadow-primary-glow'
              : 'border border-border bg-white text-foreground hover:bg-muted/60',
          )}
          key={filter}
          onClick={() => onFilterChange(filter)}
          role="tab"
          type="button"
        >
          {filterLabels[filter]}
          {typeof count === 'number' && filter !== 'todos' ? (
            <span className="ml-1.5 opacity-80">({count})</span>
          ) : null}
        </button>
      );
    })}
  </div>
);
