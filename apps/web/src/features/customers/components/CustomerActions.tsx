import { ClipboardList, Eye, MessageCircle, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { buildWhatsAppHref } from '../customers-utils';
import type { CustomerProfile } from '../types';

type CustomerActionsProps = {
  profile: CustomerProfile;
  onViewDetail?: () => void;
  onEdit?: () => void;
  compact?: boolean;
  className?: string;
};

const actionButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-black text-foreground transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98]';

export const CustomerActions = ({
  profile,
  onViewDetail,
  onEdit,
  compact = false,
  className,
}: CustomerActionsProps) => {
  const whatsappHref = profile.phone ? buildWhatsAppHref(profile.phone) : '';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onViewDetail ? (
        <button
          aria-label={`Ver detalle de ${profile.name}`}
          className={actionButtonClass}
          onClick={(event) => {
            event.stopPropagation();
            onViewDetail();
          }}
          type="button"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {!compact ? 'Ver detalle' : null}
        </button>
      ) : null}

      <Link
        aria-label={`Crear pedido para ${profile.name}`}
        className={actionButtonClass}
        onClick={(event) => event.stopPropagation()}
        to="/orders"
      >
        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
        {!compact ? 'Crear pedido' : null}
      </Link>

      {whatsappHref ? (
        <a
          aria-label={`Enviar WhatsApp a ${profile.name}`}
          className={cn(actionButtonClass, 'text-success')}
          href={whatsappHref}
          onClick={(event) => event.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {!compact ? 'WhatsApp' : null}
        </a>
      ) : (
        <span
          className={cn(actionButtonClass, 'cursor-not-allowed opacity-50')}
          title="Sin teléfono cargado"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {!compact ? 'WhatsApp' : null}
        </span>
      )}

      {onEdit ? (
        <button
          aria-label={`Editar ${profile.name}`}
          className={actionButtonClass}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {!compact ? 'Editar' : null}
        </button>
      ) : null}
    </div>
  );
};
