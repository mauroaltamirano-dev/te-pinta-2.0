import { useMemo, useRef, useState, type FormEvent } from 'react';

import type { CreateMenuItemInput } from '@te-pinta/shared';

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
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const isSaving = createMenuItem.isPending || updateMenuItem.isPending;
  const editingItem = (menuItemsQuery.data ?? []).find((item) => item.id === editingItemId) ?? null;

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return menuItemsQuery.data ?? [];
    }

    return (menuItemsQuery.data ?? []).filter((item) =>
      item.name.toLowerCase().includes(normalizedSearch),
    );
  }, [menuItemsQuery.data, search]);

  const selectedItem = useMemo(() => {
    const selected = filteredItems.find((item) => item.id === selectedItemId);

    return selected ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedItemId]);

  const focusFormPanel = () => {
    formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      itemRefs.current.get(savedItemId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const created = await createMenuItem.mutateAsync(toCreateInput(form));
    setIsCreating(false);
    setSelectedItemId(created.id);
    setRecentlyEditedItemId(created.id);
    setForm(initialFormState);
    itemRefs.current.get(created.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase 4.4</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Menú</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Gestioná variedades, precios de venta, costos y estado activo para el formulario de
              pedidos.
            </p>
          </div>
          <label className="w-full max-w-sm text-sm font-bold text-foreground">
            Buscar variedad
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej: carne, humita..."
              type="search"
              value={search}
            />
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Variedades</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-primary">
                {filteredItems.length} resultados
              </span>
              <button
                className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/80"
                onClick={handleStartCreate}
                type="button"
              >
                + Nueva variedad
              </button>
            </div>
          </div>

          {menuItemsQuery.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Cargando menú...</p>
          ) : null}

          {menuItemsQuery.isError ? (
            <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              No se pudo cargar el menú.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {filteredItems.map((item) => (
              <article
                aria-label={`Variedad ${item.name}`}
                className={`cursor-pointer rounded-3xl border bg-background p-4 transition ${
                  item.id === recentlyEditedItemId
                    ? 'border-primary ring-4 ring-primary/15'
                    : selectedItem?.id === item.id
                      ? 'border-primary/40 ring-2 ring-primary/10'
                    : 'border-border'
                }`}
                key={item.id}
                onClick={() => handleSelectItem(item.id)}
                ref={setItemRef(item.id)}
                role="button"
                tabIndex={0}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-foreground">{item.name}</h4>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.isActive
                            ? 'bg-muted text-primary'
                            : 'bg-muted-foreground/10 text-muted-foreground'
                        }`}
                      >
                        {item.isActive ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                      <div>
                        <dt className="font-bold text-foreground">Unidad</dt>
                        <dd>{moneyFormatter.format(item.priceUnit)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-foreground">½ docena</dt>
                        <dd>{moneyFormatter.format(item.priceHalfDozen)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-foreground">Docena</dt>
                        <dd>{moneyFormatter.format(item.priceDozen)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-foreground">Costo doc.</dt>
                        <dd>{moneyFormatter.format(item.costPerDozen)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:flex-col lg:flex-row">
                    <button
                      className="w-full rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                      disabled={isSaving}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(item);
                      }}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
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
                      {item.isActive ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-label={
            editingItemId || isCreating
              ? editingItemId
                ? 'Formulario de edición de variedad'
                : 'Formulario de nueva variedad'
              : 'Detalle de variedad seleccionada'
          }
          className="rounded-3xl border border-border bg-card p-6 shadow-sm"
          ref={formPanelRef}
          role="region"
        >
          {editingItem || isCreating ? (
            <>
              <h3 className="text-lg font-black text-foreground">
                {editingItem ? `Editando ${editingItem.name}` : 'Nueva variedad'}
              </h3>
              {editingItem ? (
                <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-primary">
                  Editando {editingItem.name}. Podés corregir nombre, precios, costo o estado.
                </p>
              ) : (
                <p className="mt-2 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-primary">
                  Cargá una nueva variedad para que aparezca en pedidos.
                </p>
              )}
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <label className="block text-sm font-bold text-foreground">
                  Nombre de variedad
                  <input
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
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
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
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
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
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
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
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
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                    min="0"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, costPerDozen: event.target.value }))
                    }
                    type="number"
                    value={form.costPerDozen}
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground">
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
                    className="w-full rounded-2xl border border-border bg-card px-5 py-3 text-sm font-black text-primary transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isSaving}
                    onClick={handleCancelEdit}
                    type="button"
                  >
                    Cancelar edición
                  </button>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
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
          ) : selectedItem ? (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-foreground">Detalle de variedad</h3>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xl font-black text-foreground">{selectedItem.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estado: {selectedItem.isActive ? 'Activo' : 'Pausado'}
                </p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p>
                    <strong>Unidad:</strong> {moneyFormatter.format(selectedItem.priceUnit)}
                  </p>
                  <p>
                    <strong>½ docena:</strong>{' '}
                    {moneyFormatter.format(selectedItem.priceHalfDozen)}
                  </p>
                  <p>
                    <strong>Docena:</strong> {moneyFormatter.format(selectedItem.priceDozen)}
                  </p>
                  <p>
                    <strong>Costo doc.:</strong>{' '}
                    {moneyFormatter.format(selectedItem.costPerDozen)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Ingredientes por variedad y ventas por docenas: próximamente.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="w-full rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/80 sm:w-auto"
                  onClick={() => handleEdit(selectedItem)}
                  type="button"
                >
                  Editar variedad
                </button>
                <button
                  className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-muted/50 sm:w-auto"
                  onClick={handleStartCreate}
                  type="button"
                >
                  + Nueva variedad
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-black text-foreground">Menú sin resultados</h3>
              <p className="text-sm text-muted-foreground">
                No hay variedades para mostrar con ese filtro.
              </p>
              <button
                className="w-full rounded-full border border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/80 sm:w-auto"
                onClick={handleStartCreate}
                type="button"
              >
                + Nueva variedad
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
