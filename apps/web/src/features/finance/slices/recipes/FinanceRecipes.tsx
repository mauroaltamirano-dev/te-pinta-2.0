import { useEffect, useState, type FormEvent } from 'react';
import { Save, Soup, Trash2 } from 'lucide-react';

import { MetricCard } from '../../components/MetricCard';
import { calculateBaseCostPerDozenCents } from '../../helpers/dashboardMath';
import type { FinanceBaseCostRule, FinanceBaseUnit, FinanceProductWithMetrics, FinanceRecipe } from '../../types';
import type { MenuItem } from '../../../menu/menu-api';

export type RecipeDraftItem = {
  productId: string;
  quantity: string;
  notes: string;
};

type FinanceRecipesProps = {
  recipes: FinanceRecipe[];
  menuItems: MenuItem[];
  products: FinanceProductWithMetrics[];
  baseCostRules: FinanceBaseCostRule[];
  onSave: (menuItemId: string, rows: RecipeDraftItem[]) => void;
  isPending: boolean;
  selectedMenuItemId?: string;
};

const baseUnitLabels: Record<FinanceBaseUnit, string> = {
  unit: 'unidad',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pack: 'pack',
};

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';
const selectClassName = `${inputClassName} appearance-none`;

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin costo' : moneyFormatter.format(cents / 100);

const toPositiveNumber = (value: string): number => Math.max(Number(value || 0), 0);

export const FinanceRecipes = ({
  recipes,
  menuItems,
  products,
  baseCostRules,
  onSave,
  isPending,
  selectedMenuItemId,
}: FinanceRecipesProps) => {
  const activeBaseCostProductIds = new Set(
    baseCostRules.filter((rule) => rule.isActive).map((rule) => rule.productId),
  );
  const recipeProducts = products.filter(
    (product) => product.category === 'raw_material' && !activeBaseCostProductIds.has(product.id),
  );
  const activeBaseCostRules = baseCostRules.filter((rule) => rule.isActive);
  const baseCostPerDozenCents = calculateBaseCostPerDozenCents(activeBaseCostRules);
  const [selectedMenuItemIdState, setSelectedMenuItemIdState] = useState('');
  const menuItemId = selectedMenuItemIdState || menuItems[0]?.id || recipes[0]?.menuItemId || '';
  const selectedRecipe = recipes.find((recipe) => recipe.menuItemId === menuItemId);
  const recipeCostPerDozenCents = selectedRecipe?.totalCostPerDozenCents ?? 0;
  const totalCostPerDozenCents = baseCostPerDozenCents + recipeCostPerDozenCents;
  const totalCostPerUnitCents = Math.round(totalCostPerDozenCents / 12);
  const [rows, setRows] = useState<RecipeDraftItem[]>([]);

  useEffect(() => {
    if (!selectedMenuItemId || !menuItems.some((item) => item.id === selectedMenuItemId)) {
      return;
    }

    setSelectedMenuItemIdState(selectedMenuItemId);
  }, [menuItems, selectedMenuItemId]);

  useEffect(() => {
    if (!menuItemId) {
      setRows([]);
      return;
    }

    setRows(
      (selectedRecipe?.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: String(item.quantityBase),
        notes: item.notes ?? '',
      })),
    );
  }, [menuItemId, selectedRecipe]);

  const addRow = () => {
    const firstProductId = recipeProducts[0]?.id ?? '';
    if (!firstProductId) return;
    setRows((current) => [...current, { productId: firstProductId, quantity: '1', notes: '' }]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(
      menuItemId,
      rows.filter((row) => !activeBaseCostProductIds.has(row.productId)),
    );
  };

  if (!menuItems.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
        <p className="font-black text-foreground">Sin variedades de menú</p>
        <p className="mt-1 font-semibold leading-6 text-muted-foreground">Primero cargá variedades en Menú. Después Gestión puede asociarles recetas por docena.</p>
      </div>
    );
  }

  return (
    <form className="space-y-5 rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Soup className="h-4 w-4" aria-hidden={true} />
          <div>
            <p className="text-xs font-black uppercase tracking-wide">Recetas</p>
            <h3 className="text-xl font-black text-foreground">Receta por docena</h3>
          </div>
        </div>
        <label className="min-w-60 text-sm font-bold text-foreground">Variedad
          <select className={selectClassName} onChange={(event) => setSelectedMenuItemIdState(event.target.value)} value={menuItemId}>
            {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Costo base" value={formatMoneyFromCents(baseCostPerDozenCents)} helpText="Tapas, cajas y reglas activas por docena" />
        <MetricCard label="Costo receta" value={formatMoneyFromCents(recipeCostPerDozenCents)} helpText="Ingredientes específicos de la variedad" />
        <MetricCard label="Total docena" value={formatMoneyFromCents(totalCostPerDozenCents)} trend={{ label: `Unidad ${formatMoneyFromCents(totalCostPerUnitCents)}` }} helpText="Base + receta específica" />
      </div>

      <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground">
        No cargues tapas, cajas o papel como ingrediente: esos productos ya se suman desde Costos base para evitar doble conteo.
        {activeBaseCostRules.length ? (
          <p className="mt-2 text-xs font-black uppercase tracking-wide text-primary">
            Excluidos: {activeBaseCostRules.map((rule) => rule.productName ?? rule.name).join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-border/70 text-sm">
          <thead className="bg-background text-xs font-black uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Insumo</th>
              <th className="px-4 py-3 text-left">Cantidad</th>
              <th className="px-4 py-3 text-left">Último costo</th>
              <th className="px-4 py-3 text-left">Costo docena</th>
              <th className="px-4 py-3 text-left">Nota</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length ? rows.map((row, index) => {
              const product = products.find((item) => item.id === row.productId);
              const recipeItem = selectedRecipe?.items.find((item) => item.productId === row.productId);
              const latestCostCents = recipeItem?.latestCostCents ?? product?.latestCostPerBaseUnitCents ?? null;
              const quantity = toPositiveNumber(row.quantity);
              const lineCostCents = latestCostCents === null || latestCostCents === undefined ? null : Math.round(latestCostCents * quantity);
              const isBaseCostProduct = activeBaseCostProductIds.has(row.productId);
              const rowOptions = product && !recipeProducts.some((item) => item.id === product.id) ? [product, ...recipeProducts] : recipeProducts;

              return (
                <tr className={isBaseCostProduct ? 'bg-amber-50/60' : undefined} key={`${row.productId}-${index}`}>
                  <td className="px-4 py-3 font-bold text-foreground">
                    <select aria-label="Insumo" className={selectClassName} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, productId: event.target.value } : item))} value={row.productId}>
                      {rowOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    {isBaseCostProduct ? <p className="mt-2 text-xs font-bold text-amber-800">Se excluye al guardar para evitar doble conteo.</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`recipe-qty-${index}`}>Cantidad ingrediente {index + 1}</label>
                    <input id={`recipe-qty-${index}`} className={inputClassName} min="0" onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} step="0.001" type="number" value={row.quantity} />
                    <p className="mt-1 text-xs font-bold text-muted-foreground">{baseUnitLabels[product?.baseUnit ?? 'unit']}</p>
                  </td>
                  <td className="px-4 py-3 font-black text-foreground">{formatMoneyFromCents(latestCostCents)}</td>
                  <td className="px-4 py-3 font-black text-primary">{formatMoneyFromCents(lineCostCents)}</td>
                  <td className="px-4 py-3">
                    <input className={inputClassName} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, notes: event.target.value } : item))} value={row.notes} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button aria-label="Quitar ingrediente" className="rounded-full bg-red-50 p-3 text-red-700 ring-1 ring-red-100 transition hover:bg-red-100" onClick={() => setRows((current) => current.filter((_item, itemIndex) => itemIndex !== index))} type="button">
                      <Trash2 className="h-4 w-4" aria-hidden={true} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td className="px-4 py-5 text-sm font-bold text-muted-foreground" colSpan={6}>La variedad todavía no tiene receta. Agregá sólo el relleno específico.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRecipe?.warnings.length ? (
        <div className="space-y-2">
          {selectedRecipe.warnings.map((warning) => <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900" key={`${warning.code}-${warning.message}`}>{warning.message}</p>)}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center justify-center rounded-full bg-muted px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60" disabled={!recipeProducts.length} onClick={addRow} type="button">Agregar ingrediente</button>
        <button className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60" disabled={isPending || !menuItemId} type="submit">
          <Save className="h-4 w-4" aria-hidden={true} /> Guardar receta
        </button>
      </div>
    </form>
  );
};
