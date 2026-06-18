import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { FinanceManualStockMovementType } from '@te-pinta/shared';

import { PageHero } from '@/components/layout/PageHero';

import { FinanceActionSheet } from '../finance/components/FinanceActionSheet';
import { FinanceTable, type FinanceTableColumn } from '../finance/components/FinanceTable';
import {
  catalogCategoryLabels,
  catalogCategoryOrder,
} from '../finance/helpers/catalogSort';
import { useCreateFinanceStockAdjustment, useFinanceProducts } from '../finance/hooks';
import type {
  FinanceBaseUnit,
  FinanceProductCategory,
  FinanceProductWithMetrics,
} from '../finance/types';

type StockFilter = 'all' | 'available' | 'zero' | 'negative' | 'untracked';

const baseUnitLabels: Record<FinanceBaseUnit, string> = {
  unit: 'unidad',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pack: 'pack',
};

const movementLabels: Record<FinanceManualStockMovementType, string> = {
  manual_in: 'Ingreso manual',
  manual_out: 'Salida manual',
  waste: 'Merma o desperdicio',
  adjustment: 'Ajuste positivo',
};

const stockFilters: Array<{ id: StockFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'available', label: 'Disponibles' },
  { id: 'zero', label: 'Sin stock' },
  { id: 'negative', label: 'Negativos' },
  { id: 'untracked', label: 'Sin control' },
];

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatQuantity = (product: FinanceProductWithMetrics) =>
  `${product.stockQuantityBase.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${
    baseUnitLabels[product.baseUnit]
  }`;

const matchesStockFilter = (product: FinanceProductWithMetrics, filter: StockFilter) => {
  if (filter === 'available') return product.stockTracking && product.stockQuantityBase > 0;
  if (filter === 'zero') return product.stockTracking && product.stockQuantityBase === 0;
  if (filter === 'negative') return product.stockTracking && product.stockQuantityBase < 0;
  if (filter === 'untracked') return !product.stockTracking;

  return true;
};

export const StockPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FinanceProductCategory | ''>('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [adjustingProduct, setAdjustingProduct] = useState<FinanceProductWithMetrics | null>(null);
  const [movementType, setMovementType] =
    useState<FinanceManualStockMovementType>('manual_in');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const productsQuery = useFinanceProducts({ isActive: true });
  const createAdjustment = useCreateFinanceStockAdjustment();
  const products = productsQuery.data ?? [];
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-AR');

    return products
      .filter(
        (product) =>
          (!normalizedSearch ||
            product.name.toLocaleLowerCase('es-AR').includes(normalizedSearch)) &&
          (!category || product.category === category) &&
          matchesStockFilter(product, stockFilter),
      )
      .sort(
        (left, right) =>
          left.stockQuantityBase - right.stockQuantityBase ||
          left.name.localeCompare(right.name, 'es-AR'),
      );
  }, [category, products, search, stockFilter]);
  const counts = useMemo(
    () => ({
      tracked: products.filter((product) => product.stockTracking).length,
      available: products.filter(
        (product) => product.stockTracking && product.stockQuantityBase > 0,
      ).length,
      zero: products.filter(
        (product) => product.stockTracking && product.stockQuantityBase === 0,
      ).length,
      negative: products.filter(
        (product) => product.stockTracking && product.stockQuantityBase < 0,
      ).length,
    }),
    [products],
  );

  const openAdjustment = (product: FinanceProductWithMetrics) => {
    setAdjustingProduct(product);
    setMovementType('manual_in');
    setQuantity('1');
    setNotes('');
    setFeedback(null);
  };

  const handleAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingProduct) return;

    createAdjustment.mutate(
      {
        productId: adjustingProduct.id,
        movementType,
        quantity: Number(quantity),
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          setFeedback('Movimiento registrado.');
          setQuantity('1');
          setNotes('');
        },
        onError: (error) =>
          setFeedback(error instanceof Error ? error.message : 'No se pudo registrar el movimiento.'),
      },
    );
  };

  const columns: FinanceTableColumn<FinanceProductWithMetrics>[] = [
    {
      id: 'product',
      header: 'Insumo',
      render: (product) => <span className="font-black">{product.name}</span>,
    },
    {
      id: 'category',
      header: 'Categoría',
      render: (product) => catalogCategoryLabels[product.category],
    },
    {
      id: 'tracking',
      header: 'Control',
      render: (product) => (product.stockTracking ? 'Control activo' : 'Sin control'),
    },
    {
      id: 'cost',
      header: 'Último costo',
      align: 'right',
      render: (product) =>
        product.latestCostPerBaseUnitCents === null
          ? 'Sin costo'
          : moneyFormatter.format(product.latestCostPerBaseUnitCents / 100),
    },
    {
      id: 'stock',
      header: 'Stock actual',
      align: 'right',
      render: (product) => (
        <span
          className={
            !product.stockTracking
              ? 'font-bold text-muted-foreground'
              : product.stockQuantityBase < 0
                ? 'font-black text-red-700'
                : product.stockQuantityBase === 0
                  ? 'font-black text-amber-700'
                  : 'font-black text-emerald-700'
          }
        >
          {product.stockTracking ? formatQuantity(product) : 'No controlado'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (product) => (
        <button
          className="rounded-full bg-primary px-3 py-2 text-xs font-black text-white transition hover:bg-primary/90 disabled:opacity-50"
          disabled={!product.stockTracking}
          onClick={() => openAdjustment(product)}
          type="button"
        >
          Ajustar
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Inventario operativo"
        title="Stock"
        description="Existencias reales y ajustes operativos. Catálogo, compras y costos permanecen en Gestión."
      >
        <Link
          className="rounded-full bg-white px-4 py-2 text-sm font-black text-sidebar transition hover:bg-card"
          to="/finanzas?section=purchases"
        >
          Registrar compra
        </Link>
        <Link
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10"
          to="/finanzas?section=catalog"
        >
          Abrir catálogo
        </Link>
      </PageHero>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de stock">
        {[
          { label: 'Con control', value: counts.tracked },
          { label: 'Disponibles', value: counts.available },
          { label: 'Sin stock', value: counts.zero },
          { label: 'Negativos', value: counts.negative },
        ].map((item) => (
          <article className="rounded-2xl bg-white p-4 shadow-card" key={item.label}>
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section
        aria-label="Filtros de stock"
        className="grid gap-3 rounded-[1.5rem] border border-white/80 bg-white p-4 shadow-card lg:grid-cols-[minmax(0,1fr)_minmax(12rem,.35fr)]"
      >
        <label className="text-sm font-bold text-foreground">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" aria-hidden={true} />
            Buscar insumo
          </span>
          <input
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre del producto"
            value={search}
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Categoría
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold"
            onChange={(event) =>
              setCategory(event.target.value as FinanceProductCategory | '')
            }
            value={category}
          >
            <option value="">Todas</option>
            {catalogCategoryOrder.map((option) => (
              <option key={option} value={option}>
                {catalogCategoryLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 lg:col-span-2" aria-label="Estado de stock">
          {stockFilters.map((filter) => (
            <button
              aria-pressed={stockFilter === filter.id}
              className={
                stockFilter === filter.id
                  ? 'rounded-full bg-sidebar px-3 py-2 text-xs font-black text-white'
                  : 'rounded-full bg-background px-3 py-2 text-xs font-black text-muted-foreground ring-1 ring-border/70'
              }
              key={filter.id}
              onClick={() => setStockFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {productsQuery.isLoading ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-muted-foreground shadow-card">
          Cargando stock real...
        </p>
      ) : null}
      {productsQuery.isError ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800 ring-1 ring-red-100">
          No se pudo cargar el stock.
        </p>
      ) : null}

      <FinanceTable
        ariaLabel="Stock de insumos"
        className="[&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5 max-sm:[&_td:nth-child(2)]:hidden max-sm:[&_td:nth-child(3)]:hidden max-sm:[&_td:nth-child(4)]:hidden max-sm:[&_th:nth-child(2)]:hidden max-sm:[&_th:nth-child(3)]:hidden max-sm:[&_th:nth-child(4)]:hidden"
        columns={columns}
        emptyState="No hay productos para los filtros seleccionados."
        getRowKey={(product) => product.id}
        rows={filteredProducts}
      />

      <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden={true} />
        “Stock bajo” no se muestra todavía: primero necesitamos mínimos configurables por insumo
        para que la alerta sea real.
      </p>

      <FinanceActionSheet
        closeLabel="Cerrar ajuste de stock"
        description={
          adjustingProduct
            ? `Stock actual: ${formatQuantity(adjustingProduct)}`
            : undefined
        }
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        title="Ajustar stock"
      >
        <form className="space-y-4" onSubmit={handleAdjustment}>
          {feedback ? (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm font-black text-foreground ring-1 ring-border/70">
              {feedback}
            </p>
          ) : null}
          <label className="block text-sm font-bold text-foreground">
            Movimiento
            <select
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-semibold"
              onChange={(event) =>
                setMovementType(event.target.value as FinanceManualStockMovementType)
              }
              value={movementType}
            >
              {(['manual_in', 'manual_out', 'waste'] as const).map((option) => (
                <option key={option} value={option}>
                  {movementLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-foreground">
            Cantidad ({adjustingProduct ? baseUnitLabels[adjustingProduct.baseUnit] : ''})
            <input
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-semibold"
              min="0.001"
              onChange={(event) => setQuantity(event.target.value)}
              step="0.001"
              type="number"
              value={quantity}
            />
          </label>
          <label className="block text-sm font-bold text-foreground">
            Motivo
            <textarea
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-semibold"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej.: recuento físico, rotura o consumo interno"
              rows={3}
              value={notes}
            />
          </label>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
            disabled={
              createAdjustment.isPending || Number(quantity) <= 0 || !notes.trim()
            }
            type="submit"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden={true} />
            {createAdjustment.isPending ? 'Guardando...' : 'Registrar movimiento'}
          </button>
        </form>
      </FinanceActionSheet>
    </div>
  );
};
