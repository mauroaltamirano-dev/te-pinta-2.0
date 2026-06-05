import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { cancelFinancePurchase, createFinancePurchase } from '../../api';
import type { FinanceProductWithMetrics, FinancePurchaseDetail } from '../../types';
import { FinancePurchases } from './FinancePurchases';

vi.mock('../../api', () => ({
  cancelFinancePurchase: vi.fn(),
  createFinancePurchase: vi.fn(),
}));

const product = (
  overrides: Partial<FinanceProductWithMetrics> & Pick<FinanceProductWithMetrics, 'id' | 'name'>,
): FinanceProductWithMetrics => ({
  normalizedName: overrides.name.toLowerCase(),
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: 120000,
  averageCostPerBaseUnitCents: 110000,
  purchasedQuantityBase: 10,
  stockQuantityBase: 5,
  purchaseCount: 1,
  warnings: [],
  ...overrides,
  id: overrides.id,
  name: overrides.name,
});

const products = [
  product({ id: 'flour', name: 'Harina 000', stockQuantityBase: 12 }),
  product({ id: 'cheese', name: 'Muzzarella', latestCostPerBaseUnitCents: 220000 }),
];

const purchases: FinancePurchaseDetail[] = [
  {
    id: 'purchase-1',
    purchaseDate: '2026-05-20',
    supplier: 'Molino norte',
    receiptNumber: 'A-0001',
    notes: 'Compra mensual',
    fundingSource: 'production_cost',
    canceledAt: null,
    canceledReason: null,
    items: [
      {
        id: 'item-1',
        purchaseId: 'purchase-1',
        productId: 'flour',
        purchaseUnit: 'kg',
        purchaseQuantity: 2,
        unitsPerPackage: 1,
        totalBaseUnits: 2,
        unitPriceCents: 120000,
        totalPriceCents: 240000,
        costPerBaseUnitCents: 120000,
        notes: 'Bolsa sellada',
      },
    ],
    itemImpacts: [
      {
        purchaseItemId: 'item-1',
        stockBeforeBase: 10,
        stockAfterBase: 12,
        previousCostPerBaseUnitCents: 100000,
        newCostPerBaseUnitCents: 120000,
        priceDeltaCents: 20000,
        priceDeltaPercent: 20,
      },
    ],
    stockMovements: [],
  },
  {
    id: 'purchase-2',
    purchaseDate: '2026-05-22',
    supplier: 'Lácteos sur',
    receiptNumber: 'B-200',
    notes: null,
    fundingSource: 'services',
    canceledAt: null,
    canceledReason: null,
    items: [
      {
        id: 'item-2',
        purchaseId: 'purchase-2',
        productId: 'cheese',
        purchaseUnit: 'kg',
        purchaseQuantity: 1,
        unitsPerPackage: 1,
        totalBaseUnits: 1,
        unitPriceCents: 220000,
        totalPriceCents: 220000,
        costPerBaseUnitCents: 220000,
        notes: null,
      },
    ],
    itemImpacts: [
      {
        purchaseItemId: 'item-2',
        stockBeforeBase: 8,
        stockAfterBase: 9,
        previousCostPerBaseUnitCents: 250000,
        newCostPerBaseUnitCents: 220000,
        priceDeltaCents: -30000,
        priceDeltaPercent: -12,
      },
    ],
    stockMovements: [],
  },
  {
    id: 'purchase-canceled',
    purchaseDate: '2026-05-23',
    supplier: 'Proveedor anulado',
    receiptNumber: 'X-999',
    notes: 'No debe verse en compras',
    fundingSource: 'profit',
    canceledAt: '2026-05-24T12:00:00.000Z',
    canceledReason: 'Carga duplicada',
    items: [
      {
        id: 'item-canceled',
        purchaseId: 'purchase-canceled',
        productId: 'flour',
        purchaseUnit: 'kg',
        purchaseQuantity: 1,
        unitsPerPackage: 1,
        totalBaseUnits: 1,
        unitPriceCents: 100000,
        totalPriceCents: 100000,
        costPerBaseUnitCents: 100000,
        notes: null,
      },
    ],
    itemImpacts: [],
    stockMovements: [],
  },
];

const renderPurchases = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <FinancePurchases isLoading={false} products={products} purchases={purchases} />
    </QueryClientProvider>,
  );
};

describe('FinancePurchases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(createFinancePurchase).mockResolvedValue(purchases[0]!);
    vi.mocked(cancelFinancePurchase).mockResolvedValue({
      ...purchases[0]!,
      canceledAt: '2026-05-23T12:00:00.000Z',
      canceledReason: 'Anulación manual desde Gestión',
    });
  });

  it('renders a searchable and sortable premium purchases table', async () => {
    const user = userEvent.setup();
    renderPurchases();

    expect(screen.getByRole('heading', { name: /compras inteligentes/i })).toBeInTheDocument();
    expect(screen.getByText(/total gastado · activas/i)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*4\.600/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/buscar compra/i), 'lácteos');

    expect(screen.getByRole('cell', { name: /lácteos sur/i })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /molino norte/i })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar compra/i));
    const table = screen.getByRole('table', { name: /historial de compras/i });
    expect(within(table).queryByText(/proveedor anulado/i)).not.toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: /ordenar por total/i }));

    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByText(/molino norte/i)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/lácteos sur/i)).toBeInTheDocument();
  });

  it('filters active, canceled, and all purchases while recalculating total spent', async () => {
    const user = userEvent.setup();
    renderPurchases();

    await user.click(screen.getByRole('button', { name: /anuladas/i }));
    expect(screen.getByText(/total gastado · anuladas/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /proveedor anulado/i })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /molino norte/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/\$\s*1\.000/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /todas/i }));
    expect(screen.getByText(/total gastado · todas/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /molino norte/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /proveedor anulado/i })).toBeInTheDocument();
    expect(screen.getByText(/\$\s*5\.600/i)).toBeInTheDocument();
  });

  it('keeps the create purchase sheet open and submits an Orders-style purchase payload', async () => {
    const user = userEvent.setup();
    renderPurchases();

    await user.click(screen.getByRole('button', { name: /registrar compra/i }));
    const dialog = screen.getByRole('dialog', { name: /registrar compra/i });
    await user.type(within(dialog).getByLabelText(/proveedor/i), 'Molino norte');
    await user.clear(within(dialog).getByLabelText(/cantidad comprada \(kg\)/i));
    await user.type(within(dialog).getByLabelText(/cantidad comprada \(kg\)/i), '2.5');
    await user.clear(within(dialog).getByLabelText(/precio por kg/i));
    await user.type(within(dialog).getByLabelText(/precio por kg/i), '1350');
    await user.click(within(dialog).getByRole('button', { name: /guardar compra/i }));

    await waitFor(() => expect(createFinancePurchase).toHaveBeenCalled());
    expect(createFinancePurchase).toHaveBeenCalledWith({
      purchaseDate: expect.any(String),
      supplier: 'Molino norte',
      receiptNumber: undefined,
      notes: undefined,
      fundingSource: 'production_cost',
      items: [
        {
          productId: 'flour',
          purchaseUnit: 'kg',
          purchaseQuantity: 2.5,
          unitsPerPackage: 1,
          unitPriceCents: 135000,
          notes: undefined,
        },
      ],
    });
    expect(screen.getByRole('dialog', { name: /registrar compra/i })).toBeInTheDocument();
    expect(await within(dialog).findByText(/compra registrada/i)).toBeInTheDocument();
  });

  it('opens purchase details in a side sheet with supplier, receipt, stock, and price delta details', async () => {
    const user = userEvent.setup();
    renderPurchases();

    const row = screen.getByRole('row', { name: /molino norte/i });
    await user.click(within(row).getByRole('button', { name: /ver detalle de compra molino norte/i }));

    const dialog = screen.getByRole('dialog', { name: /detalle de compra/i });

    expect(dialog).toHaveAccessibleDescription(/molino norte · 20\/05\/2026/i);
    expect(within(dialog).getByText(/comprobante: a-0001/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/compra mensual/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/harina 000/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/cantidad: 2 kg/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/stock antes: 10 kg/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/stock después: 12 kg/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/último precio: \$\s*1\.000/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/precio nuevo: \$\s*1\.200/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/subió \+\$\s*200 · 20%/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /cerrar detalle de compra/i }));
    expect(screen.queryByRole('dialog', { name: /detalle de compra/i })).not.toBeInTheDocument();
  });

  it('keeps purchase cancel behavior available from the table', async () => {
    const user = userEvent.setup();
    renderPurchases();

    const row = screen.getByRole('row', { name: /molino norte/i });
    await user.click(within(row).getByRole('button', { name: /anular compra molino norte/i }));

    await waitFor(() => expect(cancelFinancePurchase).toHaveBeenCalled());
    expect(cancelFinancePurchase).toHaveBeenCalledWith('purchase-1', {
      reason: 'Anulación manual desde Gestión',
    });
    expect(await screen.findByText(/compra anulada/i)).toBeInTheDocument();
  });
});
