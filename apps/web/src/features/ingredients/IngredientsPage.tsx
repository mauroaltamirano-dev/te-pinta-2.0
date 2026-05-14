import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  CircleDollarSign,
  PackagePlus,
  Plus,
  Scale,
  Search,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';

import type { CreateIngredientInput, IngredientUnit } from '@te-pinta/shared';

import type { Ingredient } from './ingredients-api';
import {
  useCreateIngredient,
  useDeleteIngredient,
  useIngredients,
  useUpdateIngredient,
} from './ingredients-hooks';

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: 'g', label: 'Gramos' },
  { value: 'kg', label: 'Kilos' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'l', label: 'Litros' },
  { value: 'u', label: 'Unidades' },
];

const unitLabels: Record<IngredientUnit, string> = {
  g: 'Gramos',
  kg: 'Kilos',
  ml: 'Mililitros',
  l: 'Litros',
  u: 'Unidades',
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoney = (value: number): string => moneyFormatter.format(value);

type IngredientFormState = {
  name: string;
  unit: IngredientUnit;
  purchasePrice: string;
};

const initialFormState: IngredientFormState = {
  name: '',
  unit: 'kg',
  purchasePrice: '0',
};

const toCreateInput = (form: IngredientFormState): CreateIngredientInput => ({
  name: form.name,
  unit: form.unit,
  purchasePrice: Number(form.purchasePrice || 0),
});

const toFormState = (ingredient: Ingredient): IngredientFormState => ({
  name: ingredient.name,
  unit: ingredient.unit,
  purchasePrice: String(ingredient.purchasePrice),
});

const inputClassName =
  'mt-2 w-full rounded-full border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const ingredientBadgeClassName =
  'inline-flex h-[1.45rem] w-fit items-center justify-center rounded-full px-2.5 text-[0.7rem] font-black leading-none';

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

export const IngredientsPage = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<IngredientFormState>(initialFormState);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const formPanelRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const ingredientsQuery = useIngredients();
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const deleteIngredient = useDeleteIngredient();
  const isDesktopPanel = useIsDesktopPanel();
  const allIngredients = ingredientsQuery.data ?? [];
  const selectedIngredient =
    allIngredients.find((ingredient) => ingredient.id === selectedIngredientId) ?? null;

  const filteredIngredients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return allIngredients;

    return allIngredients.filter((ingredient) =>
      `${ingredient.name} ${ingredient.unit} ${unitLabels[ingredient.unit]}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [allIngredients, search]);

  const ingredientStats = useMemo(() => {
    const averagePrice = allIngredients.length
      ? Math.round(
          allIngredients.reduce((total, ingredient) => total + ingredient.purchasePrice, 0) /
            allIngredients.length,
        )
      : 0;
    const expensive = [...allIngredients].sort((a, b) => b.purchasePrice - a.purchasePrice)[0];
    const unitCount = new Set(allIngredients.map((ingredient) => ingredient.unit)).size;

    return {
      total: allIngredients.length,
      visible: filteredIngredients.length,
      averagePrice,
      expensive,
      unitCount,
    };
  }, [allIngredients, filteredIngredients.length]);

  const focusFormPanel = () => {
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    nameInputRef.current?.focus({ preventScroll: true });
  };

  const handleStartCreate = () => {
    setSelectedIngredientId(null);
    setIsCreating(true);
    setForm(initialFormState);
    setTimeout(focusFormPanel, 0);
  };

  const handleSelectIngredient = (ingredient: Ingredient) => {
    setSelectedIngredientId(ingredient.id);
    setIsCreating(false);
    setForm(toFormState(ingredient));
    if (isDesktopPanel) {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const closeMobilePanel = () => {
    setSelectedIngredientId(null);
    setIsCreating(false);
    setForm(initialFormState);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedIngredientId) {
      await updateIngredient.mutateAsync({
        id: selectedIngredientId,
        updates: toCreateInput(form),
      });
      if (!isDesktopPanel) closeMobilePanel();
      return;
    }

    await createIngredient.mutateAsync(toCreateInput(form));
    setForm(initialFormState);
    if (!isDesktopPanel) closeMobilePanel();
  };

  const isMobilePanelOpen = !isDesktopPanel && (Boolean(selectedIngredient) || isCreating);
  const isSaving = createIngredient.isPending || updateIngredient.isPending;
  const panelLabel = selectedIngredient
    ? 'Formulario de edición de ingrediente'
    : 'Formulario de nuevo ingrediente';

  const renderPanelContent = () => (
    <>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PackagePlus className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-black text-foreground">
            {selectedIngredient ? `Editando ${selectedIngredient.name}` : 'Nuevo ingrediente'}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {selectedIngredient
              ? 'Actualizá unidad y precio de compra del insumo.'
              : 'Cargá insumos para mantener costos ordenados.'}
          </p>
        </div>
      </div>

      {selectedIngredient ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-black text-foreground">{selectedIngredient.name}</p>
              <span
                className={`${ingredientBadgeClassName} bg-primary text-primary-foreground ring-1 ring-primary/20`}
              >
                {unitLabels[selectedIngredient.unit]}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums text-foreground">
              {formatMoney(selectedIngredient.purchasePrice)}
              <span className="ml-1 text-sm font-bold text-muted-foreground">
                / {selectedIngredient.unit}
              </span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <article className="rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/10">
              <p className="text-xs font-black uppercase tracking-wide text-primary">Comparativo</p>
              <p className="mt-2 text-2xl font-black text-foreground tabular-nums">
                {ingredientStats.averagePrice
                  ? `${Math.round((selectedIngredient.purchasePrice / ingredientStats.averagePrice) * 100)}%`
                  : '0%'}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                del costo promedio de ingredientes.
              </p>
            </article>
            <article className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Costo por 10 {selectedIngredient.unit}
              </p>
              <p className="mt-2 text-2xl font-black text-foreground tabular-nums">
                {formatMoney(selectedIngredient.purchasePrice * 10)}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground">
                Referencia rápida para compras grandes.
              </p>
            </article>
          </div>
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-bold text-foreground">
          Nombre del ingrediente
          <input
            className={inputClassName}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            ref={nameInputRef}
            required
            value={form.name}
          />
        </label>

        <label className="block text-sm font-bold text-foreground">
          Unidad
          <select
            className={inputClassName}
            onChange={(event) =>
              setForm((current) => ({ ...current, unit: event.target.value as IngredientUnit }))
            }
            value={form.unit}
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-bold text-foreground">
          Precio de compra
          <input
            className={inputClassName}
            min="0"
            onChange={(event) =>
              setForm((current) => ({ ...current, purchasePrice: event.target.value }))
            }
            required
            type="number"
            value={form.purchasePrice}
          />
        </label>

        {createIngredient.isError || updateIngredient.isError ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            No se pudo guardar el ingrediente.
          </p>
        ) : null}

        <button
          className="w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSaving}
          type="submit"
        >
          {isSaving
            ? 'Guardando...'
            : selectedIngredient
              ? 'Guardar cambios'
              : 'Guardar ingrediente'}
        </button>
      </form>
    </>
  );

  return (
    <div className="grid animate-fade-in gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0 space-y-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
              Ingredientes
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Gestioná insumos, unidades y precios de compra para controlar costos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              aria-label="+ Nuevo ingrediente"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-primary-glow transition hover:bg-primary/90 active:scale-[0.98]"
              onClick={handleStartCreate}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuevo ingrediente
            </button>
          </div>
        </section>

        <section
          aria-label="Resumen de ingredientes"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wheat className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Insumos
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {ingredientStats.total}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Catálogo de compras.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Prom. compra
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {formatMoney(ingredientStats.averagePrice)}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Referencia por unidad.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Más caro
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {ingredientStats.expensive
                    ? formatMoney(ingredientStats.expensive.purchasePrice)
                    : formatMoney(0)}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              {ingredientStats.expensive?.name ?? 'Sin datos'}.
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card transition hover:-translate-y-0.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Unidades
                </p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {ingredientStats.unitCount}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600" aria-hidden="true" />
              Tipos de medida.
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-border/70 bg-white/75 p-3 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-sm font-bold text-foreground">
              Buscar ingrediente
              <span className="relative mt-2 block">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className="w-full rounded-full border border-border bg-white py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-4 focus:ring-ring/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, unidad o medida"
                  type="search"
                  value={search}
                />
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full bg-foreground/5 px-3 py-2 text-xs font-black text-muted-foreground ring-1 ring-border/80">
                {ingredientStats.visible} resultados
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
                <h2 className="text-lg font-black text-foreground">Insumos guardados</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Tocá un ingrediente para revisar o editar su costo.
                </p>
              </div>
            </div>

            {ingredientsQuery.isLoading ? (
              <p className="mt-6 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-muted-foreground">
                Cargando ingredientes...
              </p>
            ) : null}

            {ingredientsQuery.isError ? (
              <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                No se pudieron cargar los ingredientes.
              </p>
            ) : null}

            <div className="mt-5 grid gap-3">
              {filteredIngredients.map((ingredient) => (
                <article
                  aria-label={`Ingrediente ${ingredient.name}`}
                  aria-selected={selectedIngredientId === ingredient.id}
                  className={[
                    'group cursor-pointer overflow-hidden rounded-2xl border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-card',
                    selectedIngredientId === ingredient.id
                      ? 'border-primary/50 ring-2 ring-primary/10'
                      : 'border-border/80',
                  ].join(' ')}
                  key={ingredient.id}
                  onClick={() => handleSelectIngredient(ingredient)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="h-1.5 bg-primary" />
                  <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary ring-1 ring-border/80">
                          <Wheat className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <h3 className="text-lg font-black text-foreground">{ingredient.name}</h3>
                        <span
                          className={`${ingredientBadgeClassName} bg-primary text-primary-foreground ring-1 ring-primary/20`}
                        >
                          {unitLabels[ingredient.unit]}
                        </span>
                      </div>
                      <p className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm font-black text-foreground ring-1 ring-border/60">
                        <CircleDollarSign
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {formatMoney(ingredient.purchasePrice)} / {ingredient.unit}
                      </p>
                    </div>
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-destructive transition hover:bg-destructive/8 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                      disabled={deleteIngredient.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteIngredient.mutate(ingredient.id);
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>

      {isDesktopPanel && (
        <aside
          aria-label={panelLabel}
          className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-card sm:p-5 lg:sticky lg:top-0 lg:-my-6 lg:flex lg:h-dvh lg:max-h-dvh lg:flex-col lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-r-0 lg:bg-card lg:shadow-2xl"
          ref={formPanelRef}
          role="region"
        >
          {renderPanelContent()}
        </aside>
      )}

      {isMobilePanelOpen &&
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
              {renderPanelContent()}
            </div>
          </section>,
          document.body,
        )}
    </div>
  );
};
