import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  cancelFinancePurchase,
  createFinanceBaseCostRule,
  createFinancePurchase,
  listFinanceBaseCostRules,
  listFinanceProducts,
  listFinancePurchases,
  listFinanceRecipes,
  previewFinanceOrderCost,
  updateFinanceRecipe,
} from '../api';
import { FinancePage } from './FinancePage';
import type { FinanceProductWithMetrics } from '../types';
import { listMenuItems } from '../../menu/menu-api';
import { useDeliveryFee, useOrderPromotionSettings } from '../../orders/settings-hooks';
import { listSettings, updateSetting } from '../../settings/settings-api';

vi.mock('../api', () => ({
  cancelFinancePurchase: vi.fn(),
  createFinanceBaseCostRule: vi.fn(),
  createFinanceProduct: vi.fn(),
  createFinancePurchase: vi.fn(),
  createFinanceStockAdjustment: vi.fn(),
  deleteFinanceBaseCostRule: vi.fn(),
  listFinanceBaseCostRules: vi.fn(),
  listFinanceProducts: vi.fn(),
  listFinancePurchases: vi.fn(),
  listFinanceRecipes: vi.fn(),
  listFinanceStock: vi.fn(),
  previewFinanceOrderCost: vi.fn(),
  updateFinanceBaseCostRule: vi.fn(),
  updateFinanceRecipe: vi.fn(),
}));

vi.mock('../../menu/menu-api', () => ({
  listMenuItems: vi.fn(),
}));

vi.mock('../../orders/settings-hooks', () => ({
  useDeliveryFee: vi.fn(),
  useOrderPromotionSettings: vi.fn(),
}));

vi.mock('../../settings/settings-api', () => ({
  listSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

const renderFinancePage = (initialEntry = '/finanzas') => {
  const queryClient = createQueryClient();

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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

const fillingProduct: FinanceProductWithMetrics = {
  id: 'product-2',
  name: 'Muzzarella',
  normalizedName: 'muzzarella',
  category: 'raw_material',
  baseUnit: 'kg',
  stockTracking: true,
  isActive: true,
  latestCostPerBaseUnitCents: 200000,
  averageCostPerBaseUnitCents: 195000,
  purchasedQuantityBase: 12,
  stockQuantityBase: 8,
  purchaseCount: 1,
  warnings: [],
};

describe('FinancePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listFinanceProducts).mockResolvedValue([trackedProduct, fillingProduct]);
    vi.mocked(listSettings).mockResolvedValue([
      { key: 'finance_dashboard_service_percent', value: '20' },
      { key: 'finance_dashboard_target_margin_percent', value: '50' },
    ]);
    vi.mocked(updateSetting).mockImplementation(async (input) => input);
    vi.mocked(useDeliveryFee).mockReturnValue({
      data: 1500,
    } as unknown as ReturnType<typeof useDeliveryFee>);
    vi.mocked(useOrderPromotionSettings).mockReturnValue({
      data: {
        bulkDozenThreshold: 3,
        bulkDiscountPercent: 10,
        combinedDozenQuantity: 12,
        combinedDozenPrice: 15000,
        cookingFee: 2000,
        addons: [],
      },
    } as unknown as ReturnType<typeof useOrderPromotionSettings>);
    vi.mocked(listFinanceBaseCostRules).mockResolvedValue([
      {
        id: 'rule-1',
        productId: trackedProduct.id,
        productName: trackedProduct.name,
        name: 'Harina base',
        componentType: 'base_raw_material',
        appliesTo: 'per_empanada',
        quantity: 0.05,
        groupSizeUnits: 12,
        roundingMode: 'exact',
        latestCostCents: trackedProduct.latestCostPerBaseUnitCents,
        isActive: true,
      },
    ]);
    vi.mocked(listFinanceRecipes).mockResolvedValue([
      {
        menuItemId: 'menu-1',
        menuItemName: 'Humita',
        items: [],
        totalCostPerDozenCents: 0,
        totalCostPerUnitCents: 0,
        warnings: [],
      },
    ]);
    vi.mocked(listFinancePurchases).mockResolvedValue([
      {
        id: 'purchase-1',
        purchaseDate: '2026-05-27',
        supplier: 'Molino norte',
        receiptNumber: null,
        notes: null,
        fundingSource: 'production_cost',
        canceledAt: null,
        canceledReason: null,
        items: [
          {
            id: 'purchase-item-1',
            purchaseId: 'purchase-1',
            productId: trackedProduct.id,
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
    ]);
    vi.mocked(listMenuItems).mockResolvedValue([
      {
        id: 'menu-1',
        name: 'Humita',
        priceUnit: 1200,
        priceHalfDozen: 6500,
        priceDozen: 12000,
        costPerDozen: 0,
        isActive: true,
        isArchived: false,
      },
    ]);
    vi.mocked(createFinancePurchase).mockResolvedValue({
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'production_cost',
      canceledAt: null,
      canceledReason: null,
      items: [],
    });
    vi.mocked(cancelFinancePurchase).mockResolvedValue({
      id: 'purchase-1',
      purchaseDate: '2026-05-27',
      supplier: 'Molino norte',
      receiptNumber: null,
      notes: null,
      fundingSource: 'production_cost',
      canceledAt: '2026-05-29T12:00:00.000Z',
      canceledReason: 'Anulación manual desde Gestión',
      items: [],
      stockMovements: [],
    });
    vi.mocked(createFinanceBaseCostRule).mockResolvedValue({
      id: 'rule-2',
      productId: trackedProduct.id,
      productName: trackedProduct.name,
      name: 'Harina por empanada',
      componentType: 'base_raw_material',
      appliesTo: 'per_empanada',
      quantity: 0.05,
      groupSizeUnits: 12,
      roundingMode: 'exact',
      latestCostCents: trackedProduct.latestCostPerBaseUnitCents,
      isActive: true,
    });
    vi.mocked(updateFinanceRecipe).mockResolvedValue({
      menuItemId: 'menu-1',
      menuItemName: 'Humita',
      items: [
        {
          id: 'recipe-item-1',
          menuItemId: 'menu-1',
          productId: fillingProduct.id,
          name: fillingProduct.name,
          quantityPerDozen: 0.25,
          unit: 'kg',
          quantityBase: 0.25,
          latestCostCents: fillingProduct.latestCostPerBaseUnitCents,
          notes: null,
        },
      ],
      totalCostPerDozenCents: 50000,
      totalCostPerUnitCents: 4167,
      warnings: [],
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

  it('renders the finance workspace route without the legacy stock tab', async () => {
    renderFinancePage();

    expect(await screen.findByRole('heading', { name: /gestión/i, level: 1 })).toBeInTheDocument();

    const tabs = screen.getByRole('tablist', { name: /secciones de gestión/i });
    expect(within(tabs).getByRole('tab', { name: /dashboard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs).getByRole('tab', { name: /catálogo/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /compras/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /costos base/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /recetas/i })).toBeInTheDocument();
    expect(within(tabs).getByRole('tab', { name: /calculadora/i })).toBeInTheDocument();
    expect(within(tabs).queryByRole('tab', { name: /stock/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /stock/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/rentabilidad por variedad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/margen objetivo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/servicios/i)).toHaveValue(20);
    expect(screen.getByText(/precio para 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*1\.728/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /márgenes por escenario/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await userEvent.click(within(tabs).getByRole('tab', { name: /catálogo/i }));
    expect(screen.getByText('Harina 000')).toBeInTheDocument();
    expect(screen.getAllByText(/último costo/i).length).toBeGreaterThan(0);
  });

  it('opens recipes and selects a variety from finance URL parameters', async () => {
    renderFinancePage('/finanzas?section=recipes&menuItemId=menu-1');

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    expect(within(tabs).getByRole('tab', { name: /recetas/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => expect(screen.getByLabelText(/variedad/i)).toHaveValue('menu-1'));
  });

  it('shows empty states when finance data is incomplete', async () => {
    vi.mocked(listFinanceProducts).mockResolvedValue([]);
    vi.mocked(listFinanceBaseCostRules).mockResolvedValue([]);
    vi.mocked(listFinanceRecipes).mockResolvedValue([]);
    vi.mocked(listMenuItems).mockResolvedValue([]);

    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });

    await userEvent.click(within(tabs).getByRole('tab', { name: /catálogo/i }));
    expect(screen.getByText(/todavía no cargaste productos de gestión/i)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /costos base/i }));
    expect(screen.getByText(/sin reglas de costo base/i)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('tab', { name: /recetas/i }));
    expect(screen.getByText(/sin variedades de menú/i)).toBeInTheDocument();
  });

  it('displays calculator warnings returned by the finance preview endpoint', async () => {
    vi.mocked(previewFinanceOrderCost).mockResolvedValueOnce({
      totalEmpanadas: 12,
      packagingUnits: 1,
      baseRawMaterialCostCents: 72000,
      packagingCostCents: 19383,
      recipeCostCents: 50000,
      totalCostCents: 141383,
      profitSummary: {
        saleTotalCents: 2400000,
        totalCostCents: 141383,
        grossProfitCents: 2258617,
        profitMarginPercent: 94.11,
        costRatioPercent: 5.89,
      },
      warnings: [
        {
          code: 'missing_recipe_cost',
          message: 'Falta receta/costo para Jamón y queso.',
        },
      ],
    });

    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /calculadora/i }));
    await userEvent.clear(screen.getByLabelText(/total de venta/i));
    await userEvent.type(screen.getByLabelText(/total de venta/i), '24000');
    await userEvent.clear(screen.getByLabelText(/cantidad de empanadas/i));
    await userEvent.type(screen.getByLabelText(/cantidad de empanadas/i), '12');
    await userEvent.click(screen.getByRole('button', { name: /calcular costo/i }));

    expect(await screen.findByText(/falta receta\/costo para jamón y queso/i)).toBeInTheDocument();
    expect(screen.getByText(/materia prima base/i)).toBeInTheDocument();
    expect(screen.getByText(/costo packaging/i)).toBeInTheDocument();
    expect(screen.getByText(/receta \/ relleno/i)).toBeInTheDocument();
    expect(previewFinanceOrderCost).toHaveBeenCalledWith({
      saleTotalCents: 2400000,
      items: [{ menuItemId: 'menu-1', quantity: 12 }],
    });
  });

  it('creates base cost rules from the finance workspace', async () => {
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /costos base/i }));

    expect(screen.getByText(/base 12 emp/i)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/nombre de regla/i));
    await userEvent.type(screen.getByLabelText(/nombre de regla/i), 'Harina por empanada');
    await userEvent.clear(screen.getByLabelText(/^cantidad$/i));
    await userEvent.type(screen.getByLabelText(/^cantidad$/i), '0.05');
    await userEvent.click(screen.getByRole('button', { name: /guardar regla/i }));

    await waitFor(() => expect(createFinanceBaseCostRule).toHaveBeenCalled());
    expect(vi.mocked(createFinanceBaseCostRule).mock.calls[0]?.[0]).toEqual({
      productId: trackedProduct.id,
      name: 'Harina por empanada',
      componentType: 'base_raw_material',
      appliesTo: 'per_empanada',
      quantity: 0.05,
      groupSizeUnits: 12,
      roundingMode: 'exact',
      isActive: true,
    });
    expect(await screen.findByText(/regla guardada/i)).toBeInTheDocument();
  });

  it('saves recipe ingredients by menu variety and product base unit', async () => {
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /recetas/i }));

    expect(screen.getByText(/total docena/i)).toBeInTheDocument();
    expect(screen.getByText(/base \+ receta específica/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /agregar ingrediente/i }));
    const ingredientSelect = screen.getByLabelText(/insumo/i);
    expect(within(ingredientSelect).queryByRole('option', { name: /harina 000/i })).toBeNull();
    expect(
      within(ingredientSelect).getByRole('option', { name: /muzzarella/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /último costo/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /costo docena/i })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/cantidad ingrediente 1/i));
    await userEvent.type(screen.getByLabelText(/cantidad ingrediente 1/i), '0.25');
    await userEvent.click(screen.getByRole('button', { name: /guardar receta/i }));

    await waitFor(() => expect(updateFinanceRecipe).toHaveBeenCalled());
    expect(vi.mocked(updateFinanceRecipe).mock.calls[0]?.[0]).toEqual('menu-1');
    expect(vi.mocked(updateFinanceRecipe).mock.calls[0]?.[1]).toEqual({
      menuItemId: 'menu-1',
      items: [
        {
          productId: fillingProduct.id,
          quantityPerDozen: 0.25,
          unit: 'kg',
          quantityBase: 0.25,
          notes: undefined,
        },
      ],
    });
    expect(await screen.findByText(/receta guardada/i)).toBeInTheDocument();
  });

  it('registers weighted purchases using the product base unit instead of pack language', async () => {
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /compras/i }));

    await userEvent.click(screen.getByRole('button', { name: /registrar compra/i }));
    const dialog = screen.getByRole('dialog', { name: /registrar compra/i });
    expect(within(dialog).getByText(/costo unitario base/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/asignar compra a/i)).toHaveValue('production_cost');
    expect(within(dialog).getByLabelText(/cantidad comprada \(kg\)/i)).toBeInTheDocument();

    await userEvent.selectOptions(within(dialog).getByLabelText(/asignar compra a/i), 'services');
    await userEvent.clear(within(dialog).getByLabelText(/cantidad comprada \(kg\)/i));
    await userEvent.type(within(dialog).getByLabelText(/cantidad comprada \(kg\)/i), '2.475');
    await userEvent.clear(within(dialog).getByLabelText(/precio por kg/i));
    await userEvent.type(within(dialog).getByLabelText(/precio por kg/i), '1350');
    await userEvent.click(within(dialog).getByRole('button', { name: /guardar compra/i }));

    await waitFor(() => expect(createFinancePurchase).toHaveBeenCalled());
    expect(vi.mocked(createFinancePurchase).mock.calls[0]?.[0]).toEqual({
      purchaseDate: expect.any(String),
      fundingSource: 'services',
      supplier: undefined,
      receiptNumber: undefined,
      notes: undefined,
      items: [
        {
          productId: trackedProduct.id,
          purchaseUnit: 'kg',
          purchaseQuantity: 2.475,
          unitsPerPackage: 1,
          unitPriceCents: 135000,
          notes: undefined,
        },
      ],
    });
    expect(await screen.findByText(/compra registrada/i)).toBeInTheDocument();
  });

  it('lists purchase history and cancels a purchase safely', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderFinancePage();

    const tabs = await screen.findByRole('tablist', { name: /secciones de gestión/i });
    await userEvent.click(within(tabs).getByRole('tab', { name: /compras/i }));

    expect(await screen.findByText(/molino norte/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ver detalle de compra molino norte/i }));
    expect(screen.getAllByText(/stock antes/i).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /anular compra molino norte/i }));

    await waitFor(() => expect(cancelFinancePurchase).toHaveBeenCalled());
    expect(vi.mocked(cancelFinancePurchase).mock.calls[0]?.[0]).toBe('purchase-1');
    expect(await screen.findByText(/compra anulada/i)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
