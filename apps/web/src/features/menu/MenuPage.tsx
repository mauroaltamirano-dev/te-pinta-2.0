import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  BarChart3,
  Calculator,
  CirclePause,
  CirclePlay,
  Edit3,
  PackagePlus,
  Plus,
  Search,
  Soup,
  Sparkles,
  Tags,
  TrendingUp,
  X,
} from 'lucide-react';

import type { CreateMenuItemInput } from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import { useDailyDashboard } from '../dashboard/dashboard-hooks';
import type { MenuItem } from './menu-api';
import { useCreateMenuItem, useMenuItems, useUpdateMenuItem } from './menu-hooks';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

type MenuFormState = {
  name: string;
  priceUnit: string;
  priceHalfDozen: string;
  priceDozen: string;
  costPerDozen: string;
  isActive: boolean;
};

const initialFormState: MenuFormState = {
  name: '',
  priceUnit: '0',
  priceHalfDozen: '0',
  priceDozen: '0',
  costPerDozen: '0',
  isActive: true,
};

const toNumber = (value: string): number => Number(value || 0);

const toCreateInput = (form: MenuFormState): CreateMenuItemInput => ({
  name: form.name,
  priceUnit: toNumber(form.priceUnit),
  priceHalfDozen: toNumber(form.priceHalfDozen),
  priceDozen: toNumber(form.priceDozen),
  costPerDozen: toNumber(form.costPerDozen),
  isActive: form.isActive,
});

const toFormState = (item: MenuItem): MenuFormState => ({
  name: item.name,
  priceUnit: String(item.priceUnit),
  priceHalfDozen: String(item.priceHalfDozen),
  priceDozen: String(item.priceDozen),
  costPerDozen: String(item.costPerDozen),
  isActive: item.isActive,
});

const formatMoney = (value: number): string => moneyFormatter.format(value);

const today = (): string => new Date().toISOString().slice(0, 10);

const formatDozenLabel = (quantity: number): string => {
  if (!quantity) return '0 docenas';
  const dozens = quantity / 12;
  const formatted = Number.isInteger(dozens)
    ? dozens.toLocaleString('es-AR')
    : dozens.toLocaleString('es-AR', { maximumFractionDigits: 2 });

  return `${formatted} ${dozens === 1 ? 'docena' : 'docenas'}`;
};

const menuStatusClassNames = {
  active: 'bg-emerald-600 text-white ring-1 ring-emerald-700/20',
  paused: 'bg-amber-500 text-white ring-1 ring-amber-600/20',
} as const;

const menuBadgeClassName =
  'inline-flex h-[1.45rem] w-fit items-center justify-center rounded-full px-2.5 text-[0.7rem] font-black leading-none';

const inputClassName =
  'mt-2 w-full rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const useIsDesktopPanel = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktop;
};

const MenuItemDetailAnalytics = ({
  item,
  quantitySoldToday,
}: {
  item: MenuItem;
  quantitySoldToday: number;
}) => {
  const marginPerDozen = item.priceDozen - item.costPerDozen;
  const marginPercent = item.priceDozen ? Math.round((marginPerDozen / item.priceDozen) * 100) : 0;
  const estimatedRevenue = (quantitySoldToday / 12) * item.priceDozen;
  const estimatedCost = (quantitySoldToday / 12) * item.costPerDozen;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/10">
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-wide">Vendidas hoy</p>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">
            {formatDozenLabel(quantitySoldToday)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {quantitySoldToday.toLocaleString('es-AR')} unidades registradas.
          </p>
        </article>

        <article className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-wide">Margen docena</p>
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-foreground">
            {formatMoney(marginPerDozen)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {marginPercent}% sobre precio de venta.
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Calculator className="h-4 w-4" aria-hidden="true" />
          <h3 className="text-sm font-black uppercase tracking-wide">Precios y costos</h3>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Unidad</dt>
            <dd className="font-black tabular-nums text-foreground">
              {formatMoney(item.priceUnit)}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">½ docena</dt>
            <dd className="font-black tabular-nums text-foreground">
              {formatMoney(item.priceHalfDozen)}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Docena</dt>
            <dd className="font-black tabular-nums text-foreground">
              {formatMoney(item.priceDozen)}
            </dd>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
            <dt className="font-bold text-muted-foreground">Costo doc.</dt>
            <dd className="font-black tabular-nums text-foreground">
              {formatMoney(item.costPerDozen)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm">
        <p className="font-black text-foreground">Estimación del día</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <p className="rounded-2xl bg-white/80 px-3 py-2 font-bold text-muted-foreground ring-1 ring-border/60">
            Venta estimada:{' '}
            <span className="font-black text-foreground">{formatMoney(estimatedRevenue)}</span>
          </p>
          <p className="rounded-2xl bg-white/80 px-3 py-2 font-bold text-muted-foreground ring-1 ring-border/60">
            Costo estimado:{' '}
            <span className="font-black text-foreground">{formatMoney(estimatedCost)}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export const MenuPage = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<MenuFormState>(initialFormState);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [recentlyEditedItemId, setRecentlyEditedItemId] = useState<string | null>(null);
  const formPanelRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const menuItemsQuery = useMenuItems();
  const dashboardQuery = useDailyDashboard({ date: today() });
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const isDesktopPanel = useIsDesktopPanel();
  const isSaving = createMenuItem.isPending || updateMenuItem.isPending;
  const allItems = menuItemsQuery.data ?? [];
  const editingItem = allItems.find((item) => item.id === editingItemId) ?? null;

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return allItems;
    }

    return allItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch));
  }, [allItems, search]);

  const menuStats = useMemo(() => {
    const active = allItems.filter((item) => item.isActive).length;
    const paused = allItems.length - active;
    const averageDozen = allItems.length
      ? Math.round(allItems.reduce((total, item) => total + item.priceDozen, 0) / allItems.length)
      : 0;
    const averageCost = allItems.length
      ? Math.round(allItems.reduce((total, item) => total + item.costPerDozen, 0) / allItems.length)
      : 0;

    return { active, averageCost, averageDozen, paused, total: allItems.length };
  }, [allItems]);

  const selectedItem = useMemo(() => {
    const selected = filteredItems.find((item) => item.id === selectedItemId);

    return selected ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedItemId]);

  const focusFormPanel = () => {
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    nameInputRef.current?.focus({ preventScroll: true });
  };

  const queueFocusFormPanel = () => {
    setTimeout(() => {
      focusFormPanel();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingItemId) {
      const savedItemId = editingItemId;
      await updateMenuItem.mutateAsync({
        id: savedItemId,
        updates: toCreateInput(form),
      });
      setEditingItemId(null);
      setIsCreating(false);
      setSelectedItemId(savedItemId);
      setRecentlyEditedItemId(savedItemId);
      setForm(initialFormState);
      if (isDesktopPanel) {
        itemRefs.current.get(savedItemId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const created = await createMenuItem.mutateAsync(toCreateInput(form));
    setIsCreating(false);
    setSelectedItemId(created.id);
    setRecentlyEditedItemId(created.id);
    setForm(initialFormState);
    if (isDesktopPanel) {
      itemRefs.current.get(created.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleEdit = (item: MenuItem) => {
    setIsCreating(false);
    setEditingItemId(item.id);
    setSelectedItemId(item.id);
    setRecentlyEditedItemId(null);
    setForm(toFormState(item));
    queueFocusFormPanel();
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setIsCreating(false);
    setForm(initialFormState);
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsCreating(false);
    setEditingItemId(null);
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectItemKeyDown = (event: KeyboardEvent<HTMLElement>, itemId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    handleSelectItem(itemId);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingItemId(null);
    setRecentlyEditedItemId(null);
    setForm(initialFormState);
    queueFocusFormPanel();
  };

  const setItemRef = (id: string) => (node: HTMLElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
      return;
    }

    itemRefs.current.delete(id);
  };

  const panelItem = isDesktopPanel ? selectedItem : selectedItemId ? selectedItem : null;
  const panelItemQuantitySoldToday = panelItem
    ? (dashboardQuery.data?.topVarieties.find((variety) => variety.menuItemId === panelItem.id)
        ?.quantity ?? 0)
    : 0;
  const hasSidePanel = Boolean(editingItem || isCreating || panelItem);
  const panelLabel =
    editingItemId || isCreating
      ? editingItemId
        ? 'Formulario de edición de variedad'
        : 'Formulario de nueva variedad'
      : 'Detalle de variedad seleccionada';

  const closeMobilePanel = () => {
    setSelectedItemId(null);
    setEditingItemId(null);
    setIsCreating(false);
    setForm(initialFormState);
  };

  return (
    <div
      className={[
        'animate-fade-in',
        hasSidePanel
          ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]'
          : 'space-y-6',
      ].join(' ')}
    >
      <div className="min-w-0 space-y-6">
        <PageHero
          title="Menú"
          description="Gestioná variedades, precios de venta, costos y estado activo."
        >
          <button
            aria-label="+ Nueva variedad"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
            onClick={handleStartCreate}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva variedad
          </button>
        </PageHero>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Tags className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Variedades
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {menuStats.total}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              {filteredItems.length} visibles con el filtro actual.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CirclePlay className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Activas
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {menuStats.active}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Disponibles para nuevos pedidos.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <CirclePause className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Pausadas
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {menuStats.paused}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Ocultas del flujo de venta.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Prom. docena
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {formatMoney(menuStats.averageDozen)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Costo prom.: {formatMoney(menuStats.averageCost)}.
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm font-bold text-foreground">
              Buscar variedad
              <span className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-full border border-border bg-white py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ej: carne, humita..."
                  type="search"
                  value={search}
                />
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full bg-foreground/5 px-3 py-2 text-xs font-black text-muted-foreground ring-1 ring-border/80">
                {filteredItems.length} resultados
              </span>
              {search ? (
                <button
                  className="rounded-full border border-border bg-white px-4 py-2 text-xs font-black text-primary transition hover:bg-muted/50 active:scale-[0.98]"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  Limpiar filtro
                </button>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground">Catálogo de variedades</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Tocá una variedad para revisar precios o editarla.
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50 active:scale-[0.98]"
                onClick={handleStartCreate}
                type="button"
              >
                <PackagePlus className="h-4 w-4" aria-hidden="true" />+ Nueva variedad
              </button>
            </div>

            {menuItemsQuery.isLoading ? (
              <p className="mt-6 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground">
                Cargando menú...
              </p>
            ) : null}

            {menuItemsQuery.isError ? (
              <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                No se pudo cargar el menú.
              </p>
            ) : null}

            <div className="mt-5 grid gap-3">
              {filteredItems.map((item) => {
                const margin = item.priceDozen - item.costPerDozen;
                const isSelected = selectedItem?.id === item.id;
                const isRecentlyEdited = item.id === recentlyEditedItemId;

                return (
                  <article
                    aria-label={`Variedad ${item.name}`}
                    className={`group cursor-pointer overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-card ${
                      isRecentlyEdited
                        ? 'border-primary ring-4 ring-primary/15'
                        : isSelected
                          ? 'border-primary/50 ring-2 ring-primary/10'
                          : 'border-border/80'
                    }`}
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    onKeyDown={(event) => handleSelectItemKeyDown(event, item.id)}
                    ref={setItemRef(item.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={`h-1.5 ${item.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <div className="p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary ring-1 ring-border/80">
                              <Soup className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <h3 className="text-lg font-black text-foreground">{item.name}</h3>
                            <span
                              className={`${menuBadgeClassName} ${
                                item.isActive
                                  ? menuStatusClassNames.active
                                  : menuStatusClassNames.paused
                              }`}
                            >
                              {item.isActive ? 'Activo' : 'Pausado'}
                            </span>
                          </div>

                          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                                Unidad
                              </dt>
                              <dd className="mt-1 font-black tabular-nums text-foreground">
                                {formatMoney(item.priceUnit)}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                                ½ docena
                              </dt>
                              <dd className="mt-1 font-black tabular-nums text-foreground">
                                {formatMoney(item.priceHalfDozen)}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                                Docena
                              </dt>
                              <dd className="mt-1 font-black tabular-nums text-foreground">
                                {formatMoney(item.priceDozen)}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-border/60">
                              <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                                Costo doc.
                              </dt>
                              <dd className="mt-1 font-black tabular-nums text-foreground">
                                {formatMoney(item.costPerDozen)}
                              </dd>
                            </div>
                            <div className="rounded-2xl bg-primary/5 px-3 py-2 ring-1 ring-primary/10">
                              <dt className="text-xs font-black uppercase tracking-wide text-primary">
                                Margen
                              </dt>
                              <dd className="mt-1 font-black tabular-nums text-foreground">
                                {formatMoney(margin)}
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
                          <button
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                            disabled={isSaving}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEdit(item);
                            }}
                            type="button"
                          >
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                            Editar
                          </button>
                          <button
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto"
                            disabled={isSaving}
                            onClick={(event) => {
                              event.stopPropagation();
                              updateMenuItem.mutate({
                                id: item.id,
                                updates: { isActive: !item.isActive },
                              });
                            }}
                            type="button"
                          >
                            {item.isActive ? (
                              <CirclePause className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <CirclePlay className="h-4 w-4" aria-hidden="true" />
                            )}
                            {item.isActive ? 'Pausar' : 'Activar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>

      {hasSidePanel && isDesktopPanel && (
        <aside
          aria-label={panelLabel}
          className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5 lg:sticky lg:top-0 lg:-my-6 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-r-0 lg:bg-card lg:shadow-2xl"
          ref={formPanelRef}
          role="region"
        >
          {editingItem || isCreating ? (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PackagePlus className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {editingItem ? `Editando ${editingItem.name}` : 'Nueva variedad'}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {editingItem
                      ? 'Corregí nombre, precios, costo o estado.'
                      : 'Cargá una nueva variedad para que aparezca en pedidos.'}
                  </p>
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-foreground">
                  Nombre de variedad
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    ref={nameInputRef}
                    required
                    value={form.name}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="block text-sm font-bold text-foreground">
                    Precio unidad
                    <input
                      className={inputClassName}
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, priceUnit: event.target.value }))
                      }
                      required
                      type="number"
                      value={form.priceUnit}
                    />
                  </label>

                  <label className="block text-sm font-bold text-foreground">
                    Precio media docena
                    <input
                      className={inputClassName}
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priceHalfDozen: event.target.value,
                        }))
                      }
                      required
                      type="number"
                      value={form.priceHalfDozen}
                    />
                  </label>

                  <label className="block text-sm font-bold text-foreground">
                    Precio docena
                    <input
                      className={inputClassName}
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, priceDozen: event.target.value }))
                      }
                      required
                      type="number"
                      value={form.priceDozen}
                    />
                  </label>

                  <label className="block text-sm font-bold text-foreground">
                    Costo por docena
                    <input
                      className={inputClassName}
                      min="0"
                      onChange={(event) =>
                        setForm((current) => ({ ...current, costPerDozen: event.target.value }))
                      }
                      type="number"
                      value={form.costPerDozen}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm font-bold text-foreground shadow-sm">
                  <input
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  Activa para nuevos pedidos
                </label>

                {createMenuItem.isError || updateMenuItem.isError ? (
                  <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    No se pudo guardar la variedad.
                  </p>
                ) : null}

                {editingItemId ? (
                  <button
                    className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-black text-primary transition hover:bg-muted/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSaving}
                    onClick={handleCancelEdit}
                    type="button"
                  >
                    Cancelar edición
                  </button>
                ) : null}

                <button
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? 'Guardando...'
                    : editingItemId
                      ? 'Guardar cambios'
                      : 'Guardar variedad'}
                </button>
              </form>
            </>
          ) : panelItem ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-foreground">Detalle de variedad</h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    Vista rápida para operación y precios.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-black text-foreground">{panelItem.name}</p>
                  <span
                    className={`${menuBadgeClassName} ${
                      panelItem.isActive ? menuStatusClassNames.active : menuStatusClassNames.paused
                    }`}
                  >
                    {panelItem.isActive ? 'Activo' : 'Pausado'}
                  </span>
                </div>
              </div>
              <MenuItemDetailAnalytics
                item={panelItem}
                quantitySoldToday={panelItemQuantitySoldToday}
              />
              <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto xl:w-full"
                  onClick={() => handleEdit(panelItem)}
                  type="button"
                >
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  Editar variedad
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50 active:scale-[0.98] sm:w-auto xl:w-full"
                  onClick={handleStartCreate}
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />+ Nueva variedad
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-black text-foreground">Menú sin resultados</h2>
              <p className="text-sm font-medium text-muted-foreground">
                No hay variedades para mostrar con ese filtro.
              </p>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
                onClick={handleStartCreate}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />+ Nueva variedad
              </button>
            </div>
          )}
        </aside>
      )}

      {hasSidePanel &&
        !isDesktopPanel &&
        createPortal(
          <section
            aria-label={panelLabel}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4 animate-fade-in"
            role="region"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                aria-label="Volver"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
                onClick={closeMobilePanel}
                type="button"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                aria-label="Cerrar"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-foreground"
                onClick={closeMobilePanel}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card">
              {/* mobile panel uses the same content as desktop */}
              {editingItem || isCreating ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <PackagePlus className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-foreground">
                        {editingItem ? `Editando ${editingItem.name}` : 'Nueva variedad'}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {editingItem
                          ? 'Corregí nombre, precios, costo o estado.'
                          : 'Cargá una nueva variedad para que aparezca en pedidos.'}
                      </p>
                    </div>
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                    <label className="block text-sm font-bold text-foreground">
                      Nombre de variedad
                      <input
                        className={inputClassName}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                        ref={nameInputRef}
                        required
                        value={form.name}
                      />
                    </label>

                    <label className="block text-sm font-bold text-foreground">
                      Precio unidad
                      <input
                        className={inputClassName}
                        min="0"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, priceUnit: event.target.value }))
                        }
                        required
                        type="number"
                        value={form.priceUnit}
                      />
                    </label>
                    <label className="block text-sm font-bold text-foreground">
                      Precio media docena
                      <input
                        className={inputClassName}
                        min="0"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, priceHalfDozen: event.target.value }))
                        }
                        required
                        type="number"
                        value={form.priceHalfDozen}
                      />
                    </label>
                    <label className="block text-sm font-bold text-foreground">
                      Precio docena
                      <input
                        className={inputClassName}
                        min="0"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, priceDozen: event.target.value }))
                        }
                        required
                        type="number"
                        value={form.priceDozen}
                      />
                    </label>
                    <label className="block text-sm font-bold text-foreground">
                      Costo por docena
                      <input
                        className={inputClassName}
                        min="0"
                        onChange={(event) =>
                          setForm((current) => ({ ...current, costPerDozen: event.target.value }))
                        }
                        type="number"
                        value={form.costPerDozen}
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm font-bold text-foreground shadow-sm">
                      <input
                        checked={form.isActive}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                        type="checkbox"
                      />
                      Activa para nuevos pedidos
                    </label>
                    <button
                      className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving
                        ? 'Guardando...'
                        : editingItemId
                          ? 'Guardar cambios'
                          : 'Guardar variedad'}
                    </button>
                  </form>
                </>
              ) : panelItem ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-foreground">Detalle de variedad</h2>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        Vista rápida para operación y precios.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-black text-foreground">{panelItem.name}</p>
                      <span
                        className={`${menuBadgeClassName} ${
                          panelItem.isActive
                            ? menuStatusClassNames.active
                            : menuStatusClassNames.paused
                        }`}
                      >
                        {panelItem.isActive ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                  </div>
                  <MenuItemDetailAnalytics
                    item={panelItem}
                    quantitySoldToday={panelItemQuantitySoldToday}
                  />
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
                    onClick={() => handleEdit(panelItem)}
                    type="button"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Editar variedad
                  </button>
                </div>
              ) : null}
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
};
