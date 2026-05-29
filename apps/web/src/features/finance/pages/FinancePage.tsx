import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import {
  AlertTriangle,
  Boxes,
  Calculator,
  CircleDollarSign,
  Layers3,
  PackagePlus,
  PieChart,
  Plus,
  ReceiptText,
  Save,
  Soup,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { calculateBaseRawMaterialCost, calculatePackagingCost } from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import {
  useCreateFinanceBaseCostRule,
  useCreateFinanceProduct,
  useCreateFinancePurchase,
  useCreateFinanceStockAdjustment,
  useDeleteFinanceBaseCostRule,
  useFinanceBaseCostRules,
  useFinanceProducts,
  useFinanceRecipes,
  useFinanceStock,
  usePreviewFinanceOrderCost,
  useUpdateFinanceBaseCostRule,
  useUpdateFinanceRecipe,
} from '../hooks';
import type {
  CreateFinanceStockAdjustmentInput,
  FinanceBaseCostRule,
  FinanceBaseUnit,
  FinanceCostComponentType,
  FinanceCostRuleAppliesTo,
  FinanceProductCategory,
  FinanceProductWithMetrics,
  FinanceRecipe,
  FinanceRoundingMode,
  FinanceStockItem,
} from '../types';
import type { MenuItem } from '../../menu/menu-api';
import { useMenuItems } from '../../menu/menu-hooks';

type FinanceTab =
  | 'dashboard'
  | 'catalog'
  | 'purchases'
  | 'base-costs'
  | 'recipes'
  | 'calculator'
  | 'stock';

type TabItem = {
  id: FinanceTab;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

type ProductFormState = {
  name: string;
  category: FinanceProductCategory;
  baseUnit: FinanceBaseUnit;
  stockTracking: boolean;
};

type PurchaseFormState = {
  productId: string;
  purchaseDate: string;
  supplier: string;
  purchaseUnit: FinanceBaseUnit | '';
  purchaseQuantity: string;
  unitsPerPackage: string;
  priceMode: 'unit' | 'total';
  price: string;
};

type CalculatorFormState = {
  saleTotal: string;
  menuItemId: string;
  quantity: string;
};

type StockTargetFormState = {
  productId: string;
  targetQuantity: string;
  notes: string;
};

type BaseCostRuleFormState = {
  productId: string;
  name: string;
  componentType: FinanceCostComponentType;
  appliesTo: FinanceCostRuleAppliesTo;
  quantity: string;
  groupSizeUnits: string;
  roundingMode: FinanceRoundingMode;
  isActive: boolean;
};

type RecipeDraftItem = {
  productId: string;
  quantity: string;
  notes: string;
};

type FinanceFeedback = {
  tone: 'success' | 'error';
  title: string;
  description: string;
};

const tabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'catalog', label: 'Catálogo', icon: Boxes },
  { id: 'purchases', label: 'Compras', icon: ReceiptText },
  { id: 'base-costs', label: 'Costos base', icon: Layers3 },
  { id: 'recipes', label: 'Recetas', icon: Soup },
  { id: 'calculator', label: 'Calculadora', icon: Calculator },
  { id: 'stock', label: 'Stock', icon: Warehouse },
];

const categoryLabels: Record<FinanceProductCategory, string> = {
  raw_material: 'Materia prima',
  packaging: 'Packaging',
  operating_expense: 'Gasto operativo',
  service: 'Servicio',
  fuel: 'Combustible',
  investment: 'Inversión',
  other: 'Otro',
};

const baseUnitLabels: Record<FinanceBaseUnit, string> = {
  unit: 'unidad',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pack: 'pack',
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

const productCategoryOptions = Object.keys(categoryLabels) as FinanceProductCategory[];
const baseUnitOptions = Object.keys(baseUnitLabels) as FinanceBaseUnit[];
const componentTypeOptions = Object.keys(componentTypeLabels) as FinanceCostComponentType[];
const appliesToOptions = Object.keys(appliesToLabels) as FinanceCostRuleAppliesTo[];
const roundingModeOptions = Object.keys(roundingModeLabels) as FinanceRoundingMode[];

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialProductForm: ProductFormState = {
  name: '',
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
};

const initialPurchaseForm: PurchaseFormState = {
  productId: '',
  purchaseDate: todayIso(),
  supplier: '',
  purchaseUnit: '',
  purchaseQuantity: '1',
  unitsPerPackage: '1',
  priceMode: 'unit',
  price: '0',
};

const initialCalculatorForm: CalculatorFormState = {
  saleTotal: '0',
  menuItemId: '',
  quantity: '12',
};

const initialStockTargetForm: StockTargetFormState = {
  productId: '',
  targetQuantity: '',
  notes: '',
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

const getRuleDefaultsForComponentType = (
  componentType: FinanceCostComponentType,
): Pick<BaseCostRuleFormState, 'appliesTo' | 'roundingMode' | 'groupSizeUnits'> =>
  componentType === 'packaging'
    ? { appliesTo: 'per_started_dozen', roundingMode: 'ceil', groupSizeUnits: '12' }
    : { appliesTo: 'per_empanada', roundingMode: 'exact', groupSizeUnits: '12' };

const normalizeBaseCostRuleForm = (form: BaseCostRuleFormState): BaseCostRuleFormState => {
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

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin costo' : moneyFormatter.format(cents / 100);

const formatQuantity = (quantity: number, unit: FinanceBaseUnit): string =>
  `${quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${baseUnitLabels[unit]}`;

const toCents = (value: string): number => Math.round(Number(value || 0) * 100);
const toPositiveNumber = (value: string): number => Math.max(Number(value || 0), 0);

const estimateBaseCostFromRules = (rules: FinanceBaseCostRule[], empanadaCount: number): number => {
  const activeRules = rules.filter((rule) => rule.isActive && rule.latestCostCents !== null);
  const baseRawMaterial = calculateBaseRawMaterialCost({
    totalEmpanadas: empanadaCount,
    rules: activeRules,
  });
  const packaging = calculatePackagingCost({
    totalEmpanadas: empanadaCount,
    rules: activeRules,
  });

  return baseRawMaterial.totalCostCents + packaging.totalCostCents;
};

const getErrorDescription = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const selectClassName = inputClassName;

const FeedbackBanner = ({ feedback }: { feedback: FinanceFeedback | null }) => {
  if (!feedback) {
    return null;
  }

  const toneClassName =
    feedback.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-red-200 bg-red-50 text-red-900';

  return (
    <div
      className={`rounded-[1.5rem] border px-4 py-3 text-sm shadow-card ${toneClassName}`}
      role="status"
    >
      <p className="font-black">{feedback.title}</p>
      <p className="mt-1 font-semibold leading-6">{feedback.description}</p>
    </div>
  );
};

const KpiCard = ({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) => (
  <article className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card">
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden={true} />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{value}</p>
      </div>
    </div>
    <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">{description}</p>
  </article>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
    <p className="font-black text-foreground">{title}</p>
    <p className="mt-1 font-semibold leading-6 text-muted-foreground">{description}</p>
  </div>
);

const ProductCard = ({ product }: { product: FinanceProductWithMetrics }) => (
  <article
    aria-label={`Producto financiero ${product.name}`}
    className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-primary">
          {categoryLabels[product.category]}
        </p>
        <h3 className="mt-1 text-lg font-black text-foreground">{product.name}</h3>
        <p className="mt-1 text-xs font-bold text-muted-foreground">
          Unidad base: {baseUnitLabels[product.baseUnit]} ·{' '}
          {product.stockTracking ? 'Controla stock' : 'Sin stock'}
        </p>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
        {product.isActive ? 'Activo' : 'Pausado'}
      </span>
    </div>

    <dl className="mt-4 grid gap-2 sm:grid-cols-2">
      <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
        <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Último costo
        </dt>
        <dd className="mt-1 font-black text-foreground">
          {formatMoneyFromCents(product.latestCostPerBaseUnitCents)}
        </dd>
      </div>
      <div className="rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
        <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          Stock actual
        </dt>
        <dd className="mt-1 font-black text-foreground">
          {formatQuantity(product.stockQuantityBase, product.baseUnit)}
        </dd>
      </div>
    </dl>
  </article>
);

const ProductForm = ({
  onSubmit,
  isPending,
}: {
  onSubmit: (form: ProductFormState) => void;
  isPending: boolean;
}) => {
  const [form, setForm] = useState<ProductFormState>(initialProductForm);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
    setForm(initialProductForm);
  };

  return (
    <form
      className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2 text-primary">
        <Plus className="h-4 w-4" aria-hidden={true} />
        <h3 className="text-sm font-black uppercase tracking-wide">Alta rápida de producto</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-foreground">
          Nombre
          <input
            className={inputClassName}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={form.name}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Categoría
          <select
            className={selectClassName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                category: event.target.value as FinanceProductCategory,
              }))
            }
            value={form.category}
          >
            {productCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-foreground">
          Unidad base
          <select
            className={selectClassName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                baseUnit: event.target.value as FinanceBaseUnit,
              }))
            }
            value={form.baseUnit}
          >
            {baseUnitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {baseUnitLabels[unit]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-bold text-foreground">
          <input
            checked={form.stockTracking}
            onChange={(event) =>
              setForm((current) => ({ ...current, stockTracking: event.target.checked }))
            }
            type="checkbox"
          />
          Controlar stock
        </label>
      </div>
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        Guardar producto
      </button>
    </form>
  );
};

const PurchaseForm = ({
  products,
  onSubmit,
  isPending,
  resetSignal,
}: {
  products: FinanceProductWithMetrics[];
  onSubmit: (form: PurchaseFormState) => void;
  isPending: boolean;
  resetSignal: number;
}) => {
  const [form, setForm] = useState<PurchaseFormState>(initialPurchaseForm);
  const selectedProductId = form.productId || products[0]?.id || '';
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const purchaseUnit = form.purchaseUnit || selectedProduct?.baseUnit || 'unit';
  const needsConversion = Boolean(selectedProduct && purchaseUnit !== selectedProduct.baseUnit);
  const effectiveUnitsPerPackage = needsConversion ? toPositiveNumber(form.unitsPerPackage) : 1;
  const purchaseQuantity = toPositiveNumber(form.purchaseQuantity);
  const priceCents = toCents(form.price);
  const previewTotalBaseUnits = purchaseQuantity * effectiveUnitsPerPackage;
  const previewTotalPriceCents =
    form.priceMode === 'total' ? priceCents : Math.round(priceCents * purchaseQuantity);
  const previewCostPerBaseUnitCents =
    previewTotalBaseUnits > 0 && previewTotalPriceCents > 0
      ? Math.round(previewTotalPriceCents / previewTotalBaseUnits)
      : null;

  useEffect(() => {
    if (resetSignal === 0) {
      return;
    }

    setForm((current) => ({
      ...initialPurchaseForm,
      productId: current.productId,
      purchaseDate: todayIso(),
      supplier: current.supplier,
      purchaseUnit: current.purchaseUnit,
    }));
  }, [resetSignal]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      ...form,
      productId: selectedProductId,
      purchaseUnit,
      unitsPerPackage: String(effectiveUnitsPerPackage),
    });
  };

  return (
    <form
      className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2 text-primary">
        <PackagePlus className="h-4 w-4" aria-hidden={true} />
        <h3 className="text-sm font-black uppercase tracking-wide">Registrar compra</h3>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-foreground">
          Producto
          <select
            className={selectClassName}
            disabled={!products.length}
            onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setForm((current) => ({
                ...current,
                productId: event.target.value,
                purchaseUnit: product?.baseUnit ?? current.purchaseUnit,
                unitsPerPackage: '1',
              }));
            }}
            value={selectedProductId}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-foreground">
          Fecha
          <input
            className={inputClassName}
            onChange={(event) =>
              setForm((current) => ({ ...current, purchaseDate: event.target.value }))
            }
            type="date"
            value={form.purchaseDate}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Proveedor
          <input
            className={inputClassName}
            onChange={(event) =>
              setForm((current) => ({ ...current, supplier: event.target.value }))
            }
            value={form.supplier}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Unidad de compra
          <select
            className={selectClassName}
            disabled={!selectedProduct}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                purchaseUnit: event.target.value as FinanceBaseUnit,
                unitsPerPackage:
                  event.target.value === selectedProduct?.baseUnit ? '1' : current.unitsPerPackage,
              }))
            }
            value={purchaseUnit}
          >
            {baseUnitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {baseUnitLabels[unit]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-foreground">
          {purchaseUnit === 'pack'
            ? 'Cantidad de packs/bultos'
            : `Cantidad comprada (${baseUnitLabels[purchaseUnit]})`}
          <input
            className={inputClassName}
            min="0"
            onChange={(event) =>
              setForm((current) => ({ ...current, purchaseQuantity: event.target.value }))
            }
            step="0.001"
            type="number"
            value={form.purchaseQuantity}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          {selectedProduct
            ? `${baseUnitLabels[selectedProduct.baseUnit]} por ${baseUnitLabels[purchaseUnit]}`
            : 'Conversión a unidad base'}
          <input
            className={inputClassName}
            disabled={!needsConversion}
            min="0"
            onChange={(event) =>
              setForm((current) => ({ ...current, unitsPerPackage: event.target.value }))
            }
            step="0.001"
            type="number"
            value={needsConversion ? form.unitsPerPackage : '1'}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Cargo precio como
          <select
            className={selectClassName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                priceMode: event.target.value as PurchaseFormState['priceMode'],
              }))
            }
            value={form.priceMode}
          >
            <option value="unit">Precio por unidad de compra</option>
            <option value="total">Precio total pagado</option>
          </select>
        </label>
        <label className="text-sm font-bold text-foreground">
          {form.priceMode === 'total'
            ? 'Precio total pagado'
            : `Precio por ${baseUnitLabels[purchaseUnit]}`}
          <input
            className={inputClassName}
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            step="0.01"
            type="number"
            value={form.price}
          />
        </label>
      </div>
      <div className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground">
        <p>
          La <strong className="text-foreground">unidad base</strong> del producto es lo que usa
          stock, recetas y costos. Para papa por kilo: unidad de compra kg, cantidad 2,475,
          conversión 1. Para 100 cajas: unidad, cantidad 100, conversión 1; o pack, cantidad 1,
          conversión 100.
        </p>
        <p className="mt-2 font-black text-foreground">
          Preview: {formatQuantity(previewTotalBaseUnits, selectedProduct?.baseUnit ?? 'unit')} ·
          costo unitario base {formatMoneyFromCents(previewCostPerBaseUnitCents)}
        </p>
      </div>
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={isPending || !selectedProductId || purchaseQuantity <= 0 || priceCents <= 0}
        type="submit"
      >
        {isPending ? 'Guardando compra...' : 'Guardar compra'}
      </button>
    </form>
  );
};

const StockTargetForm = ({
  products,
  stock,
  onSubmit,
  isPending,
  resetSignal,
}: {
  products: FinanceProductWithMetrics[];
  stock: FinanceStockItem[];
  onSubmit: (input: {
    productId: string;
    movementType: CreateFinanceStockAdjustmentInput['movementType'];
    quantity: number;
    notes?: string;
  }) => void;
  isPending: boolean;
  resetSignal: number;
}) => {
  const trackedProducts = products.filter((product) => product.stockTracking);
  const [form, setForm] = useState<StockTargetFormState>(initialStockTargetForm);
  const selectedProductId = form.productId || trackedProducts[0]?.id || '';
  const selectedProduct = trackedProducts.find((product) => product.id === selectedProductId);
  const currentQuantity =
    stock.find((item) => item.product.id === selectedProductId)?.quantityBase ??
    selectedProduct?.stockQuantityBase ??
    0;
  const hasTargetQuantity = form.targetQuantity.trim() !== '';
  const targetQuantity = hasTargetQuantity
    ? toPositiveNumber(form.targetQuantity)
    : currentQuantity;
  const difference = targetQuantity - currentQuantity;
  const movementType: CreateFinanceStockAdjustmentInput['movementType'] =
    difference >= 0 ? 'manual_in' : 'manual_out';
  const adjustmentQuantity = Math.abs(difference);

  useEffect(() => {
    if (resetSignal === 0) {
      return;
    }

    setForm((current) => ({
      ...initialStockTargetForm,
      productId: current.productId,
    }));
  }, [resetSignal]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProduct || !hasTargetQuantity || adjustmentQuantity <= 0) {
      return;
    }

    onSubmit({
      productId: selectedProduct.id,
      movementType,
      quantity: adjustmentQuantity,
      notes:
        form.notes ||
        `Manual stock correction: ${currentQuantity} -> ${targetQuantity} ${selectedProduct.baseUnit}`,
    });
  };

  return (
    <form
      className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-2 text-primary">
        <Warehouse className="h-4 w-4" aria-hidden={true} />
        <h3 className="text-sm font-black uppercase tracking-wide">Corrección manual de stock</h3>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
        Poné el stock objetivo real y el sistema crea la entrada o salida necesaria. Ejemplo: si
        quedaron 300 cajas y deberían ser 100, cargá objetivo 100.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-foreground">
          Producto
          <select
            className={selectClassName}
            disabled={!trackedProducts.length}
            onChange={(event) =>
              setForm((current) => ({ ...current, productId: event.target.value }))
            }
            value={selectedProductId}
          >
            {trackedProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-foreground">
          Stock objetivo {selectedProduct ? `(${baseUnitLabels[selectedProduct.baseUnit]})` : ''}
          <input
            className={inputClassName}
            min="0"
            onChange={(event) =>
              setForm((current) => ({ ...current, targetQuantity: event.target.value }))
            }
            step="0.001"
            type="number"
            value={form.targetQuantity}
          />
        </label>
        <label className="text-sm font-bold text-foreground md:col-span-2">
          Nota opcional
          <input
            className={inputClassName}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Ej: corrección por compra duplicada"
            value={form.notes}
          />
        </label>
      </div>
      <div className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground ring-1 ring-border/60">
        <p>
          Stock actual:{' '}
          <strong className="text-foreground">
            {formatQuantity(currentQuantity, selectedProduct?.baseUnit ?? 'unit')}
          </strong>
        </p>
        <p>
          Movimiento a crear:{' '}
          <strong className="text-foreground">
            {adjustmentQuantity > 0 && selectedProduct
              ? `${difference > 0 ? 'Entrada' : 'Salida'} de ${formatQuantity(
                  adjustmentQuantity,
                  selectedProduct.baseUnit,
                )}`
              : 'sin cambios'}
          </strong>
        </p>
      </div>
      <button
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        disabled={isPending || !selectedProduct || !hasTargetQuantity || adjustmentQuantity <= 0}
        type="submit"
      >
        {isPending ? 'Aplicando ajuste...' : 'Aplicar ajuste'}
      </button>
    </form>
  );
};

const BaseCostRulesWorkspace = ({
  rules,
  products,
  onCreate,
  onUpdate,
  onDelete,
  isPending,
}: {
  rules: FinanceBaseCostRule[];
  products: FinanceProductWithMetrics[];
  onCreate: (form: BaseCostRuleFormState) => void;
  onUpdate: (id: string, updates: Partial<BaseCostRuleFormState> & { isActive?: boolean }) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) => {
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
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          {[12, 18, 24].map((quantity) => (
            <KpiCard
              description="Estimación con reglas activas y último costo cargado."
              icon={Layers3}
              key={quantity}
              label={`Base ${quantity} emp.`}
              value={formatMoneyFromCents(estimateBaseCostFromRules(activeRules, quantity))}
            />
          ))}
        </div>

        {rules.length ? (
          rules.map((rule) => (
            <article
              className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
              key={rule.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    {componentTypeLabels[rule.componentType]} · {appliesToLabels[rule.appliesTo]}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-foreground">{rule.name}</h3>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    Producto: {rule.productName ?? rule.productId} · Cantidad {rule.quantity}{' '}
                    {rule.appliesTo === 'per_started_dozen'
                      ? `cada ${rule.groupSizeUnits} empanadas`
                      : 'por empanada'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    rule.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-amber-50 text-amber-700 ring-amber-100'
                  }`}
                >
                  {rule.isActive ? 'Activa' : 'Pausada'}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background px-3 py-2 ring-1 ring-border/60">
                <p className="text-sm font-black text-foreground">
                  Último costo: {formatMoneyFromCents(rule.latestCostCents)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => {
                      setEditingRuleId(rule.id);
                      setForm({
                        productId: rule.productId,
                        name: rule.name,
                        componentType: rule.componentType,
                        appliesTo: rule.appliesTo,
                        quantity: String(rule.quantity),
                        groupSizeUnits: String(rule.groupSizeUnits),
                        roundingMode: rule.roundingMode,
                        isActive: rule.isActive,
                      });
                    }}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => onUpdate(rule.id, { isActive: !rule.isActive })}
                    type="button"
                  >
                    {rule.isActive ? 'Pausar' : 'Reactivar'}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => onDelete(rule.id)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden={true} />
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="Sin reglas de costo base"
            description="Configurá tapas por empanada y packaging por docena iniciada para que la calculadora deje de trabajar a ciegas."
          />
        )}
      </div>

      <form
        className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2 text-primary">
          <Layers3 className="h-4 w-4" aria-hidden={true} />
          <h3 className="text-sm font-black uppercase tracking-wide">
            {editingRuleId ? 'Editar regla base' : 'Nueva regla base'}
          </h3>
        </div>
        <label className="mt-4 block text-sm font-bold text-foreground">
          Producto
          <select
            className={selectClassName}
            disabled={!products.length}
            onChange={(event) =>
              setForm((current) => ({ ...current, productId: event.target.value }))
            }
            value={selectedProductId}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-bold text-foreground">
          Nombre de regla
          <input
            className={inputClassName}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ej: Tapa por empanada"
            required
            value={form.name}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-foreground">
            Tipo
            <select
              className={selectClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  componentType: event.target.value as FinanceCostComponentType,
                  ...getRuleDefaultsForComponentType(
                    event.target.value as FinanceCostComponentType,
                  ),
                }))
              }
              value={form.componentType}
            >
              {componentTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {componentTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-foreground">
            Aplica
            <select
              className={selectClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  appliesTo: event.target.value as FinanceCostRuleAppliesTo,
                  roundingMode:
                    event.target.value === 'per_started_dozen' ? 'ceil' : current.roundingMode,
                }))
              }
              value={form.appliesTo}
            >
              {availableAppliesToOptions.map((appliesTo) => (
                <option key={appliesTo} value={appliesTo}>
                  {appliesToLabels[appliesTo]}
                </option>
              ))}
            </select>
          </label>
          <p className="rounded-2xl bg-background px-3 py-2 text-xs font-bold leading-5 text-muted-foreground ring-1 ring-border/60 sm:col-span-2">
            Tip contable: si el producto base es una tapa individual, usá “Por empanada”. Si el
            producto base es un pack/bulto completo, “Por docena iniciada” consume el grupo.
            Packaging siempre queda por docena iniciada.
          </p>
          <label className="text-sm font-bold text-foreground">
            Cantidad
            <input
              className={inputClassName}
              min="0"
              onChange={(event) =>
                setForm((current) => ({ ...current, quantity: event.target.value }))
              }
              step="0.001"
              type="number"
              value={form.quantity}
            />
          </label>
          <label className="text-sm font-bold text-foreground">
            Grupo
            <input
              className={inputClassName}
              min="1"
              onChange={(event) =>
                setForm((current) => ({ ...current, groupSizeUnits: event.target.value }))
              }
              type="number"
              value={form.groupSizeUnits}
            />
          </label>
          <label className="text-sm font-bold text-foreground sm:col-span-2">
            Redondeo
            <select
              className={selectClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  roundingMode: event.target.value as FinanceRoundingMode,
                }))
              }
              value={form.roundingMode}
            >
              {roundingModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {roundingModeLabels[mode]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          disabled={isPending || !selectedProductId || !form.name.trim()}
          type="submit"
        >
          {editingRuleId ? 'Actualizar regla' : 'Guardar regla'}
        </button>
        {editingRuleId ? (
          <button
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-muted px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted/80"
            onClick={() => {
              setEditingRuleId(null);
              setForm(initialBaseCostRuleForm);
            }}
            type="button"
          >
            Cancelar edición
          </button>
        ) : null}
      </form>
    </div>
  );
};

const RecipeWorkspace = ({
  recipes,
  menuItems,
  products,
  baseCostRules,
  onSave,
  isPending,
}: {
  recipes: FinanceRecipe[];
  menuItems: MenuItem[];
  products: FinanceProductWithMetrics[];
  baseCostRules: FinanceBaseCostRule[];
  onSave: (menuItemId: string, rows: RecipeDraftItem[]) => void;
  isPending: boolean;
}) => {
  const activeBaseCostProductIds = new Set(
    baseCostRules.filter((rule) => rule.isActive).map((rule) => rule.productId),
  );
  const recipeProducts = products.filter(
    (product) => product.category === 'raw_material' && !activeBaseCostProductIds.has(product.id),
  );
  const activeBaseCostRules = baseCostRules.filter((rule) => rule.isActive);
  const baseCostPerDozenCents = estimateBaseCostFromRules(activeBaseCostRules, 12);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const menuItemId = selectedMenuItemId || menuItems[0]?.id || recipes[0]?.menuItemId || '';
  const selectedRecipe = recipes.find((recipe) => recipe.menuItemId === menuItemId);
  const recipeCostPerDozenCents = selectedRecipe?.totalCostPerDozenCents ?? 0;
  const totalCostPerDozenCents = baseCostPerDozenCents + recipeCostPerDozenCents;
  const totalCostPerUnitCents = Math.round(totalCostPerDozenCents / 12);
  const [rows, setRows] = useState<RecipeDraftItem[]>([]);

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
    if (!firstProductId) {
      return;
    }
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
      <EmptyState
        title="Sin variedades de menú"
        description="Primero cargá variedades en Menú. Después Finanzas puede asociarles recetas por docena."
      />
    );
  }

  return (
    <form
      className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Soup className="h-4 w-4" aria-hidden={true} />
          <h3 className="text-sm font-black uppercase tracking-wide">Receta por docena</h3>
        </div>
        <div className="rounded-2xl bg-background px-3 py-2 text-sm font-black text-foreground ring-1 ring-border/60">
          Total docena {formatMoneyFromCents(totalCostPerDozenCents)} · unidad{' '}
          {formatMoneyFromCents(totalCostPerUnitCents)}
        </div>
      </div>

      <label className="mt-4 block text-sm font-bold text-foreground">
        Variedad
        <select
          className={selectClassName}
          onChange={(event) => setSelectedMenuItemId(event.target.value)}
          value={menuItemId}
        >
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground">
        <p className="font-black text-foreground">
          Costo base aparte por docena:{' '}
          <span className="tabular-nums">{formatMoneyFromCents(baseCostPerDozenCents)}</span>
        </p>
        <p className="font-black text-foreground">
          Costo receta por docena:{' '}
          <span className="tabular-nums">{formatMoneyFromCents(recipeCostPerDozenCents)}</span>
        </p>
        <p>
          No lo cargues como ingrediente: estos productos ya se suman en la calculadora desde Costos
          base.
        </p>
        {activeBaseCostRules.length ? (
          <p className="mt-1 text-xs font-black uppercase tracking-wide text-primary">
            {activeBaseCostRules.map((rule) => rule.productName ?? rule.name).join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row, index) => {
            const product = products.find((item) => item.id === row.productId);
            const recipeItem = selectedRecipe?.items.find(
              (item) => item.productId === row.productId,
            );
            const latestCostCents =
              recipeItem?.latestCostCents ?? product?.latestCostPerBaseUnitCents ?? null;
            const quantity = toPositiveNumber(row.quantity);
            const lineCostCents =
              latestCostCents === null || latestCostCents === undefined
                ? null
                : Math.round(latestCostCents * quantity);
            const isBaseCostProduct = activeBaseCostProductIds.has(row.productId);
            const rowOptions =
              product && !recipeProducts.some((item) => item.id === product.id)
                ? [product, ...recipeProducts]
                : recipeProducts;

            return (
              <div
                className="grid gap-3 rounded-2xl border border-border/70 bg-background p-3 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto]"
                key={`${row.productId}-${index}`}
              >
                <label className="text-sm font-bold text-foreground">
                  Insumo
                  <select
                    className={selectClassName}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, productId: event.target.value } : item,
                        ),
                      )
                    }
                    value={row.productId}
                  >
                    {rowOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold text-foreground">
                  Cantidad/{baseUnitLabels[product?.baseUnit ?? 'unit']}
                  <input
                    className={inputClassName}
                    min="0"
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, quantity: event.target.value } : item,
                        ),
                      )
                    }
                    step="0.001"
                    type="number"
                    value={row.quantity}
                  />
                </label>
                <label className="text-sm font-bold text-foreground">
                  Nota
                  <input
                    className={inputClassName}
                    onChange={(event) =>
                      setRows((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, notes: event.target.value } : item,
                        ),
                      )
                    }
                    value={row.notes}
                  />
                </label>
                <button
                  aria-label="Quitar ingrediente"
                  className="self-end rounded-full bg-red-50 p-3 text-red-700 ring-1 ring-red-100 transition hover:bg-red-100"
                  onClick={() =>
                    setRows((current) => current.filter((_item, itemIndex) => itemIndex !== index))
                  }
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden={true} />
                </button>
                <div className="rounded-2xl bg-card px-3 py-2 text-xs font-bold leading-5 text-muted-foreground ring-1 ring-border/60 md:col-span-4">
                  <p>
                    Último costo:{' '}
                    <strong className="text-foreground">
                      {formatMoneyFromCents(latestCostCents)}
                      {product ? ` / ${baseUnitLabels[product.baseUnit]}` : ''}
                    </strong>{' '}
                    · Costo en esta docena:{' '}
                    <strong className="text-foreground">
                      {formatMoneyFromCents(lineCostCents)}
                    </strong>
                  </p>
                  {isBaseCostProduct ? (
                    <p className="mt-1 text-amber-800">
                      Este insumo ya está en Costos base. Al guardar, no se va a incluir en la
                      receta para evitar doble conteo.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="La variedad todavía no tiene receta"
            description="Agregá sólo el relleno específico. Tapas, cajas y papel van en Costos base para no duplicar."
          />
        )}
      </div>

      {selectedRecipe?.warnings.length ? (
        <div className="mt-4 space-y-2">
          {selectedRecipe.warnings.map((warning) => (
            <p
              className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900"
              key={`${warning.code}-${warning.message}`}
            >
              {warning.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center justify-center rounded-full bg-muted px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted/80 disabled:opacity-60"
          disabled={!recipeProducts.length}
          onClick={addRow}
          type="button"
        >
          Agregar ingrediente
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          disabled={isPending || !menuItemId}
          type="submit"
        >
          <Save className="h-4 w-4" aria-hidden={true} />
          Guardar receta
        </button>
      </div>
    </form>
  );
};

const StockList = ({ stock }: { stock: FinanceStockItem[] }) => {
  if (!stock.length) {
    return (
      <EmptyState
        title="Sin movimientos de stock"
        description="Las compras de productos con control de stock y los ajustes manuales van a aparecer acá."
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {stock.map((item) => (
        <article
          className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card"
          key={item.product.id}
        >
          <p className="text-xs font-black uppercase tracking-wide text-primary">
            {categoryLabels[item.product.category]}
          </p>
          <h3 className="mt-1 text-lg font-black text-foreground">{item.product.name}</h3>
          <p className="mt-3 rounded-2xl bg-background px-3 py-2 font-black tabular-nums text-foreground ring-1 ring-border/60">
            {formatQuantity(item.quantityBase, item.product.baseUnit)}
          </p>
        </article>
      ))}
    </div>
  );
};

export const FinancePage = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [calculatorForm, setCalculatorForm] = useState<CalculatorFormState>(initialCalculatorForm);
  const [feedback, setFeedback] = useState<FinanceFeedback | null>(null);
  const [purchaseResetSignal, setPurchaseResetSignal] = useState(0);
  const [stockResetSignal, setStockResetSignal] = useState(0);
  const productsQuery = useFinanceProducts();
  const stockQuery = useFinanceStock();
  const baseCostRulesQuery = useFinanceBaseCostRules();
  const recipesQuery = useFinanceRecipes();
  const menuItemsQuery = useMenuItems();
  const createProduct = useCreateFinanceProduct();
  const createPurchase = useCreateFinancePurchase();
  const createStockAdjustment = useCreateFinanceStockAdjustment();
  const createBaseCostRule = useCreateFinanceBaseCostRule();
  const updateBaseCostRule = useUpdateFinanceBaseCostRule();
  const deleteBaseCostRule = useDeleteFinanceBaseCostRule();
  const updateRecipe = useUpdateFinanceRecipe();
  const previewOrderCost = usePreviewFinanceOrderCost();

  const products = productsQuery.data ?? [];
  const stock = stockQuery.data ?? [];
  const baseCostRules = baseCostRulesQuery.data ?? [];
  const recipes = recipesQuery.data ?? [];
  const menuItems = menuItemsQuery.data ?? [];
  const productsWithoutCost = products.filter(
    (product) => product.latestCostPerBaseUnitCents === null,
  );
  const trackedProducts = products.filter((product) => product.stockTracking);

  const dashboardMetrics = useMemo(
    () => ({
      products: products.length,
      tracked: trackedProducts.length,
      purchaseCount: products.reduce((total, product) => total + product.purchaseCount, 0),
      warnings: products.reduce((total, product) => total + product.warnings.length, 0),
    }),
    [products, trackedProducts.length],
  );

  const handleCreateProduct = (form: ProductFormState) => {
    createProduct.mutate(
      { ...form, isActive: true },
      {
        onSuccess: (product) =>
          setFeedback({
            tone: 'success',
            title: 'Producto creado',
            description: `${product.name} ya está disponible para compras, costos y stock.`,
          }),
        onError: (error) =>
          setFeedback({
            tone: 'error',
            title: 'No se pudo crear el producto',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleCreatePurchase = (form: PurchaseFormState) => {
    const priceCents = toCents(form.price);
    createPurchase.mutate(
      {
        purchaseDate: form.purchaseDate,
        supplier: form.supplier || undefined,
        items: [
          {
            productId: form.productId,
            purchaseUnit: form.purchaseUnit || 'unit',
            purchaseQuantity: toPositiveNumber(form.purchaseQuantity),
            unitsPerPackage: toPositiveNumber(form.unitsPerPackage),
            ...(form.priceMode === 'total'
              ? { totalPriceCents: priceCents }
              : { unitPriceCents: priceCents }),
          },
        ],
      },
      {
        onSuccess: (purchase) => {
          setPurchaseResetSignal((current) => current + 1);
          setFeedback({
            tone: 'success',
            title: 'Compra registrada',
            description: `Se guardó la compra del ${purchase.purchaseDate}. El stock y los costos ya fueron actualizados.`,
          });
        },
        onError: (error) =>
          setFeedback({
            tone: 'error',
            title: 'No se pudo registrar la compra',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleStockTargetAdjustment = (input: {
    productId: string;
    movementType: CreateFinanceStockAdjustmentInput['movementType'];
    quantity: number;
    notes?: string;
  }) => {
    createStockAdjustment.mutate(input, {
      onSuccess: () => {
        setStockResetSignal((current) => current + 1);
        setFeedback({
          tone: 'success',
          title: 'Stock corregido',
          description: 'Se creó el movimiento manual y el stock quedó listo para recalcular.',
        });
      },
      onError: (error) =>
        setFeedback({
          tone: 'error',
          title: 'No se pudo corregir el stock',
          description: getErrorDescription(error),
        }),
    });
  };

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Finanzas"
        title="Finanzas"
        description="Un espacio único para costos, compras, stock y rentabilidad. Si faltan datos, la app avisa sin romper la operación."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sidebar-muted ring-1 ring-white/10">
          <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden={true} />
          MVP financiero
        </span>
      </PageHero>

      <FeedbackBanner feedback={feedback} />

      <div
        aria-label="Secciones de finanzas"
        className="grid gap-2 rounded-[1.5rem] border border-border/70 bg-card p-2 shadow-card sm:grid-cols-2 lg:grid-cols-7"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-controls={`finance-panel-${tab.id}`}
              aria-selected={isActive}
              className={
                isActive
                  ? 'inline-flex items-center justify-center gap-2 rounded-2xl bg-sidebar px-3 py-2 text-sm font-black text-white shadow-card'
                  : 'inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-muted-foreground transition hover:bg-background hover:text-foreground'
              }
              id={`finance-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby={`finance-tab-${activeTab}`}
        className="space-y-5"
        id={`finance-panel-${activeTab}`}
        role="tabpanel"
      >
        {activeTab === 'dashboard' ? (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                description="Productos disponibles para costeo y compras."
                icon={Boxes}
                label="Catálogo"
                value={dashboardMetrics.products.toLocaleString('es-AR')}
              />
              <KpiCard
                description="Productos que actualizan el stock desde compras."
                icon={Warehouse}
                label="Con stock"
                value={dashboardMetrics.tracked.toLocaleString('es-AR')}
              />
              <KpiCard
                description="Compras históricas usadas para último costo."
                icon={ReceiptText}
                label="Compras"
                value={dashboardMetrics.purchaseCount.toLocaleString('es-AR')}
              />
              <KpiCard
                description="Advertencias que requieren completar costos."
                icon={AlertTriangle}
                label="Alertas"
                value={dashboardMetrics.warnings.toLocaleString('es-AR')}
              />
            </div>
            {productsWithoutCost.length ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-black">Costos incompletos</p>
                <p className="mt-1 font-semibold">
                  {productsWithoutCost.length} producto(s) todavía no tienen historial de compra.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTab === 'catalog' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-3">
              {productsQuery.isLoading ? (
                <EmptyState
                  title="Cargando catálogo"
                  description="Buscando productos financieros..."
                />
              ) : products.length ? (
                products.map((product) => <ProductCard key={product.id} product={product} />)
              ) : (
                <EmptyState
                  title="Todavía no cargaste productos financieros"
                  description="Creá materia prima, packaging o gastos para empezar a calcular costos reales."
                />
              )}
            </div>
            <ProductForm isPending={createProduct.isPending} onSubmit={handleCreateProduct} />
          </div>
        ) : null}

        {activeTab === 'purchases' ? (
          <div className="space-y-4">
            <PurchaseForm
              isPending={createPurchase.isPending}
              onSubmit={handleCreatePurchase}
              products={products}
              resetSignal={purchaseResetSignal}
            />
            <EmptyState
              title="Historial de compras"
              description="PR2 expone creación de compras. El historial completo queda como refinamiento posterior para no inflar este slice."
            />
          </div>
        ) : null}

        {activeTab === 'base-costs' ? (
          <BaseCostRulesWorkspace
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

        {activeTab === 'recipes' ? (
          <RecipeWorkspace
            baseCostRules={baseCostRules}
            isPending={updateRecipe.isPending}
            menuItems={menuItems}
            onSave={handleSaveRecipe}
            products={products}
            recipes={recipes}
          />
        ) : null}

        {activeTab === 'calculator' ? (
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

        {activeTab === 'stock' ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
            {stockQuery.isLoading ? (
              <EmptyState title="Cargando stock" description="Buscando saldos actuales..." />
            ) : (
              <StockList stock={stock} />
            )}
            <StockTargetForm
              isPending={createStockAdjustment.isPending}
              onSubmit={handleStockTargetAdjustment}
              products={products}
              resetSignal={stockResetSignal}
              stock={stock}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};
