import { cn } from '@/lib/utils';

import { statusLabels } from '../customers-utils';
import type { CustomerStatus } from '../types';

const statusStyles: Record<CustomerStatus, string> = {
  nuevo: 'bg-sky-100 text-sky-900 ring-sky-200',
  activo: 'bg-success/15 text-success ring-success/25',
  recurrente: 'bg-success/20 text-[#3f5230] ring-success/30',
  frecuente: 'bg-[#e8efe0] text-success ring-success/20',
  inactivo: 'bg-muted text-muted-foreground ring-border',
  mayorista: 'bg-[#f0e2d6] text-[#6b4428] ring-[#d4b89a]',
  'con-deuda': 'bg-red-100 text-red-900 ring-red-200',
  'para-reactivar': 'bg-amber-100 text-amber-950 ring-amber-200',
};

type StatusBadgeProps = {
  status: CustomerStatus;
  className?: string;
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => (
  <span
    className={cn(
      'inline-flex h-[1.45rem] w-fit items-center justify-center rounded-full px-2.5 text-[0.7rem] font-black leading-none ring-1',
      statusStyles[status],
      className,
    )}
  >
    {statusLabels[status]}
  </span>
);
