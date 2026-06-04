import { Download, Plus, Search, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHero } from '@/components/layout/PageHero';

type CustomersHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onNewCustomer: () => void;
  resultCount: number;
};

export const CustomersHeader = ({
  search,
  onSearchChange,
  onNewCustomer,
  resultCount,
}: CustomersHeaderProps) => (
  <div className="space-y-4">
    <PageHero
      description="Gestioná compradores, historial de pedidos y comportamiento de compra."
      title="Clientes"
    >
      <button
        aria-label="Nuevo cliente"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
        onClick={onNewCustomer}
        type="button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Nuevo cliente</span>
        <span className="sm:hidden">Nuevo</span>
      </button>
      <Link
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-black text-white transition hover:bg-white/15 active:scale-[0.98]"
        to="/orders"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Crear pedido</span>
        <span className="sm:hidden">Pedido</span>
      </Link>
      <button
        aria-label="Exportar clientes"
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white/90 transition hover:bg-white/15 active:scale-[0.98]"
        title="Próximamente: exportación CSV"
        type="button"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Exportar</span>
      </button>
    </PageHero>

    <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/85 p-3 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <label className="text-sm font-bold text-foreground">
        Buscar clientes
        <span className="relative mt-2 block">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            aria-label="Buscar clientes"
            className="w-full rounded-full border border-border bg-white py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/20"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre, teléfono, barrio, nota o etiqueta"
            type="search"
            value={search}
          />
        </span>
      </label>
      <p className="text-xs font-bold text-muted-foreground md:text-right">
        {resultCount} resultado{resultCount === 1 ? '' : 's'}
      </p>
    </div>
  </div>
);
