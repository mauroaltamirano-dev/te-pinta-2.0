import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { createFinanceStockAdjustment, listFinanceProducts } from '../finance/api';
import type { FinanceProductWithMetrics } from '../finance/types';
import { StockPage } from './StockPage';

vi.mock('../finance/api', () => ({
  createFinanceStockAdjustment: vi.fn(),
  listFinanceProducts: vi.fn(),
}));

const products: FinanceProductWithMetrics[] = [
  {
    id: 'flour',
    name: 'Harina 000',
    normalizedName: 'harina 000',
    category: 'raw_material',
    baseUnit: 'kg',
    stockTracking: true,
    isActive: true,
    latestCostPerBaseUnitCents: 120000,
    averageCostPerBaseUnitCents: 110000,
    purchasedQuantityBase: 20,
    stockQuantityBase: 8,
    purchaseCount: 2,
    warnings: [],
  },
  {
    id: 'cheese',
    name: 'Muzzarella',
    normalizedName: 'muzzarella',
    category: 'raw_material',
    baseUnit: 'kg',
    stockTracking: true,
    isActive: true,
    latestCostPerBaseUnitCents: 220000,
    averageCostPerBaseUnitCents: 210000,
    purchasedQuantityBase: 10,
    stockQuantityBase: 0,
    purchaseCount: 1,
    warnings: [],
  },
  {
    id: 'service',
    name: 'Electricidad',
    normalizedName: 'electricidad',
    category: 'service',
    baseUnit: 'unit',
    stockTracking: false,
    isActive: true,
    latestCostPerBaseUnitCents: null,
    averageCostPerBaseUnitCents: null,
    purchasedQuantityBase: 0,
    stockQuantityBase: 0,
    purchaseCount: 0,
    warnings: [],
  },
];

describe('StockPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listFinanceProducts).mockResolvedValue(products);
    vi.mocked(createFinanceStockAdjustment).mockResolvedValue({
      id: 'movement-1',
      productId: 'cheese',
      movementType: 'waste',
      quantityBase: -2,
      sourcePurchaseItemId: null,
      notes: 'Envase roto',
      createdAt: '2026-06-17T12:00:00.000Z',
    });
  });

  it('filters stock and records a justified manual movement', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <StockPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Stock' })).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Harina 000' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sin stock' }));
    expect(screen.getByRole('cell', { name: 'Muzzarella' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Harina 000' })).not.toBeInTheDocument();

    const row = screen.getByRole('row', { name: /muzzarella/i });
    await user.click(within(row).getByRole('button', { name: 'Ajustar' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajustar stock' });
    await user.selectOptions(within(dialog).getByLabelText('Movimiento'), 'waste');
    await user.clear(within(dialog).getByLabelText(/cantidad/i));
    await user.type(within(dialog).getByLabelText(/cantidad/i), '2');
    await user.type(within(dialog).getByLabelText('Motivo'), 'Envase roto');
    await user.click(within(dialog).getByRole('button', { name: 'Registrar movimiento' }));

    await waitFor(() =>
      expect(createFinanceStockAdjustment).toHaveBeenCalledWith({
        productId: 'cheese',
        movementType: 'waste',
        quantity: 2,
        notes: 'Envase roto',
      }),
    );
  });
});
