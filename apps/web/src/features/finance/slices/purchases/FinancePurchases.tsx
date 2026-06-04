import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, PackagePlus, ReceiptText, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { getBusinessDateIso } from '@te-pinta/shared';

import { FinanceActionSheet } from '../../components/FinanceActionSheet';
import { FinanceTable, type FinanceTableColumn } from '../../components/FinanceTable';
import {
  buildPurchaseRows,
  getPurchaseItemImpact,
  summarizePriceDelta,
  type PurchaseRow,
  type PurchaseSortField,
  type PurchaseSortState,
  type PurchaseStatusFilter,
} from '../../helpers/purchaseImpact';
import { useCancelFinancePurchase, useCreateFinancePurchase } from '../../hooks';
import type {
  FinanceBaseUnit,
  FinanceProductWithMetrics,
  FinancePurchaseDetail,
  FinancePurchaseItem,
  FinancePurchaseItemImpact,
} from '../../types';

type FinancePurchasesProps = {
  products: FinanceProductWithMetrics[];
  purchases: FinancePurchaseDetail[];
  isLoading: boolean;
};

type PurchaseFormState = {
  productId: string;
  purchaseDate: string;
  supplier: string;
  receiptNumber: string;
  notes: string;
  purchaseUnit: FinanceBaseUnit | '';
  purchaseQuantity: string;
  unitsPerPackage: string;
  priceMode: 'unit' | 'total';
  price: string;
  itemNotes: string;
};

type PurchaseFeedback = {
  tone: 'success' | 'error';
  title: string;
  description: string;
};

const baseUnitLabels: Record<FinanceBaseUnit, string> = {
  unit: 'unidad',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pack: 'pack',
};

const baseUnitOptions = Object.keys(baseUnitLabels) as FinanceBaseUnit[];
const purchaseStatusFilters: { id: PurchaseStatusFilter; label: string }[] = [
  { id: 'active', label: 'Activas' },
  { id: 'canceled', label: 'Anuladas' },
  { id: 'all', label: 'Todas' },
];

const todayIso = () => getBusinessDateIso(new Date());

const initialPurchaseForm = (): PurchaseFormState => ({
  productId: '',
  purchaseDate: todayIso(),
  supplier: '',
  receiptNumber: '',
  notes: '',
  purchaseUnit: '',
  purchaseQuantity: '1',
  unitsPerPackage: '1',
  priceMode: 'unit',
  price: '0',
  itemNotes: '',
});

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin dato' : moneyFormatter.format(cents / 100);

const formatSignedMoneyFromCents = (cents: number): string => {
  const formatted = formatMoneyFromCents(Math.abs(cents));
  return `${cents > 0 ? '+' : cents < 0 ? '-' : ''}${formatted}`;
};

const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? 'sin %'
    : `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

const formatQuantity = (quantity: number | null | undefined, unit: FinanceBaseUnit): string =>
  quantity === null || quantity === undefined
    ? 'Sin dato'
    : `${quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${baseUnitLabels[unit]}`;

const formatDate = (value: string): string => {
  const dateValue = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateValue);
};

const toCents = (value: string): number => Math.round(Number(value || 0) * 100);
const toPositiveNumber = (value: string): number => Math.max(Number(value || 0), 0);

const getErrorDescription = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

const defaultSortDirection = (field: PurchaseSortField) =>
  field === 'date' || field === 'total' || field === 'items' ? 'descending' : 'ascending';

const toggleSort = (current: PurchaseSortState, field: PurchaseSortField): PurchaseSortState => ({
  field,
  direction:
    current.field === field
      ? current.direction === 'ascending'
        ? 'descending'
        : 'ascending'
      : defaultSortDirection(field),
});

const sortDirectionFor = (sort: PurchaseSortState, field: PurchaseSortField) =>
  sort.field === field ? sort.direction : 'none';

const productMapById = (products: FinanceProductWithMetrics[]) =>
  new Map(products.map((product) => [product.id, product]));

const FeedbackBanner = ({ feedback }: { feedback: PurchaseFeedback | null }) => {
  if (!feedback) {
    return null;
  }

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

const StatusBadge = ({ purchase }: { purchase: PurchaseRow }) => {
  const isCanceled = purchase.status === 'canceled';

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        isCanceled
          ? 'bg-amber-100 text-amber-800 ring-amber-200'
          : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      }`}
    >
      {isCanceled ? 'Anulada' : 'Activa'}
    </span>
  );
};

const DeltaBadge = ({ impact }: { impact: FinancePurchaseItemImpact | undefined }) => {
  const summary = summarizePriceDelta(impact);
  const Icon = summary.tone === 'positive' ? TrendingUp : summary.tone === 'negative' ? TrendingDown : null;
  const className =
    summary.tone === 'positive'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : summary.tone === 'negative'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
  const valueText =
    summary.deltaCents === null
      ? summary.label
      : `${summary.label} ${formatSignedMoneyFromCents(summary.deltaCents)} · ${formatPercent(
          summary.deltaPercent,
        )}`;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden={true} /> : null}
      {valueText}
    </span>
  );
};

const PurchaseItemDetail = ({
  item,
  impact,
  product,
}: {
  item: FinancePurchaseItem;
  impact: FinancePurchaseItemImpact | undefined;
  product: FinanceProductWithMetrics | undefined;
}) => {
  const unit = product?.baseUnit ?? 'unit';

  return (
    <article className="rounded-2xl border border-border/70 bg-white px-3 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black text-foreground">{product?.name ?? item.productId}</p>
          {item.notes ? <p className="mt-1 font-semibold text-muted-foreground">{item.notes}</p> : null}
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/15">
          Cantidad: {formatQuantity(item.totalBaseUnits, unit)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 md:grid-cols-4">
        <div className="rounded-xl bg-background px-3 py-2">
          <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Stock antes</dt>
          <dd className="mt-1 font-black text-foreground">Stock antes: {formatQuantity(impact?.stockBeforeBase, unit)}</dd>
        </div>
        <div className="rounded-xl bg-background px-3 py-2">
          <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Stock después</dt>
          <dd className="mt-1 font-black text-foreground">Stock después: {formatQuantity(impact?.stockAfterBase, unit)}</dd>
        </div>
        <div className="rounded-xl bg-background px-3 py-2">
          <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Último precio</dt>
          <dd className="mt-1 font-black text-foreground">
            Último precio: {formatMoneyFromCents(impact?.previousCostPerBaseUnitCents)}
          </dd>
        </div>
        <div className="rounded-xl bg-background px-3 py-2">
          <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">Precio nuevo</dt>
          <dd className="mt-1 font-black text-foreground">
            Precio nuevo: {formatMoneyFromCents(impact?.newCostPerBaseUnitCents ?? item.costPerBaseUnitCents)}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-muted-foreground">
          Precio total {formatMoneyFromCents(item.totalPriceCents)} · compra en{' '}
          {formatQuantity(item.purchaseQuantity, item.purchaseUnit)}
        </p>
        <DeltaBadge impact={impact} />
      </div>
    </article>
  );
};

const PurchaseDetailPanel = ({
  purchase,
  products,
}: {
  purchase: PurchaseRow;
  products: FinanceProductWithMetrics[];
}) => {
  const productsById = productMapById(products);

  return (
    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <ReceiptText className="h-4 w-4" aria-hidden={true} />
            <h4 className="text-sm font-black uppercase tracking-wide">Detalle de compra</h4>
          </div>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            {purchase.supplier || 'Sin proveedor'} · {formatDate(purchase.purchaseDate)}
          </p>
          {purchase.receiptNumber ? (
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Comprobante: {purchase.receiptNumber}
            </p>
          ) : null}
          {purchase.notes ? <p className="mt-1 text-sm font-semibold text-foreground">{purchase.notes}</p> : null}
        </div>
        <StatusBadge purchase={purchase} />
      </div>
      <div className="mt-4 space-y-3">
        {purchase.items.map((item) => (
          <PurchaseItemDetail
            impact={getPurchaseItemImpact(purchase, item)}
            item={item}
            key={item.id}
            product={productsById.get(item.productId)}
          />
        ))}
      </div>
    </div>
  );
};

export const FinancePurchases = ({ products, purchases, isLoading }: FinancePurchasesProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PurchaseSortState>({ field: 'date', direction: 'descending' });
  const [statusFilter, setStatusFilter] = useState<PurchaseStatusFilter>('active');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PurchaseFormState>(() => initialPurchaseForm());
  const [createFeedback, setCreateFeedback] = useState<PurchaseFeedback | null>(null);
  const [cancelFeedback, setCancelFeedback] = useState<PurchaseFeedback | null>(null);
  const createPurchase = useCreateFinancePurchase();
  const cancelPurchase = useCancelFinancePurchase();
  const productsById = useMemo(() => productMapById(products), [products]);
  const selectedProductId = createForm.productId || products[0]?.id || '';
  const selectedProduct = productsById.get(selectedProductId);
  const purchaseUnit = createForm.purchaseUnit || selectedProduct?.baseUnit || 'unit';
  const needsConversion = Boolean(selectedProduct && purchaseUnit !== selectedProduct.baseUnit);
  const effectiveUnitsPerPackage = needsConversion ? toPositiveNumber(createForm.unitsPerPackage) : 1;
  const purchaseQuantity = toPositiveNumber(createForm.purchaseQuantity);
  const priceCents = toCents(createForm.price);
  const previewTotalBaseUnits = purchaseQuantity * effectiveUnitsPerPackage;
  const previewTotalPriceCents =
    createForm.priceMode === 'total' ? priceCents : Math.round(priceCents * purchaseQuantity);
  const previewCostPerBaseUnitCents =
    previewTotalBaseUnits > 0 && previewTotalPriceCents > 0
      ? Math.round(previewTotalPriceCents / previewTotalBaseUnits)
      : null;
  const rows = useMemo(
    () => buildPurchaseRows(purchases, products, search, sort, statusFilter),
    [products, purchases, search, sort, statusFilter],
  );
  const totalSpentCents = rows.reduce((total, purchase) => total + purchase.totalCents, 0);
  const selectedPurchase = selectedPurchaseId
    ? rows.find((purchase) => purchase.id === selectedPurchaseId) ?? null
    : null;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createPurchase.mutate(
      {
        purchaseDate: createForm.purchaseDate,
        supplier: createForm.supplier || undefined,
        receiptNumber: createForm.receiptNumber || undefined,
        notes: createForm.notes || undefined,
        items: [
          {
            productId: selectedProductId,
            purchaseUnit,
            purchaseQuantity,
            unitsPerPackage: effectiveUnitsPerPackage,
            ...(createForm.priceMode === 'total'
              ? { totalPriceCents: priceCents }
              : { unitPriceCents: priceCents }),
            notes: createForm.itemNotes || undefined,
          },
        ],
      },
      {
        onSuccess: (purchase) => {
          setCreateFeedback({
            tone: 'success',
            title: 'Compra registrada',
            description: `Se guardó la compra del ${purchase.purchaseDate}. Podés cargar otra sin cerrar esta ventana.`,
          });
          setCreateForm((current) => ({
            ...initialPurchaseForm(),
            productId: current.productId,
            supplier: current.supplier,
            purchaseUnit: current.purchaseUnit,
          }));
        },
        onError: (error) =>
          setCreateFeedback({
            tone: 'error',
            title: 'No se pudo registrar la compra',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleCancel = (purchase: PurchaseRow) => {
    const confirmed = window.confirm(
      '¿Anular esta compra? Se van a crear movimientos inversos de stock y se excluirá del último costo.',
    );
    if (!confirmed) {
      return;
    }

    cancelPurchase.mutate(
      { id: purchase.id, input: { reason: 'Anulación manual desde Gestión' } },
      {
        onSuccess: () =>
          setCancelFeedback({
            tone: 'success',
            title: 'Compra anulada',
            description: 'El stock fue revertido y el historial de costos ya ignora esa compra.',
          }),
        onError: (error) =>
          setCancelFeedback({
            tone: 'error',
            title: 'No se pudo anular la compra',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const columns: FinanceTableColumn<PurchaseRow>[] = [
    {
      id: 'date',
      header: 'Fecha',
      render: (purchase) => formatDate(purchase.purchaseDate),
      sortDirection: sortDirectionFor(sort, 'date'),
      sortLabel: 'Ordenar por fecha',
      onSort: () => setSort((current) => toggleSort(current, 'date')),
    },
    {
      id: 'supplier',
      header: 'Proveedor',
      render: (purchase) => purchase.supplier || 'Sin proveedor',
      sortDirection: sortDirectionFor(sort, 'supplier'),
      sortLabel: 'Ordenar por proveedor',
      onSort: () => setSort((current) => toggleSort(current, 'supplier')),
    },
    {
      id: 'products',
      header: 'Ítems',
      render: (purchase) => `${purchase.itemCount.toLocaleString('es-AR')} ítem(s)`,
    },
    {
      id: 'total',
      header: 'Total',
      render: (purchase) => formatMoneyFromCents(purchase.totalCents),
      align: 'right',
      sortDirection: sortDirectionFor(sort, 'total'),
      sortLabel: 'Ordenar por total',
      onSort: () => setSort((current) => toggleSort(current, 'total')),
    },
    {
      id: 'status',
      header: 'Estado',
      render: (purchase) => <StatusBadge purchase={purchase} />,
      sortDirection: sortDirectionFor(sort, 'status'),
      sortLabel: 'Ordenar por estado',
      onSort: () => setSort((current) => toggleSort(current, 'status')),
    },
    {
      id: 'actions',
      header: 'Acciones',
      render: (purchase) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            aria-label={`Ver detalle de compra ${purchase.supplier || formatDate(purchase.purchaseDate)}`}
            className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80"
            aria-haspopup="dialog"
            onClick={() => setSelectedPurchaseId(purchase.id)}
            type="button"
          >
            Detalle
          </button>
          {purchase.status === 'active' ? (
            <button
              aria-label={`Anular compra ${purchase.supplier || formatDate(purchase.purchaseDate)}`}
              className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:opacity-60"
              disabled={cancelPurchase.isPending}
              onClick={() => handleCancel(purchase)}
              type="button"
            >
              Anular compra
            </button>
          ) : null}
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">Compras</p>
          <h2 className="mt-1 text-2xl font-black text-foreground">Compras inteligentes</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            Registrá compras, auditá stock antes/después y compará el costo nuevo contra el último precio.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
          onClick={() => {
            setCreateFeedback(null);
            setIsCreateOpen(true);
          }}
          type="button"
        >
          <PackagePlus className="h-4 w-4" aria-hidden={true} />
          Registrar compra
        </button>
      </div>

      <FeedbackBanner feedback={cancelFeedback} />

      <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-white p-4 shadow-card lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
            Total gastado · {purchaseStatusFilters.find((filter) => filter.id === statusFilter)?.label}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
            {formatMoneyFromCents(totalSpentCents)}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {rows.length.toLocaleString('es-AR')} compra(s) en la vista actual.
          </p>
        </div>
        <div
          aria-label="Filtrar compras por estado"
          className="grid grid-cols-3 gap-1 rounded-full bg-background p-1 ring-1 ring-border/70"
        >
          {purchaseStatusFilters.map((filter) => {
            const isSelected = statusFilter === filter.id;

            return (
              <button
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? 'rounded-full bg-sidebar px-3 py-2 text-xs font-black text-white shadow-card'
                    : 'rounded-full px-3 py-2 text-xs font-black text-muted-foreground transition hover:bg-white hover:text-foreground'
                }
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm font-bold text-foreground shadow-card">
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" aria-hidden={true} />
          Buscar compra
        </span>
        <input
          className={inputClassName}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Proveedor, comprobante, producto o nota"
          value={search}
        />
      </label>

      {isLoading ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm font-bold text-muted-foreground">
          Cargando compras de gestión...
        </div>
      ) : rows.length ? (
        <div className="space-y-4">
          <FinanceTable
            ariaLabel="Historial de compras"
            columns={columns}
            emptyState="No hay compras para mostrar."
            getRowKey={(purchase) => purchase.id}
            rows={rows}
          />
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
          <p className="font-black text-foreground">Sin compras registradas</p>
          <p className="mt-1 font-semibold leading-6 text-muted-foreground">
            Cuando cargues compras, acá vas a ver el historial con impacto de stock y precio.
          </p>
        </div>
      )}

      <FinanceActionSheet
        closeLabel="Cerrar detalle de compra"
        description={
          selectedPurchase
            ? `${selectedPurchase.supplier || 'Sin proveedor'} · ${formatDate(selectedPurchase.purchaseDate)}`
            : undefined
        }
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchaseId(null)}
        placement="side"
        title="Detalle de compra"
      >
        {selectedPurchase ? (
          <PurchaseDetailPanel products={products} purchase={selectedPurchase} />
        ) : null}
      </FinanceActionSheet>

      <FinanceActionSheet
        closeLabel="Cerrar registro de compra"
        description="Cargá una compra sin perder el flujo. Después de guardar, esta ventana queda abierta para otra carga."
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Registrar compra"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <FeedbackBanner feedback={createFeedback} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-bold text-foreground">
              Producto
              <select
                className={inputClassName}
                disabled={!products.length}
                onChange={(event) => {
                  const product = productsById.get(event.target.value);
                  setCreateForm((current) => ({
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
                  setCreateForm((current) => ({ ...current, purchaseDate: event.target.value }))
                }
                type="date"
                value={createForm.purchaseDate}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Proveedor
              <input
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, supplier: event.target.value }))
                }
                value={createForm.supplier}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Comprobante
              <input
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, receiptNumber: event.target.value }))
                }
                value={createForm.receiptNumber}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Unidad de compra
              <select
                className={inputClassName}
                disabled={!selectedProduct}
                onChange={(event) =>
                  setCreateForm((current) => ({
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
                  setCreateForm((current) => ({ ...current, purchaseQuantity: event.target.value }))
                }
                step="0.001"
                type="number"
                value={createForm.purchaseQuantity}
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
                  setCreateForm((current) => ({ ...current, unitsPerPackage: event.target.value }))
                }
                step="0.001"
                type="number"
                value={needsConversion ? createForm.unitsPerPackage : '1'}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Cargo precio como
              <select
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    priceMode: event.target.value as PurchaseFormState['priceMode'],
                  }))
                }
                value={createForm.priceMode}
              >
                <option value="unit">Precio por unidad de compra</option>
                <option value="total">Precio total pagado</option>
              </select>
            </label>
            <label className="text-sm font-bold text-foreground">
              {createForm.priceMode === 'total'
                ? 'Precio total pagado'
                : `Precio por ${baseUnitLabels[purchaseUnit]}`}
              <input
                className={inputClassName}
                min="0"
                onChange={(event) => setCreateForm((current) => ({ ...current, price: event.target.value }))}
                step="0.01"
                type="number"
                value={createForm.price}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Notas del ítem
              <input
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, itemNotes: event.target.value }))
                }
                value={createForm.itemNotes}
              />
            </label>
          </div>
          <label className="block text-sm font-bold text-foreground">
            Notas de la compra
            <textarea
              className={inputClassName}
              onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              value={createForm.notes}
            />
          </label>
          <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold leading-6 text-muted-foreground">
            <p>
              La unidad base del producto alimenta stock, recetas y costos. Si comprás packs,
              indicá cuántas unidades base trae cada pack.
            </p>
            <p className="mt-2 font-black text-foreground">
              Preview: {formatQuantity(previewTotalBaseUnits, selectedProduct?.baseUnit ?? 'unit')} · costo
              unitario base {formatMoneyFromCents(previewCostPerBaseUnitCents)}
            </p>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={createPurchase.isPending || !selectedProductId || purchaseQuantity <= 0 || priceCents <= 0}
            type="submit"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden={true} />
            {createPurchase.isPending ? 'Guardando compra...' : 'Guardar compra'}
          </button>
        </form>
      </FinanceActionSheet>
    </div>
  );
};
