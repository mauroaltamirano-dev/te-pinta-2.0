import { useMemo, useState, type FormEvent } from 'react';

import type { CreateIngredientInput, IngredientUnit } from '@te-pinta/shared';

import { useCreateIngredient, useDeleteIngredient, useIngredients } from './ingredients-hooks';

const unitOptions: { value: IngredientUnit; label: string }[] = [
  { value: 'g', label: 'Gramos' },
  { value: 'kg', label: 'Kilos' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'l', label: 'Litros' },
  { value: 'u', label: 'Unidades' },
];

const formatMoney = (value: number): string => `$ ${Math.round(value).toLocaleString('es-AR')}`;

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

export const IngredientsPage = () => {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<IngredientFormState>(initialFormState);
  const ingredientsQuery = useIngredients();
  const createIngredient = useCreateIngredient();
  const deleteIngredient = useDeleteIngredient();

  const filteredIngredients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return ingredientsQuery.data ?? [];
    }

    return (ingredientsQuery.data ?? []).filter((ingredient) =>
      ingredient.name.toLowerCase().includes(normalizedSearch),
    );
  }, [ingredientsQuery.data, search]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createIngredient.mutateAsync(toCreateInput(form));
    setForm(initialFormState);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Phase 4.6</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Ingredientes
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Insumos y precios de compra para gestión operativa.
            </p>
          </div>
          <label className="w-full max-w-sm text-sm font-bold text-foreground">
            Buscar ingrediente
            <input
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej: harina..."
              type="search"
              value={search}
            />
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-foreground">Insumos</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-primary">
              {filteredIngredients.length} resultados
            </span>
          </div>

          {ingredientsQuery.isLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Cargando ingredientes...</p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {filteredIngredients.map((ingredient) => (
              <article
                aria-label={`Ingrediente ${ingredient.name}`}
                className="rounded-3xl border border-border bg-background p-4"
                key={ingredient.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-foreground">{ingredient.name}</h4>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {formatMoney(ingredient.purchasePrice)} / {ingredient.unit}
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={deleteIngredient.isPending}
                    onClick={() => deleteIngredient.mutate(ingredient.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-black text-foreground">Nuevo ingrediente</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-foreground">
              Nombre del ingrediente
              <input
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                value={form.name}
              />
            </label>

            <label className="block text-sm font-bold text-foreground">
              Unidad
              <select
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unit: event.target.value as IngredientUnit,
                  }))
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
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
                min="0"
                onChange={(event) =>
                  setForm((current) => ({ ...current, purchasePrice: event.target.value }))
                }
                required
                type="number"
                value={form.purchasePrice}
              />
            </label>

            <button
              className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={createIngredient.isPending}
              type="submit"
            >
              {createIngredient.isPending ? 'Guardando...' : 'Guardar ingrediente'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
