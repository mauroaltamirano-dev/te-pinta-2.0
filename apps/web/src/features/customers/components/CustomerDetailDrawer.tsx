import { ArrowLeft, MapPin, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import type { FormEvent, RefObject } from 'react';

import { cn } from '@/lib/utils';

import { CustomerActions } from './CustomerActions';
import { CustomerFavoriteVarieties } from './CustomerFavoriteVarieties';
import { CustomerNotes } from './CustomerNotes';
import { CustomerPendingBox } from './CustomerPendingBox';
import { CustomerPurchaseHistory } from './CustomerPurchaseHistory';
import { CustomerStats } from './CustomerStats';
import { StatusBadge } from './StatusBadge';
import {
  buildPhoneHref,
  buildWhatsAppHref,
  formatShortDate,
} from '../customers-utils';
import type { CustomerProfile } from '../types';

export type CustomerFormState = {
  name: string;
  phone: string;
  address: string;
};

type CustomerDetailDrawerProps = {
  profile: CustomerProfile | null;
  isCreating: boolean;
  form: CustomerFormState;
  onFormChange: (form: CustomerFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  isSaving: boolean;
  isError: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  panelRef: RefObject<HTMLElement | null>;
  showCloseButton?: boolean;
  layout?: 'embedded' | 'overlay';
  className?: string;
};

const inputClassName =
  'mt-2 w-full rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

export const CustomerDetailDrawer = ({
  profile,
  isCreating,
  form,
  onFormChange,
  onSubmit,
  onClose,
  isSaving,
  isError,
  nameInputRef,
  panelRef,
  showCloseButton = true,
  layout = 'embedded',
  className,
}: CustomerDetailDrawerProps) => {
  const whatsappHref = profile?.phone ? buildWhatsAppHref(profile.phone) : '';
  const isOverlay = layout === 'overlay';

  return (
    <aside
      aria-label={
        profile ? `Detalle de ${profile.name}` : isCreating ? 'Nuevo cliente' : 'Panel de cliente'
      }
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-5',
        isOverlay ? 'bg-card' : 'rounded-2xl border border-border/70 bg-white/85 shadow-card',
        className,
      )}
      ref={panelRef}
      role="region"
    >
      {showCloseButton ? (
        <div className="flex shrink-0 items-center justify-between gap-2">
          {!isOverlay ? (
            <button
              aria-label="Volver"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">
              {profile ? 'Ficha de cliente' : 'Nuevo cliente'}
            </p>
          )}
          <button
            aria-label="Cerrar panel"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {profile ? (
        <>
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black text-foreground">{profile.name}</h2>
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.displayStatuses.map((status) => (
                    <StatusBadge key={status} status={status} />
                  ))}
                </div>
              </div>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                <MessageCircle className="h-4 w-4 text-success" aria-hidden="true" />
                <dt className="sr-only">WhatsApp</dt>
                <dd className="font-black text-foreground">
                  {profile.phone ? (
                    <a className="hover:underline" href={whatsappHref} rel="noreferrer" target="_blank">
                      WhatsApp: {profile.phone}
                    </a>
                  ) : (
                    'Sin teléfono cargado'
                  )}
                </dd>
              </div>
              {profile.phone ? (
                <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                  <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <dd>
                    <a className="font-semibold hover:underline" href={buildPhoneHref(profile.phone)}>
                      Llamar
                    </a>
                  </dd>
                </div>
              ) : null}
              <div className="flex items-start gap-2 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <dd className="font-semibold text-muted-foreground">
                  {profile.address ?? 'Sin dirección cargada'}
                  {profile.neighborhood ? (
                    <span className="mt-1 block font-black text-foreground">
                      Barrio: {profile.neighborhood}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                <dt className="font-bold text-muted-foreground">Alta</dt>
                <dd className="font-black">{formatShortDate(profile.createdAt)}</dd>
              </div>
            </dl>

            {profile.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.tags.map((tag) => (
                  <span
                    className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-black uppercase text-muted-foreground"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {profile.isForReactivation ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
                Cliente frecuente inactivo. Podés enviarle un mensaje para volver a ofrecerle.
              </p>
            ) : null}

            <div className="mt-4">
              <CustomerActions onEdit={() => nameInputRef.current?.focus()} profile={profile} />
            </div>
          </div>

          <CustomerStats profile={profile} />
          <CustomerFavoriteVarieties profile={profile} />
          <CustomerPurchaseHistory profile={profile} />
          <CustomerPendingBox profile={profile} />
          <CustomerNotes profile={profile} />
        </>
      ) : isCreating ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm font-semibold text-muted-foreground">
          Completá los datos para guardar un nuevo contacto en la base.
        </p>
      ) : null}

      <form className="space-y-4 border-t border-border/70 pt-4" onSubmit={onSubmit}>
        <h3 className="text-sm font-black uppercase tracking-wide text-foreground">
          {profile ? `Editar ${profile.name}` : 'Nuevo cliente'}
        </h3>

        <label className="block text-sm font-bold text-foreground">
          Nombre del cliente
          <input
            className={inputClassName}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            ref={nameInputRef}
            required
            value={form.name}
          />
        </label>

        <label className="block text-sm font-bold text-foreground">
          Teléfono
          <input
            className={inputClassName}
            onChange={(event) => onFormChange({ ...form, phone: event.target.value })}
            type="tel"
            value={form.phone}
          />
        </label>

        <label className="block text-sm font-bold text-foreground">
          Dirección
          <input
            className={inputClassName}
            onChange={(event) => onFormChange({ ...form, address: event.target.value })}
            value={form.address}
          />
        </label>

        {isError ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            No se pudo guardar el cliente.
          </p>
        ) : null}

        <button
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? 'Guardando...' : profile ? 'Guardar cambios' : 'Guardar cliente'}
        </button>
      </form>
    </aside>
  );
};
