import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  createFinancePurchase,
  listFinanceProducts,
  listFinanceStock,
  previewFinanceOrderCost,
} from '../api';
import { FinancePage } from './FinancePage';
import type { FinanceProductWithMetrics } from '../types';

vi.mock('../api', () => ({
  createFinanceProduct: vi.fn(),
  createFinancePurchase: vi.fn(),
  createFinanceStockAdjustment: vi.fn(),
  listFinanceProducts: vi.fn(),
  listFinanceStock: vi.fn(),
  previewFinanceOrderCost: vi.fn(),
}));

const renderFinancePage = () => {
  const queryClient = createQueryClient();

  return render(
    <MemoryRouter initialEntries={['/finanzas']}>
      <QueryClientProvider client={queryClient}>
        <FinancePage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const trackedProduct: FinanceProductWithMetrics = {
  id: 'product-1',
  name: 'Harina 000',
  normalizedName: 'harina 000',
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: 120000,
  averageCostPerBaseUnitCents: 115000,
  purchasedQuantityBase: 48,
  stockQuantityBase: 30,
  purchaseCount: 2,
  warnings: [],
};

describe('FinancePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listFinanceProducts).mockResolvedValue([trackedProduct]);
    vi.mocked(listFinanceStock).mockResolvedValue([
      {
        product: trackedProduct,
        quantityBase: 30,
      },
    ]);
    vi.mocked(createFinancePurchase).mockResolvedValue({
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      items: [],
    });
    vi.mocked(previewFinanceOrderCost).mockResolvedValue({
      totalEmpanadas: 12,
      packagingUnits: 1,
      baseRawMaterialCostCents: 0,
      packagingCostCents: 0,
      recipeCostCents: 0,
      totalCostCents: 0,
      profitSummary: {
        saleTotalCents: 2400000,
        totalCostCents: 0,
        grossProfitCents: 2400000,
        profitMarginPercent: 100,
        costRatioPercent: 0,
      },
      warnings: [],
    });
  });

  it('renders the finance workspace route with dashboard, catalog, purchase, calculator, and stock tabs', async () => {
    renderFinancePage();

    expect(
      await screen.findByRole('heading', { name: /finanzas/i, level: 1 }),
    ).toBeInTheDocument();

    const tabs = screen.getByRole('tablist', { name: /secciones de finanzas/i });
    expect(within(tabs).getByRole('tab', { name: /dashboard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs).getByRole('tab', { name: /catálogo/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /compras/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /costos base/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /recetas/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /calculadora/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /stock/i })).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /catálogo/i }));
    expect(screen.getByText('Harina 000')).toBeInTheDocument();
    expect(screen.getByText(/último costo/i)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /stock/i }));
    expect(screen.getByText(/30 kg/i)).toBeInTheDocument();
  });

  it('shows empty states when finance data is incomplete', async () => {
    vi.mocked(listFinanceProducts).mockResolvedValue([]);
    vi.mocked(listFinanceStock).mockResolvedValue([]);

    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de finanzas/i });

    await userEvent.click(within(tabs).getByRole('tab', { name: /catálogo/i }));
    expect(screen.getByText(/todavía no cargaste productos financieros/i)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /stock/i }));
    expect(screen.getByText(/sin movimientos de stock/i)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /costos base/i }));
    expect(screen.getByText(/se configura desde el backend/i)).toBeInTheDocument();
  });

  it('displays calculator warnings returned by the finance preview endpoint', async () => {
    vi.mocked(previewFinanceOrderCost).mockResolvedValueOnce({
      totalEmpanadas: 12,
      packagingUnits: 1,
      baseRawMaterialCostCents: 0,
      packagingCostCents: 0,
      recipeCostCents: 0,
      totalCostCents: 0,
      profitSummary: {
        saleTotalCents: 2400000,
        totalCostCents: 0,
        grossProfitCents: 2400000,
        profitMarginPercent: 100,
        costRatioPercent: 0,
      },
      warnings: [
        {
          code: 'missing_recipe_cost',
          message: 'Falta receta/costo para Jamón y queso.',
        },
      ],
    });

    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de finanzas/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /calculadora/i }));
    await userEvent.clear(screen.getByLabelText(/total de venta/i));
    await userEvent.type(screen.getByLabelText(/total de venta/i), '24000');
    await userEvent.clear(screen.getByLabelText(/id de variedad/i));
    await userEvent.type(screen.getByLabelText(/id de variedad/i), 'menu-1');
    await userEvent.clear(screen.getByLabelText(/cantidad de empanadas/i));
    await userEvent.type(screen.getByLabelText(/cantidad de empanadas/i), '12');
    await userEvent.click(screen.getByRole('button', { name: /calcular costo/i }));

    expect(await screen.findByText(/falta receta\/costo para jamón y queso/i)).toBeInTheDocument();
    expect(previewFinanceOrderCost).toHaveBeenCalledWith({
      saleTotalCents: 2400000,
      items: [{ menuItemId: 'menu-1', quantity: 12 }],
    });
  });
});
