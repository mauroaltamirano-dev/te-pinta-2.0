import { Calculator, CircleDollarSign, Percent, Save, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { DisclosurePanel } from '../../components/DisclosurePanel';
import { MetricCard } from '../../components/MetricCard';
import {
  calculateBaseCostPerDozenCents,
  calculateDashboardAverages,
  calculateDozenSimulatorScenarios,
  calculateVarietyMetrics,
  type DashboardVarietyMetrics,
} from '../../helpers/dashboardMath';
import { useFinanceAssumptions } from '../../hooks/useFinanceAssumptions';
import type { FinanceWorkspaceData } from '../../hooks/useFinanceWorkspaceData';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin dato' : moneyFormatter.format(cents / 100);

const formatPercent = (value: number): string => `${value.toLocaleString('es-AR')}%`;

const toCentsFromPesos = (value: number | null | undefined): number =>
  Math.round((value ?? 0) * 100);

const parsePercentDraft = (value: string, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const marginTone = (marginPercent: number): 'success' | 'warning' | 'danger' => {
  if (marginPercent >= 45) {
    return 'success';
  }

  if (marginPercent >= 25) {
    return 'warning';
  }

  return 'danger';
};

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const CompactMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white/85 px-3 py-2 ring-1 ring-border/60">
    <dt className="text-[0.7rem] font-black uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 text-sm font-black text-foreground">{value}</dd>
  </div>
);

const VarietyCard = ({ variety }: { variety: DashboardVarietyMetrics }) => {
  const [dozensDraft, setDozensDraft] = useState('1');
  const dozens = parsePercentDraft(dozensDraft, 1);
  const scenarios = calculateDozenSimulatorScenarios({
    dozens,
    priceDozenCents: variety.priceDozenCents,
    totalCostPerDozenCents: variety.totalCostCents,
    cookingFeePerDozenCents: variety.cookingFeePerDozenCents,
    deliveryFeeCents: variety.deliveryFeeCents,
  });

  return (
    <article
      aria-label={`Variedad ${variety.name}`}
      className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-white via-card to-primary/5 p-4 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">Variedad</p>
          <h3 className="mt-1 font-display text-2xl font-black text-foreground">{variety.name}</h3>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            Precio para {formatPercent(variety.targetMarginPercent)}:{' '}
            <span className="text-foreground">
              {variety.targetSalePriceCents === null
                ? 'Margen inválido'
                : formatMoneyFromCents(variety.targetSalePriceCents)}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-100">
          Margen actual {formatPercent(variety.marginPercent)}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetric label="Costo" value={formatMoneyFromCents(variety.totalCostCents)} />
        <CompactMetric label="Precio" value={formatMoneyFromCents(variety.priceDozenCents)} />
        <CompactMetric label="Ganancia" value={formatMoneyFromCents(variety.profitCents)} />
        <CompactMetric
          label={`Servicio ${formatPercent(variety.servicePercent)}`}
          value={formatMoneyFromCents(variety.serviceCostCents)}
        />
      </dl>

      <div className="mt-4 rounded-2xl border border-border/70 bg-card/80 p-3">
        <label className="text-sm font-black text-foreground">
          Docenas a simular
          <input
            className={inputClassName}
            min="0"
            onChange={(event) => setDozensDraft(event.target.value)}
            step="0.25"
            type="number"
            value={dozensDraft}
          />
        </label>
      </div>

      <div className="mt-4">
        <DisclosurePanel
          title="Márgenes por escenario"
          summary="Cruda, cocinada, retiro y envío con fees reales"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {scenarios.map((scenario) => (
              <div
                className="rounded-2xl border border-border/60 bg-background px-3 py-2"
                key={scenario.key}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-foreground">{scenario.label}</p>
                    <p className="text-[0.7rem] font-bold text-muted-foreground">{scenario.hint}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[0.7rem] font-black text-primary ring-1 ring-primary/10">
                    {formatPercent(scenario.marginPercent)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[0.75rem] font-bold">
                  <p className="text-muted-foreground">
                    Venta {formatMoneyFromCents(scenario.saleCents)}
                  </p>
                  <p className="text-muted-foreground">
                    Ganancia {formatMoneyFromCents(scenario.profitCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DisclosurePanel>
      </div>

      {!variety.hasRecipe || variety.warningsCount > 0 ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-100">
          {!variety.hasRecipe
            ? 'Falta cargar receta para que este costo sea completo.'
            : 'Hay ingredientes sin costo actualizado.'}
        </p>
      ) : null}
    </article>
  );
};

export const FinanceDashboard = ({ data }: { data: FinanceWorkspaceData }) => {
  const { assumptions, isUpdating, updateAssumption } = useFinanceAssumptions();
  const [serviceDraft, setServiceDraft] = useState(String(assumptions.servicePercent));
  const [targetDraft, setTargetDraft] = useState(String(assumptions.targetMarginPercent));

  useEffect(() => {
    setServiceDraft(String(assumptions.servicePercent));
    setTargetDraft(String(assumptions.targetMarginPercent));
  }, [assumptions.servicePercent, assumptions.targetMarginPercent]);

  const baseCostPerDozenCents = useMemo(
    () => calculateBaseCostPerDozenCents(data.baseCostRules),
    [data.baseCostRules],
  );
  const cookingFeePerDozenCents = toCentsFromPesos(
    data.orderPromotionSettingsQuery.data?.cookingFee,
  );
  const deliveryFeeCents = toCentsFromPesos(data.deliveryFeeQuery.data);
  const varieties = useMemo(
    () =>
      data.recipes.map((recipe) => {
        const menuItem = data.menuItems.find((item) => item.id === recipe.menuItemId);

        return calculateVarietyMetrics({
          id: recipe.menuItemId,
          name: recipe.menuItemName,
          baseCostPerDozenCents,
          recipeCostPerDozenCents: recipe.totalCostPerDozenCents,
          priceDozenCents: toCentsFromPesos(menuItem?.priceDozen),
          servicePercent: assumptions.servicePercent,
          targetMarginPercent: assumptions.targetMarginPercent,
          cookingFeePerDozenCents,
          deliveryFeeCents,
          hasRecipe: recipe.items.length > 0,
          warningsCount: recipe.warnings.length,
        });
      }),
    [
      assumptions.servicePercent,
      assumptions.targetMarginPercent,
      baseCostPerDozenCents,
      cookingFeePerDozenCents,
      data.menuItems,
      data.recipes,
      deliveryFeeCents,
    ],
  );
  const averages = useMemo(() => calculateDashboardAverages(varieties), [varieties]);

  const handleSaveAssumptions = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAssumption('servicePercent', parsePercentDraft(serviceDraft, assumptions.servicePercent));
    updateAssumption(
      'targetMarginPercent',
      parsePercentDraft(targetDraft, assumptions.targetMarginPercent),
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[1.75rem] border border-border/70 bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">Dashboard</p>
            <h2 className="mt-1 font-display text-2xl font-black text-foreground">
              Rentabilidad por variedad
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
              Promedios, precio objetivo y simulador por docena usando los últimos supuestos
              guardados.
            </p>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-[10rem_10rem_auto]"
            onSubmit={handleSaveAssumptions}
          >
            <label className="text-sm font-bold text-foreground">
              Servicios (%)
              <input
                className={inputClassName}
                min="0"
                onChange={(event) => setServiceDraft(event.target.value)}
                type="number"
                value={serviceDraft}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Margen objetivo (%)
              <input
                className={inputClassName}
                min="0"
                onChange={(event) => setTargetDraft(event.target.value)}
                type="number"
                value={targetDraft}
              />
            </label>
            <button
              className="self-end rounded-full bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isUpdating}
              type="submit"
            >
              <span className="inline-flex items-center gap-2">
                <Save className="h-4 w-4" aria-hidden={true} />
                Guardar supuestos
              </span>
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent={marginTone(averages.averageMarginPercent)}
          icon={<Percent className="h-5 w-5" />}
          label="Margen promedio"
          value={formatPercent(averages.averageMarginPercent)}
          helpText="Promedio del margen actual por variedad."
        />
        <MetricCard
          icon={<Calculator className="h-5 w-5" />}
          label="Costo promedio"
          value={formatMoneyFromCents(averages.averageCostCents)}
          helpText="Costo de venta por docena con servicios."
        />
        <MetricCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="Precio promedio"
          value={formatMoneyFromCents(averages.averageSalePriceCents)}
          helpText="Precio de venta actual por docena."
        />
        <MetricCard
          accent="success"
          icon={<Sparkles className="h-5 w-5" />}
          label="Ganancia promedio"
          value={formatMoneyFromCents(averages.averageProfitCents)}
          helpText="Resultado promedio antes de escenarios."
        />
      </div>

      {varieties.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
          <p className="font-black text-foreground">Sin variedades para simular</p>
          <p className="mt-1 font-semibold leading-6 text-muted-foreground">
            Cargá variedades de menú y recetas para ver rentabilidad premium por empanada.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {varieties.map((variety) => (
            <VarietyCard key={variety.id} variety={variety} />
          ))}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-primary/10 bg-primary/5 p-4 text-sm font-semibold text-muted-foreground">
        <p className="flex items-center gap-2 font-black text-foreground">
          <Target className="h-4 w-4 text-primary" aria-hidden={true} />
          Lectura rápida
        </p>
        <p className="mt-1 leading-6">
          La cocción se cobra por docena iniciada y el envío se aplica una sola vez por escenario.
        </p>
      </div>
    </div>
  );
};
