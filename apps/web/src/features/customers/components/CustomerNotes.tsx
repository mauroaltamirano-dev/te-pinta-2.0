import { Plus, StickyNote } from 'lucide-react';

import type { CustomerProfile } from '../types';

type CustomerNotesProps = {
  profile: CustomerProfile;
};

export const CustomerNotes = ({ profile }: CustomerNotesProps) => (
  <section
    aria-label="Notas internas"
    className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-black uppercase tracking-wide text-foreground">Notas internas</h3>
      </div>
      <button
        aria-label="Agregar nota"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-black text-primary transition hover:bg-muted/50"
        type="button"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Agregar nota
      </button>
    </div>

    {profile.notes.length ? (
      <ul className="mt-4 space-y-2">
        {profile.notes.map((note) => (
          <li
            className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border/60"
            key={note.id}
          >
            {note.text}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-4 text-sm font-semibold text-muted-foreground">
        Este cliente no tiene notas internas.
      </p>
    )}
  </section>
);
