import { useState, type FormEvent } from 'react';
import { Layers3, Trash2 } from 'lucide-react';
import { calculateBaseRawMaterialCost, calculatePackagingCost } from '@te-pinta/shared';

import { MetricCard } from '../../components/MetricCard';
import type {
  FinanceBaseCostRule,
  FinanceCostComponentType,
  FinanceCostRuleAppliesTo,
  FinanceProductWithMetrics,
  FinanceRoundingMode,
} from '../../types';

export type BaseCostRuleFormState = {
  productId: string;
  name: string;
  componentType: FinanceCostComponentType;
  appliesTo: FinanceCostRuleAppliesTo;
  quantity: string;
  groupSizeUnits: string;
  roundingMode: FinanceRoundingMode;
  isActive: boolean;
};

type FinanceBaseCostsProps = {
  rules: FinanceBaseCostRule[];
  products: FinanceProductWithMetrics[];
  onCreate: (form: BaseCostRuleFormState) => void;
  onUpdate: (id: string, updates: Partial<BaseCostRuleFormState> & { isActive?: boolean }) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
};

const componentTypeLabels: Record<FinanceCostComponentType, string> = {
  base_raw_material: 'Materia prima base',
  packaging: 'Packaging',
};

const appliesToLabels: Record<FinanceCostRuleAppliesTo, string> = {
  per_empanada: 'Por empanada',
  per_started_dozen: 'Por docena iniciada',
};

const roundingModeLabels: Record<FinanceRoundingMode, string> = {
  exact: 'Exacto',
  ceil: 'Redondear hacia arriba',
};

const componentTypeOptions = Object.keys(componentTypeLabels) as FinanceCostComponentType[];
const appliesToOptions = Object.keys(appliesToLabels) as FinanceCostRuleAppliesTo[];
const roundingModeOptions = Object.keys(roundingModeLabels) as FinanceRoundingMode[];

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

export const getRuleDefaultsForComponentType = (
  componentType: FinanceCostComponentType,
): Pick<BaseCostRuleFormState, 'appliesTo' | 'roundingMode' | 'groupSizeUnits'> =>
  componentType === 'packaging'
    ? { appliesTo: 'per_started_dozen', roundingMode: 'ceil', groupSizeUnits: '12' }
    : { appliesTo: 'per_empanada', roundingMode: 'exact', groupSizeUnits: '12' };

export const normalizeBaseCostRuleForm = (form: BaseCostRuleFormState): BaseCostRuleFormState => {
  const appliesTo = form.componentType === 'packaging' ? 'per_started_dozen' : form.appliesTo;

  return {
    ...form,
    appliesTo,
    groupSizeUnits: form.groupSizeUnits || '12',
    roundingMode:
      form.componentType === 'packaging'
        ? 'ceil'
        : appliesTo === 'per_started_dozen'
          ? form.roundingMode
          : 'exact',
  };
};

const initialBaseCostRuleForm: BaseCostRuleFormState = {
  productId: '',
  name: '',
  componentType: 'base_raw_material',
  appliesTo: 'per_empanada',
  quantity: '1',
  groupSizeUnits: '12',
  roundingMode: 'exact',
  isActive: true,
};

const estimateBaseCostFromRules = (rules: FinanceBaseCostRule[], empanadaCount: number): number => {
  const activeRules = rules.filter((rule) => rule.isActive && rule.latestCostCents !== null);
  const baseRawMaterialCost = calculateBaseRawMaterialCost({
    totalEmpanadas: empanadaCount,
    rules: activeRules,
  });
  const packagingCost = calculatePackagingCost({
    totalEmpanadas: empanadaCount,
    rules: activeRules,
  });

  return baseRawMaterialCost.totalCostCents + packagingCost.totalCostCents;
};

export const FinanceBaseCosts = ({
  rules,
  products,
  onCreate,
  onUpdate,
  onDelete,
  isPending,
}: FinanceBaseCostsProps) => {
  const [form, setForm] = useState<BaseCostRuleFormState>(initialBaseCostRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const selectedProductId = form.productId || products[0]?.id || '';
  const activeRules = rules.filter((rule) => rule.isActive);
  const availableAppliesToOptions =
    form.componentType === 'packaging' ? (['per_started_dozen'] as const) : appliesToOptions;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextForm = normalizeBaseCostRuleForm({ ...form, productId: selectedProductId });
    if (editingRuleId) {
      onUpdate(editingRuleId, nextForm);
      setEditingRuleId(null);
    } else {
      onCreate(nextForm);
    }
    setForm((current) => ({ ...initialBaseCostRuleForm, productId: current.productId }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[12, 18, 24].map((quantity) => (
            <MetricCard
              helpText="Reglas activas + último costo cargado"
              key={quantity}
              label={`Base ${quantity} emp.`}
              value={formatMoneyFromCents(estimateBaseCostFromRules(activeRules, quantity))}
            />
          ))}
        </div>

        {rules.length ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <article className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card" key={rule.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-primary">
                      {componentTypeLabels[rule.componentType]} · {appliesToLabels[rule.appliesTo]}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-foreground">{rule.name}</h3>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {rule.productName ?? rule.productId} · Cantidad {rule.quantity}{' '}
                      {rule.appliesTo === 'per_started_dozen'
                        ? `cada ${rule.groupSizeUnits} empanadas`
                        : 'por empanada'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${rule.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
                    {rule.isActive ? 'Activa' : 'Pausada'}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                    <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Último costo</dt>
                    <dd className="mt-1 text-sm font-black text-foreground">{formatMoneyFromCents(rule.latestCostCents)}</dd>
                  </div>
                  <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                    <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Redondeo</dt>
                    <dd className="mt-1 text-sm font-black text-foreground">{roundingModeLabels[rule.roundingMode]}</dd>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                    <button className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60" disabled={isPending} onClick={() => { setEditingRuleId(rule.id); setForm({ productId: rule.productId, name: rule.name, componentType: rule.componentType, appliesTo: rule.appliesTo, quantity: String(rule.quantity), groupSizeUnits: String(rule.groupSizeUnits), roundingMode: rule.roundingMode, isActive: rule.isActive }); }} type="button">Editar</button>
                    <button className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60" disabled={isPending} onClick={() => onUpdate(rule.id, { isActive: !rule.isActive })} type="button">{rule.isActive ? 'Pausar' : 'Reactivar'}</button>
                    <button className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60" disabled={isPending} onClick={() => onDelete(rule.id)} type="button"><Trash2 className="h-3.5 w-3.5" aria-hidden={true} />Eliminar</button>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
            <p className="font-black text-foreground">Sin reglas de costo base</p>
            <p className="mt-1 font-semibold leading-6 text-muted-foreground">Configurá tapas por empanada y packaging por docena iniciada para que la calculadora deje de trabajar a ciegas.</p>
          </div>
        )}
      </div>

      <form className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 text-primary">
          <Layers3 className="h-4 w-4" aria-hidden={true} />
          <h3 className="text-sm font-black uppercase tracking-wide">{editingRuleId ? 'Editar regla base' : 'Nueva regla base'}</h3>
        </div>
        <label className="mt-4 block text-sm font-bold text-foreground">Producto
          <select className={selectClassName} disabled={!products.length} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} value={selectedProductId}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm font-bold text-foreground">Nombre de regla
          <input className={inputClassName} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Tapa por empanada" required value={form.name} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-foreground">Tipo
            <select className={selectClassName} onChange={(event) => setForm((current) => ({ ...current, componentType: event.target.value as FinanceCostComponentType, ...getRuleDefaultsForComponentType(event.target.value as FinanceCostComponentType) }))} value={form.componentType}>{componentTypeOptions.map((type) => <option key={type} value={type}>{componentTypeLabels[type]}</option>)}</select>
          </label>
          <label className="text-sm font-bold text-foreground">Aplica
            <select className={selectClassName} onChange={(event) => setForm((current) => ({ ...current, appliesTo: event.target.value as FinanceCostRuleAppliesTo, roundingMode: event.target.value === 'per_started_dozen' ? 'ceil' : current.roundingMode }))} value={form.appliesTo}>{availableAppliesToOptions.map((appliesTo) => <option key={appliesTo} value={appliesTo}>{appliesToLabels[appliesTo]}</option>)}</select>
          </label>
          <p className="rounded-2xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground ring-1 ring-border/60 sm:col-span-2">Packaging siempre queda por docena iniciada para evitar costos subestimados.</p>
          <label className="text-sm font-bold text-foreground">Cantidad
            <input className={inputClassName} min="0" onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} step="0.001" type="number" value={form.quantity} />
          </label>
          <label className="text-sm font-bold text-foreground">Grupo
            <input className={inputClassName} min="1" onChange={(event) => setForm((current) => ({ ...current, groupSizeUnits: event.target.value }))} type="number" value={form.groupSizeUnits} />
          </label>
          <label className="text-sm font-bold text-foreground sm:col-span-2">Redondeo
            <select className={selectClassName} onChange={(event) => setForm((current) => ({ ...current, roundingMode: event.target.value as FinanceRoundingMode }))} value={form.roundingMode}>{roundingModeOptions.map((mode) => <option key={mode} value={mode}>{roundingModeLabels[mode]}</option>)}</select>
          </label>
        </div>
        <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60" disabled={isPending || !selectedProductId || !form.name.trim()} type="submit">
          {editingRuleId ? 'Actualizar regla' : 'Guardar regla'}
        </button>
        {editingRuleId ? <button className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-muted px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted/80" onClick={() => { setEditingRuleId(null); setForm(initialBaseCostRuleForm); }} type="button">Cancelar edición</button> : null}
      </form>
    </div>
  );
};
