import { useState, type FormEvent } from 'react';
import { Calculator } from 'lucide-react';
import {
  useCreateFinanceBaseCostRule,
  useDeleteFinanceBaseCostRule,
  usePreviewFinanceOrderCost,
  useUpdateFinanceBaseCostRule,
  useUpdateFinanceRecipe,
} from '../hooks';
import type { FinanceWorkspaceData } from '../hooks/useFinanceWorkspaceData';
import { FinanceDashboard } from '../slices/dashboard/FinanceDashboard';
import { FinanceCatalog } from '../slices/catalog/FinanceCatalog';
import { FinancePurchases } from '../slices/purchases/FinancePurchases';
import { FinanceBaseCosts, normalizeBaseCostRuleForm, type BaseCostRuleFormState } from '../slices/base-costs/FinanceBaseCosts';
import { FinanceRecipes, type RecipeDraftItem } from '../slices/recipes/FinanceRecipes';
import type { FinanceSectionId } from './FinanceSectionNav';

type CalculatorFormState = {
  saleTotal: string;
  menuItemId: string;
  quantity: string;
};

type FinanceFeedback = {
  tone: 'success' | 'error';
  title: string;
  description: string;
};

const initialCalculatorForm: CalculatorFormState = {
  saleTotal: '0',
  menuItemId: '',
  quantity: '12',
};


const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';
const selectClassName = `${inputClassName} appearance-none`;

const getErrorDescription = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

const FeedbackBanner = ({ feedback }: { feedback: FinanceFeedback | null }) => {
  if (!feedback) return null;

  return (
    <div
      className={`rounded-[1.5rem] border px-4 py-3 text-sm shadow-card ${
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900'
      }`}
      role="status"
    >
      <p className="font-black">{feedback.title}</p>
      <p className="mt-1 font-semibold leading-6">{feedback.description}</p>
    </div>
  );
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin costo' : moneyFormatter.format(cents / 100);

const toCents = (value: string): number => Math.round(Number(value || 0) * 100);
const toPositiveNumber = (value: string): number => Math.max(Number(value || 0), 0);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
    <p className="font-black text-foreground">{title}</p>
    <p className="mt-1 font-semibold leading-6 text-muted-foreground">{description}</p>
  </div>
);

type FinanceLegacyWorkspaceProps = {
  activeSection: FinanceSectionId;
  data: FinanceWorkspaceData;
  selectedRecipeMenuItemId?: string;
};

export const FinanceLegacyWorkspace = ({
  activeSection,
  data,
  selectedRecipeMenuItemId,
}: FinanceLegacyWorkspaceProps) => {
  const [calculatorForm, setCalculatorForm] = useState<CalculatorFormState>(initialCalculatorForm);
  const [feedback, setFeedback] = useState<FinanceFeedback | null>(null);
  const createBaseCostRule = useCreateFinanceBaseCostRule();
  const updateBaseCostRule = useUpdateFinanceBaseCostRule();
  const deleteBaseCostRule = useDeleteFinanceBaseCostRule();
  const updateRecipe = useUpdateFinanceRecipe();
  const previewOrderCost = usePreviewFinanceOrderCost();

  const {
    productsQuery,
    purchasesQuery,
    products,
    purchases,
    baseCostRules,
    recipes,
    menuItems,
  } = data;

  const handleCreateBaseCostRule = (form: BaseCostRuleFormState) => {
    const normalizedForm = normalizeBaseCostRuleForm(form);

    createBaseCostRule.mutate(
      {
        productId: normalizedForm.productId,
        name: normalizedForm.name,
        componentType: normalizedForm.componentType,
        appliesTo: normalizedForm.appliesTo,
        quantity: toPositiveNumber(normalizedForm.quantity),
        groupSizeUnits: Math.max(Number.parseInt(normalizedForm.groupSizeUnits || '12', 10), 1),
        roundingMode: normalizedForm.roundingMode,
        isActive: normalizedForm.isActive,
      },
      {
        onSuccess: (rule) =>
          setFeedback({
            tone: 'success',
            title: 'Regla guardada',
            description: `${rule.name} ya se usa para los próximos previews de costos.`,
          }),
        onError: (error) =>
          setFeedback({
            tone: 'error',
            title: 'No se pudo guardar la regla',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleUpdateBaseCostRule = (
    id: string,
    updates: Partial<BaseCostRuleFormState> & { isActive?: boolean },
  ) => {
    const normalizedUpdates =
      updates.productId !== undefined &&
      updates.name !== undefined &&
      updates.componentType !== undefined &&
      updates.appliesTo !== undefined &&
      updates.quantity !== undefined &&
      updates.groupSizeUnits !== undefined &&
      updates.roundingMode !== undefined &&
      updates.isActive !== undefined
        ? normalizeBaseCostRuleForm(updates as BaseCostRuleFormState)
        : updates;

    updateBaseCostRule.mutate(
      {
        id,
        updates: {
          ...(normalizedUpdates.productId !== undefined
            ? { productId: normalizedUpdates.productId }
            : {}),
          ...(normalizedUpdates.name !== undefined ? { name: normalizedUpdates.name } : {}),
          ...(normalizedUpdates.componentType !== undefined
            ? { componentType: normalizedUpdates.componentType }
            : {}),
          ...(normalizedUpdates.appliesTo !== undefined
            ? { appliesTo: normalizedUpdates.appliesTo }
            : {}),
          ...(normalizedUpdates.quantity !== undefined
            ? { quantity: toPositiveNumber(normalizedUpdates.quantity) }
            : {}),
          ...(normalizedUpdates.groupSizeUnits !== undefined
            ? {
                groupSizeUnits: Math.max(
                  Number.parseInt(normalizedUpdates.groupSizeUnits || '12', 10),
                  1,
                ),
              }
            : {}),
          ...(normalizedUpdates.roundingMode !== undefined
            ? { roundingMode: normalizedUpdates.roundingMode }
            : {}),
          ...(normalizedUpdates.isActive !== undefined
            ? { isActive: normalizedUpdates.isActive }
            : {}),
        },
      },
      {
        onSuccess: () =>
          setFeedback({
            tone: 'success',
            title: 'Regla actualizada',
            description: 'La configuración de costo base quedó actualizada.',
          }),
        onError: (error) =>
          setFeedback({
            tone: 'error',
            title: 'No se pudo actualizar la regla',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleDeleteBaseCostRule = (id: string) => {
    const confirmed = window.confirm('¿Eliminar esta regla de costo base?');
    if (!confirmed) {
      return;
    }

    deleteBaseCostRule.mutate(id, {
      onSuccess: () =>
        setFeedback({
          tone: 'success',
          title: 'Regla eliminada',
          description: 'La regla ya no participa de los próximos cálculos.',
        }),
      onError: (error) =>
        setFeedback({
          tone: 'error',
          title: 'No se pudo eliminar la regla',
          description: getErrorDescription(error),
        }),
    });
  };

  const handleSaveRecipe = (menuItemId: string, rows: RecipeDraftItem[]) => {
    updateRecipe.mutate(
      {
        menuItemId,
        input: {
          menuItemId,
          items: rows.flatMap((row) => {
            const product = products.find((item) => item.id === row.productId);
            const quantity = toPositiveNumber(row.quantity);
            if (!product || quantity <= 0) {
              return [];
            }

            return [
              {
                productId: row.productId,
                quantityPerDozen: quantity,
                unit: product.baseUnit,
                quantityBase: quantity,
                notes: row.notes || undefined,
              },
            ];
          }),
        },
      },
      {
        onSuccess: (recipe) =>
          setFeedback({
            tone: 'success',
            title: 'Receta guardada',
            description: `${recipe.menuItemName} ya tiene costo de receta para la calculadora.`,
          }),
        onError: (error) =>
          setFeedback({
            tone: 'error',
            title: 'No se pudo guardar la receta',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handlePreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    previewOrderCost.mutate({
      saleTotalCents: toCents(calculatorForm.saleTotal),
      items: [
        {
          menuItemId: calculatorForm.menuItemId || menuItems[0]?.id || '',
          quantity: Math.max(Number.parseInt(calculatorForm.quantity || '0', 10), 1),
        },
      ],
    });
  };

  return (
    <>
      <FeedbackBanner feedback={feedback} />
      <section
        aria-labelledby={`finance-tab-${activeSection}`}
        className="space-y-5"
        id={`finance-panel-${activeSection}`}
        role="tabpanel"
      >
        {activeSection === 'dashboard' ? <FinanceDashboard data={data} /> : null}

        {activeSection === 'catalog' ? (
          <FinanceCatalog
            isLoading={productsQuery.isLoading}
            products={products}
            purchases={purchases}
          />
        ) : null}

        {activeSection === 'purchases' ? (
          <FinancePurchases
            isLoading={purchasesQuery.isLoading}
            products={products}
            purchases={purchases}
          />
        ) : null}

        {activeSection === 'base-costs' ? (
          <FinanceBaseCosts
            isPending={
              createBaseCostRule.isPending ||
              updateBaseCostRule.isPending ||
              deleteBaseCostRule.isPending
            }
            onCreate={handleCreateBaseCostRule}
            onDelete={handleDeleteBaseCostRule}
            onUpdate={handleUpdateBaseCostRule}
            products={products}
            rules={baseCostRules}
          />
        ) : null}

        {activeSection === 'recipes' ? (
          <FinanceRecipes
            baseCostRules={baseCostRules}
            isPending={updateRecipe.isPending}
            menuItems={menuItems}
            onSave={handleSaveRecipe}
            products={products}
            recipes={recipes}
            selectedMenuItemId={selectedRecipeMenuItemId}
          />
        ) : null}

        {activeSection === 'calculator' ? (
          <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
            <form
              className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
              onSubmit={handlePreview}
            >
              <div className="flex items-center gap-2 text-primary">
                <Calculator className="h-4 w-4" aria-hidden={true} />
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Preview de rentabilidad
                </h3>
              </div>
              <label className="mt-4 block text-sm font-bold text-foreground">
                Total de venta
                <input
                  aria-label="Total de venta"
                  className={inputClassName}
                  min="0"
                  onChange={(event) =>
                    setCalculatorForm((current) => ({ ...current, saleTotal: event.target.value }))
                  }
                  step="0.01"
                  type="number"
                  value={calculatorForm.saleTotal}
                />
              </label>
              <label className="mt-3 block text-sm font-bold text-foreground">
                Variedad
                <select
                  aria-label="Variedad"
                  className={selectClassName}
                  onChange={(event) =>
                    setCalculatorForm((current) => ({ ...current, menuItemId: event.target.value }))
                  }
                  required
                  value={calculatorForm.menuItemId || menuItems[0]?.id || ''}
                >
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-sm font-bold text-foreground">
                Cantidad de empanadas
                <input
                  aria-label="Cantidad de empanadas"
                  className={inputClassName}
                  min="1"
                  onChange={(event) =>
                    setCalculatorForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  type="number"
                  value={calculatorForm.quantity}
                />
              </label>
              <button
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                disabled={previewOrderCost.isPending || !menuItems.length}
                type="submit"
              >
                Calcular costo
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card">
              <h3 className="text-sm font-black uppercase tracking-wide text-primary">
                Resultado del preview
              </h3>
              {previewOrderCost.data ? (
                <div className="mt-4 space-y-4">
                  <dl className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Costo total
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {formatMoneyFromCents(previewOrderCost.data.totalCostCents)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Margen
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {previewOrderCost.data.profitSummary.profitMarginPercent.toFixed(1)}%
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Packaging
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {previewOrderCost.data.packagingUnits.toLocaleString('es-AR')} unidad(es)
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Materia prima base
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {formatMoneyFromCents(previewOrderCost.data.baseRawMaterialCostCents)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Costo packaging
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {formatMoneyFromCents(previewOrderCost.data.packagingCostCents)}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                      <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Receta / relleno
                      </dt>
                      <dd className="mt-1 font-black text-foreground">
                        {formatMoneyFromCents(previewOrderCost.data.recipeCostCents)}
                      </dd>
                    </div>
                  </dl>

                  {previewOrderCost.data.warnings.length ? (
                    <div className="space-y-2">
                      {previewOrderCost.data.warnings.map((warning) => (
                        <p
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900"
                          key={`${warning.code}-${warning.message}`}
                        >
                          {warning.message}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                      Sin advertencias para este preview.
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="Calculá antes de guardar"
                  description="El preview usa el endpoint `/finance/costing/preview-order` y muestra advertencias si faltan recetas o costos."
                />
              )}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
};
