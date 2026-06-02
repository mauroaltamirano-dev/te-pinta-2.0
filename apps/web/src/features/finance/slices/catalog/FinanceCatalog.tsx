import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, History, Pencil, Plus, Search, ShieldCheck, ShieldOff } from 'lucide-react';

import { FinanceActionSheet } from '../../components/FinanceActionSheet';
import { FinanceTable, type FinanceTableColumn } from '../../components/FinanceTable';
import {
  buildCatalogSections,
  catalogCategoryLabels,
  type CatalogSortField,
  type CatalogSortState,
} from '../../helpers/catalogSort';
import {
  useCreateFinanceProduct,
  useFinanceProductHistory,
  useUpdateFinanceProduct,
} from '../../hooks';
import type {
  FinanceBaseUnit,
  FinanceProductCategory,
  FinanceProductHistoryItem,
  FinanceProductWithMetrics,
  FinancePurchaseDetail,
} from '../../types';

type FinanceCatalogProps = {
  products: FinanceProductWithMetrics[];
  purchases: FinancePurchaseDetail[];
  isLoading: boolean;
};

type CreateProductFormState = {
  name: string;
  category: FinanceProductCategory;
  baseUnit: FinanceBaseUnit;
  stockTracking: boolean;
};

type EditProductFormState = {
  name: string;
  baseUnit: FinanceBaseUnit;
  currentStockQuantityBase: string;
};

type CatalogFeedback = {
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
const productCategoryOptions = Object.keys(catalogCategoryLabels) as FinanceProductCategory[];

const initialCreateForm: CreateProductFormState = {
  name: '',
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const inputClassName =
  'mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20';

const formatMoneyFromCents = (cents: number | null | undefined): string =>
  cents === null || cents === undefined ? 'Sin costo' : moneyFormatter.format(cents / 100);

const formatQuantity = (quantity: number, unit: FinanceBaseUnit): string =>
  `${quantity.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${baseUnitLabels[unit]}`;

const formatDate = (value: string | undefined): string => {
  if (!value) {
    return 'Sin fecha';
  }

  const dateValue = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dateValue);
};

const getErrorDescription = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo completar la operación.';

const toggleSort = (current: CatalogSortState, field: CatalogSortField): CatalogSortState => ({
  field,
  direction:
    current.field === field && current.direction === 'ascending' ? 'descending' : 'ascending',
});

const sortDirectionFor = (sort: CatalogSortState, field: CatalogSortField) =>
  sort.field === field ? sort.direction : 'none';

const FeedbackBanner = ({ feedback }: { feedback: CatalogFeedback | null }) => {
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

const StockTrackingBadge = ({ product }: { product: FinanceProductWithMetrics }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
      product.stockTracking
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
        : 'bg-slate-100 text-slate-600 ring-slate-200'
    }`}
  >
    {product.stockTracking ? (
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden={true} />
    ) : (
      <ShieldOff className="h-3.5 w-3.5" aria-hidden={true} />
    )}
    {product.stockTracking ? 'Controla stock' : 'Sin control'}
  </span>
);

const findPurchaseItem = (purchases: FinancePurchaseDetail[], itemId: string | undefined) => {
  if (!itemId) {
    return undefined;
  }

  for (const purchase of purchases) {
    const item = purchase.items.find((candidate) => candidate.id === itemId);
    if (item) {
      return { purchase, item };
    }
  }

  return undefined;
};

const ProductHistoryPanel = ({
  product,
  purchases,
}: {
  product: FinanceProductWithMetrics;
  purchases: FinancePurchaseDetail[];
}) => {
  const historyQuery = useFinanceProductHistory(product.id);
  const history = historyQuery.data ?? [];

  return (
    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4 shadow-card">
      <div className="flex items-center gap-2 text-primary">
        <History className="h-4 w-4" aria-hidden={true} />
        <h4 className="text-sm font-black uppercase tracking-wide">
          Historial de compras de {product.name}
        </h4>
      </div>

      {historyQuery.isLoading ? (
        <p className="mt-3 text-sm font-bold text-muted-foreground">Cargando historial...</p>
      ) : history.length ? (
        <div className="mt-3 space-y-2">
          {history.map((item: FinanceProductHistoryItem, index) => {
            const match = findPurchaseItem(purchases, item.id);
            const supplier = match?.purchase.supplier || 'Sin proveedor';
            const date = match?.purchase.purchaseDate ?? item.purchasedAt ?? item.createdAt;
            const quantity = match?.item.totalBaseUnits ?? item.totalBaseUnits;
            const totalPriceCents = match?.item.totalPriceCents ?? item.totalPriceCents;
            const costPerBaseUnitCents =
              match?.item.costPerBaseUnitCents ?? item.costPerBaseUnitCents;

            return (
              <article
                className="rounded-2xl border border-border/70 bg-white px-3 py-2 text-sm shadow-sm"
                key={item.id ?? `${product.id}-${index}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-foreground">{supplier}</p>
                    <p className="mt-1 text-xs font-bold text-muted-foreground">
                      {formatDate(date)}
                      {match?.purchase.receiptNumber ? ` · ${match.purchase.receiptNumber}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-primary ring-1 ring-primary/20">
                    Cantidad: {formatQuantity(quantity, product.baseUnit)}
                  </span>
                </div>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-background px-3 py-2">
                    <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                      Precio total
                    </dt>
                    <dd className="mt-1 font-black text-foreground">
                      {formatMoneyFromCents(totalPriceCents)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-background px-3 py-2">
                    <dt className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                      Costo base
                    </dt>
                    <dd className="mt-1 font-black text-foreground">
                      {formatMoneyFromCents(costPerBaseUnitCents)} / {baseUnitLabels[product.baseUnit]}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-muted-foreground ring-1 ring-border/60">
          Todavía no hay compras registradas para este producto.
        </p>
      )}
    </div>
  );
};

export const FinanceCatalog = ({ products, purchases, isLoading }: FinanceCatalogProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CatalogSortState>({ field: 'name', direction: 'ascending' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateProductFormState>(initialCreateForm);
  const [editingProduct, setEditingProduct] = useState<FinanceProductWithMetrics | null>(null);
  const [historyProduct, setHistoryProduct] = useState<FinanceProductWithMetrics | null>(null);
  const [editForm, setEditForm] = useState<EditProductFormState>({
    name: '',
    baseUnit: 'kg',
    currentStockQuantityBase: '0',
  });
  const [createFeedback, setCreateFeedback] = useState<CatalogFeedback | null>(null);
  const [editFeedback, setEditFeedback] = useState<CatalogFeedback | null>(null);
  const createProduct = useCreateFinanceProduct();
  const updateProduct = useUpdateFinanceProduct();
  const sections = useMemo(() => buildCatalogSections(products, search, sort), [products, search, sort]);

  const openEdit = (product: FinanceProductWithMetrics) => {
    setEditingProduct(product);
    setEditFeedback(null);
    setEditForm({
      name: product.name,
      baseUnit: product.baseUnit,
      currentStockQuantityBase: String(product.stockQuantityBase),
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createProduct.mutate(
      { ...createForm, isActive: true },
      {
        onSuccess: (product) => {
          setCreateFeedback({
            tone: 'success',
            title: 'Producto creado',
            description: `${product.name} ya está disponible. Podés cargar otro sin cerrar esta ventana.`,
          });
          setCreateForm(initialCreateForm);
        },
        onError: (error) =>
          setCreateFeedback({
            tone: 'error',
            title: 'No se pudo crear el producto',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProduct) {
      return;
    }

    updateProduct.mutate(
      {
        id: editingProduct.id,
        updates: {
          name: editForm.name,
          baseUnit: editForm.baseUnit,
          currentStockQuantityBase: Number(editForm.currentStockQuantityBase || 0),
        },
      },
      {
        onSuccess: (product) =>
          setEditFeedback({
            tone: 'success',
            title: 'Producto actualizado',
            description: `${product.name} quedó guardado con el stock real indicado.`,
          }),
        onError: (error) =>
          setEditFeedback({
            tone: 'error',
            title: 'No se pudo actualizar el producto',
            description: getErrorDescription(error),
          }),
      },
    );
  };

  const columns: FinanceTableColumn<FinanceProductWithMetrics>[] = [
    {
      id: 'name',
      header: 'Nombre',
      render: (product) => (
        <button
          className="text-left font-black text-foreground underline-offset-4 hover:underline"
          onClick={() => setHistoryProduct(product)}
          type="button"
        >
          {product.name}
        </button>
      ),
      sortDirection: sortDirectionFor(sort, 'name'),
      sortLabel: 'Ordenar por nombre',
      onSort: () => setSort((current) => toggleSort(current, 'name')),
    },
    {
      id: 'unit',
      header: 'Unidad',
      render: (product) => baseUnitLabels[product.baseUnit],
      sortDirection: sortDirectionFor(sort, 'unit'),
      sortLabel: 'Ordenar por unidad',
      onSort: () => setSort((current) => toggleSort(current, 'unit')),
    },
    {
      id: 'stockTracking',
      header: 'Stock',
      render: (product) => <StockTrackingBadge product={product} />,
    },
    {
      id: 'latestCost',
      header: 'Último costo',
      render: (product) => formatMoneyFromCents(product.latestCostPerBaseUnitCents),
      align: 'right',
      sortDirection: sortDirectionFor(sort, 'latestCost'),
      sortLabel: 'Ordenar por último costo',
      onSort: () => setSort((current) => toggleSort(current, 'latestCost')),
    },
    {
      id: 'averageCost',
      header: 'Costo promedio',
      render: (product) => formatMoneyFromCents(product.averageCostPerBaseUnitCents),
      align: 'right',
      sortDirection: sortDirectionFor(sort, 'averageCost'),
      sortLabel: 'Ordenar por costo promedio',
      onSort: () => setSort((current) => toggleSort(current, 'averageCost')),
    },
    {
      id: 'currentStock',
      header: 'Stock actual',
      render: (product) => formatQuantity(product.stockQuantityBase, product.baseUnit),
      align: 'right',
      sortDirection: sortDirectionFor(sort, 'stock'),
      sortLabel: 'Ordenar por stock actual',
      onSort: () => setSort((current) => toggleSort(current, 'stock')),
    },
    {
      id: 'purchaseCount',
      header: 'Compras',
      render: (product) => product.purchaseCount.toLocaleString('es-AR'),
      align: 'right',
      sortDirection: sortDirectionFor(sort, 'purchaseCount'),
      sortLabel: 'Ordenar por compras',
      onSort: () => setSort((current) => toggleSort(current, 'purchaseCount')),
    },
    {
      id: 'actions',
      header: 'Acciones',
      render: (product) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            aria-label={`Ver historial de ${product.name}`}
            className="rounded-full bg-muted px-3 py-2 text-xs font-black text-foreground transition hover:bg-muted/80"
            aria-haspopup="dialog"
            onClick={() => setHistoryProduct(product)}
            type="button"
          >
            Historial
          </button>
          <button
            aria-label={`Editar ${product.name}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-2 text-xs font-black text-primary ring-1 ring-primary/20 transition hover:bg-primary/15"
            onClick={() => openEdit(product)}
            type="button"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden={true} />
            Editar
          </button>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-primary">Catálogo</p>
          <h2 className="mt-1 text-2xl font-black text-foreground">Productos por categoría</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            Buscá, ordená y corregí stock real desde el producto, no desde una pestaña separada.
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
          <Plus className="h-4 w-4" aria-hidden={true} />
          Alta rápida de producto
        </button>
      </div>

      <label className="block rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm font-bold text-foreground shadow-card">
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" aria-hidden={true} />
          Buscar producto
        </span>
        <input
          className={inputClassName}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ej: harina, caja, muzzarella"
          value={search}
        />
      </label>

      {isLoading ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm font-bold text-muted-foreground">
          Cargando catálogo financiero...
        </div>
      ) : sections.length ? (
        <div className="space-y-5">
          {sections.map((section) => (
            <section
              className="space-y-3 rounded-[1.75rem] border border-border/70 bg-[#FFFDF9] p-3 shadow-card sm:p-4"
              key={section.category}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-foreground">{section.label}</h3>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {section.products.length.toLocaleString('es-AR')} producto(s) con datos cargados.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary ring-1 ring-primary/15">
                  {catalogCategoryLabels[section.category]}
                </span>
              </div>

              <FinanceTable
                ariaLabel={`Catálogo de ${section.label}`}
                columns={columns}
                emptyState="No hay productos en esta categoría."
                getRowKey={(product) => product.id}
                rows={section.products}
              />

            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/70 p-5 text-sm">
          <p className="font-black text-foreground">Todavía no cargaste productos financieros</p>
          <p className="mt-1 font-semibold leading-6 text-muted-foreground">
            Creá materia prima, packaging o gastos para empezar a calcular costos reales.
          </p>
        </div>
      )}

      <FinanceActionSheet
        closeLabel="Cerrar historial de compras"
        description={historyProduct?.name}
        isOpen={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        placement="side"
        title="Historial de compras"
      >
        {historyProduct ? (
          <ProductHistoryPanel product={historyProduct} purchases={purchases} />
        ) : null}
      </FinanceActionSheet>

      <FinanceActionSheet
        closeLabel="Cerrar alta de producto"
        description="Cargá productos sin perder el flujo. Después de guardar, esta ventana queda abierta para otra alta."
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear producto"
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <FeedbackBanner feedback={createFeedback} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-foreground">
              Nombre
              <input
                className={inputClassName}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={createForm.name}
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Categoría
              <select
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    category: event.target.value as FinanceProductCategory,
                  }))
                }
                value={createForm.category}
              >
                {productCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {catalogCategoryLabels[category]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-foreground">
              Unidad base
              <select
                className={inputClassName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, baseUnit: event.target.value as FinanceBaseUnit }))
                }
                value={createForm.baseUnit}
              >
                {baseUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {baseUnitLabels[unit]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-7 flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm font-bold text-foreground">
              <input
                checked={createForm.stockTracking}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, stockTracking: event.target.checked }))
                }
                type="checkbox"
              />
              Controlar stock
            </label>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            disabled={createProduct.isPending || !createForm.name.trim()}
            type="submit"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden={true} />
            {createProduct.isPending ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      </FinanceActionSheet>

      <FinanceActionSheet
        backLabel="Volver al catálogo"
        closeLabel="Cerrar edición de producto"
        description="Enviá la cantidad deseada; el backend calcula el delta de ajuste."
        isOpen={Boolean(editingProduct)}
        onBack={() => setEditingProduct(null)}
        onClose={() => setEditingProduct(null)}
        title="Editar producto"
      >
        {editingProduct ? (
          <form className="space-y-4" onSubmit={handleEdit}>
            <FeedbackBanner feedback={editFeedback} />
            <label className="block text-sm font-bold text-foreground">
              Nombre
              <input
                className={inputClassName}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={editForm.name}
              />
            </label>
            <label className="block text-sm font-bold text-foreground">
              Unidad
              <select
                className={`${inputClassName} appearance-none`}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, baseUnit: event.target.value as FinanceBaseUnit }))
                }
                value={editForm.baseUnit}
              >
                {baseUnitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {baseUnitLabels[unit]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-foreground">
              Stock real actual ({baseUnitLabels[editForm.baseUnit]})
              <input
                className={inputClassName}
                min="0"
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, currentStockQuantityBase: event.target.value }))
                }
                step="0.001"
                type="number"
                value={editForm.currentStockQuantityBase}
              />
            </label>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
              Corrección de stock real: escribí la cantidad real que hay hoy. No cargues el delta;
              el sistema calcula el ajuste para llegar a ese stock.
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              disabled={updateProduct.isPending || !editForm.name.trim()}
              type="submit"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden={true} />
              {updateProduct.isPending ? 'Guardando...' : 'Guardar corrección'}
            </button>
          </form>
        ) : null}
      </FinanceActionSheet>
    </div>
  );
};
