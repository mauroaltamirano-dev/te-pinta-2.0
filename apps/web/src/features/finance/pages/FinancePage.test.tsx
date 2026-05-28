import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  createFinancePurchase,
  createFinanceStockAdjustment,
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
    vi.mocked(createFinanceStockAdjustment).mockResolvedValue({
      id: 'movement-1',
      productId: trackedProduct.id,
      movementType: 'manual_out',
      quantityBase: -10,
      sourcePurchaseItemId: null,
      notes: 'corrección por compra duplicada',
      createdAt: '2026-05-28T12:00:00.000Z',
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

    expect(await screen.findByRole('heading', { name: /finanzas/i, level: 1 })).toBeInTheDocument();

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
    expect(screen.getAllByText(/30 kg/i).length).toBeGreaterThan(0);
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

  it('registers weighted purchases using the product base unit instead of pack language', async () => {
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de finanzas/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /compras/i }));

    expect(screen.getByText(/para papa por kilo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cantidad comprada \(kg\)/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/cantidad comprada \(kg\)/i));
    await userEvent.type(screen.getByLabelText(/cantidad comprada \(kg\)/i), '2.475');
    await userEvent.clear(screen.getByLabelText(/precio por kg/i));
    await userEvent.type(screen.getByLabelText(/precio por kg/i), '1350');
    await userEvent.click(screen.getByRole('button', { name: /guardar compra/i }));

    await waitFor(() => expect(createFinancePurchase).toHaveBeenCalled());
    expect(vi.mocked(createFinancePurchase).mock.calls[0]?.[0]).toEqual({
      purchaseDate: expect.any(String),
      supplier: undefined,
      items: [
        {
          productId: trackedProduct.id,
          purchaseUnit: 'kg',
          purchaseQuantity: 2.475,
          unitsPerPackage: 1,
          unitPriceCents: 135000,
        },
      ],
    });
    expect(await screen.findByText(/compra registrada/i)).toBeInTheDocument();
  });

  it('creates a manual stock-out movement from a target stock correction', async () => {
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de finanzas/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /stock/i }));

    expect(screen.getByText(/stock actual/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/stock objetivo/i), '20');
    await userEvent.type(
      screen.getByLabelText(/nota opcional/i),
      'corrección por compra duplicada',
    );
    expect(screen.getByText(/salida de 10 kg/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /aplicar ajuste/i }));

    await waitFor(() => expect(createFinanceStockAdjustment).toHaveBeenCalled());
    expect(vi.mocked(createFinanceStockAdjustment).mock.calls[0]?.[0]).toEqual({
      productId: trackedProduct.id,
      movementType: 'manual_out',
      quantity: 10,
      notes: 'corrección por compra duplicada',
    });
    expect(await screen.findByText(/stock corregido/i)).toBeInTheDocument();
  });
});
