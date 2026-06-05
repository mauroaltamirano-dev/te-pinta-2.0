import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  createFinanceProduct,
  getFinanceProductHistory,
  updateFinanceProduct,
} from '../../api';
import { FinanceCatalog } from './FinanceCatalog';
import type { FinanceProductWithMetrics, FinancePurchaseDetail } from '../../types';

vi.mock('../../api', () => ({
  createFinanceProduct: vi.fn(),
  getFinanceProductHistory: vi.fn(),
  updateFinanceProduct: vi.fn(),
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
  product({ id: 'flour', name: 'Harina 000', stockQuantityBase: 30, purchaseCount: 2 }),
  product({
    id: 'box',
    name: 'Caja docena',
    category: 'packaging',
    baseUnit: 'unit',
    stockTracking: false,
    latestCostPerBaseUnitCents: 45000,
    averageCostPerBaseUnitCents: 42000,
    stockQuantityBase: 80,
    purchaseCount: 4,
  }),
  product({
    id: 'cheese',
    name: 'Muzzarella',
    latestCostPerBaseUnitCents: 220000,
    averageCostPerBaseUnitCents: 210000,
    stockQuantityBase: 7,
    purchaseCount: 3,
  }),
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
        id: 'purchase-item-1',
        purchaseId: 'purchase-1',
        productId: 'flour',
        purchaseUnit: 'kg',
        purchaseQuantity: 2,
        unitsPerPackage: 1,
        totalBaseUnits: 2,
        unitPriceCents: 120000,
        totalPriceCents: 240000,
        costPerBaseUnitCents: 120000,
        notes: null,
      },
    ],
    stockMovements: [],
  },
];

const renderCatalog = (catalogProducts = products) => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <FinanceCatalog isLoading={false} products={catalogProducts} purchases={purchases} />
    </QueryClientProvider>,
  );
};

describe('FinanceCatalog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createFinanceProduct).mockResolvedValue(products[0]!);
    vi.mocked(updateFinanceProduct).mockResolvedValue({ ...products[0]!, name: 'Harina premium' });
    vi.mocked(getFinanceProductHistory).mockResolvedValue([
      {
        id: 'purchase-item-1',
        purchasedAt: '2026-05-20',
        createdAt: '2026-05-20T10:00:00.000Z',
        purchaseQuantity: 2,
        unitsPerPackage: 1,
        totalBaseUnits: 2,
        totalPriceCents: 240000,
        costPerBaseUnitCents: 120000,
      },
    ]);
  });

  it('renders only loaded category panels and supports search plus sortable columns', async () => {
    const user = userEvent.setup();
    renderCatalog();

    expect(screen.getByRole('heading', { name: /materia prima/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /packaging/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /combustible/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/buscar producto/i), 'caja');
    expect(screen.getByRole('cell', { name: /caja docena/i })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /harina 000/i })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar producto/i));
    const rawTable = screen.getByRole('table', { name: /catálogo de materia prima/i });
    await user.click(within(rawTable).getByRole('button', { name: /ordenar por stock actual/i }));

    const rawRows = within(rawTable).getAllByRole('row').slice(1);
    expect(rawRows.map((row) => within(row).getAllByRole('cell')[0]!.textContent)).toEqual([
      'Muzzarella',
      'Harina 000',
    ]);
    expect(within(rawRows[0]!).getByText(/controla stock/i)).toBeInTheDocument();
  });

  it('keeps the create product sheet open after a successful save', async () => {
    const user = userEvent.setup();
    renderCatalog();

    await user.click(screen.getByRole('button', { name: /alta rápida de producto/i }));
    const dialog = screen.getByRole('dialog', { name: /crear producto/i });
    await user.type(within(dialog).getByLabelText(/^nombre$/i), 'Tapas premium');
    await user.click(within(dialog).getByRole('button', { name: /guardar producto/i }));

    await waitFor(() => expect(createFinanceProduct).toHaveBeenCalled());
    expect(createFinanceProduct).toHaveBeenCalledWith({
      name: 'Tapas premium',
      category: 'raw_material',
      baseUnit: 'kg',
      stockTracking: true,
      isActive: true,
    });
    expect(screen.getByRole('dialog', { name: /crear producto/i })).toBeInTheDocument();
    expect(await within(dialog).findByText(/producto creado/i)).toBeInTheDocument();
  });

  it('sends desired real stock quantity when editing a product correction', async () => {
    const user = userEvent.setup();
    renderCatalog();

    const flourRow = screen.getByRole('row', { name: /harina 000/i });
    await user.click(within(flourRow).getByRole('button', { name: /editar harina 000/i }));
    const dialog = screen.getByRole('dialog', { name: /editar producto/i });

    expect(within(dialog).getByText(/corrección de stock real/i)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(/nombre/i));
    await user.type(within(dialog).getByLabelText(/nombre/i), 'Harina premium');
    await user.selectOptions(within(dialog).getByLabelText(/unidad/i), 'g');
    await user.clear(within(dialog).getByLabelText(/stock real actual/i));
    await user.type(within(dialog).getByLabelText(/stock real actual/i), '144');
    await user.click(within(dialog).getByRole('button', { name: /guardar corrección/i }));

    await waitFor(() => expect(updateFinanceProduct).toHaveBeenCalled());
    expect(updateFinanceProduct).toHaveBeenCalledWith('flour', {
      name: 'Harina premium',
      baseUnit: 'g',
      currentStockQuantityBase: 144,
    });
  });

  it('opens product purchase history in a side sheet with supplier, quantity, and price details', async () => {
    const user = userEvent.setup();
    renderCatalog();

    const flourRow = screen.getByRole('row', { name: /harina 000/i });
    await user.click(within(flourRow).getByRole('button', { name: /ver historial de harina 000/i }));
    const dialog = await screen.findByRole('dialog', { name: /historial de compras/i });

    expect(dialog).toHaveAccessibleDescription(/harina 000/i);
    expect(within(dialog).getByText(/molino norte/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/20\/05\/2026/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/cantidad: 2 kg/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/precio total/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/costo base/i)).toBeInTheDocument();
    expect(getFinanceProductHistory).toHaveBeenCalledWith('flour');

    await user.click(within(dialog).getByRole('button', { name: /cerrar historial de compras/i }));
    expect(screen.queryByRole('dialog', { name: /historial de compras/i })).not.toBeInTheDocument();
  });
});
