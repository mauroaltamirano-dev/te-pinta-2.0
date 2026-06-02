import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listSettings, updateSetting } from '../../../settings/settings-api';
import { FinanceDashboard } from './FinanceDashboard';
import type { FinanceWorkspaceData } from '../../hooks/useFinanceWorkspaceData';

vi.mock('../../../settings/settings-api', () => ({
  listSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

const makeWorkspaceData = (): FinanceWorkspaceData =>
  ({
    productsQuery: { isLoading: false },
    purchasesQuery: { isLoading: false },
    baseCostRulesQuery: { isLoading: false },
    recipesQuery: { isLoading: false },
    menuItemsQuery: { isLoading: false },
    deliveryFeeQuery: { data: 1500 },
    orderPromotionSettingsQuery: {
      data: {
        bulkDozenThreshold: 3,
        bulkDiscountPercent: 10,
        combinedDozenQuantity: 12,
        combinedDozenPrice: 15000,
        cookingFee: 2000,
        addons: [],
      },
    },
    products: [],
    purchases: [],
    baseCostRules: [
      {
        id: 'rule-1',
        productId: 'product-1',
        productName: 'Harina 000',
        name: 'Harina base',
        componentType: 'base_raw_material',
        appliesTo: 'per_empanada',
        quantity: 0.05,
        groupSizeUnits: 12,
        roundingMode: 'exact',
        latestCostCents: 120000,
        isActive: true,
      },
    ],
    recipes: [
      {
        menuItemId: 'menu-1',
        menuItemName: 'Humita',
        items: [{ id: 'item-1' }],
        totalCostPerDozenCents: 50_000,
        totalCostPerUnitCents: 4167,
        warnings: [],
      },
    ],
    menuItems: [
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
    ],
  }) as unknown as FinanceWorkspaceData;

const renderDashboard = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <FinanceDashboard data={makeWorkspaceData()} />
    </QueryClientProvider>,
  );
};

describe('FinanceDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listSettings).mockResolvedValue([
      { key: 'finance_dashboard_service_percent', value: '20' },
      { key: 'finance_dashboard_target_margin_percent', value: '50' },
    ]);
    vi.mocked(updateSetting).mockImplementation(async (input) => input);
  });

  it('renders average KPI cards and premium variety panels instead of legacy inventory panels', async () => {
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: /rentabilidad por variedad/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /margen promedio: 87,8%/i })).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /costo promedio: \$\s*1\.464/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /precio promedio: \$\s*12\.000/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /ganancia promedio: \$\s*10\.536/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole('article', { name: /variedad humita/i })).toBeInTheDocument();
    expect(screen.getByText(/margen actual 87,8%/i)).toBeInTheDocument();
    expect(screen.getByText(/precio para 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*2\.928/i)).toBeInTheDocument();
    expect(screen.queryByText(/^catálogo$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^stock$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^compras$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^alertas$/i)).not.toBeInTheDocument();
  });

  it('saves dashboard assumptions and uses the saved values in target price', async () => {
    renderDashboard();

    const serviceInput = await screen.findByLabelText(/servicios/i);
    const targetInput = screen.getByLabelText(/margen objetivo/i);
    await userEvent.clear(serviceInput);
    await userEvent.type(serviceInput, '25');
    await userEvent.clear(targetInput);
    await userEvent.type(targetInput, '40');
    await userEvent.click(screen.getByRole('button', { name: /guardar supuestos/i }));

    await waitFor(() => expect(updateSetting).toHaveBeenCalledTimes(2));
    expect(vi.mocked(updateSetting).mock.calls.map(([input]) => input)).toEqual([
      { key: 'finance_dashboard_service_percent', value: '25' },
      { key: 'finance_dashboard_target_margin_percent', value: '40' },
    ]);
    expect(await screen.findByText(/precio para 40%/i)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*2\.542/i)).toBeInTheDocument();
  });

  it('keeps scenario margins collapsed and simulates all values for edited docenas', async () => {
    renderDashboard();

    const variety = await screen.findByRole('article', { name: /variedad humita/i });
    expect(within(variety).getByLabelText(/docenas a simular/i)).toHaveValue(1);
    expect(within(variety).queryByText(/cocinada con envío/i)).not.toBeInTheDocument();

    await userEvent.clear(within(variety).getByLabelText(/docenas a simular/i));
    await userEvent.type(within(variety).getByLabelText(/docenas a simular/i), '2');
    await userEvent.click(within(variety).getByRole('button', { name: /márgenes por escenario/i }));

    expect(within(variety).getByText(/cruda retiro/i)).toBeInTheDocument();
    expect(within(variety).getByText(/cocinada con envío/i)).toBeInTheDocument();
    expect(within(variety).getByText(/venta\s+\$\s*29\.500/i)).toBeInTheDocument();
    expect(within(variety).getByText(/ganancia\s+\$\s*26\.572/i)).toBeInTheDocument();
  });
});
