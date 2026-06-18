import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  listOrders,
  updateOrderStatus,
  type OrderDetail,
  type OrderListResponse,
} from '../orders/orders-api';
import { ProductionPage } from './ProductionPage';

vi.mock('../orders/orders-api', () => ({
  listOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

const pendingOrder: OrderDetail = {
  id: 'order-1',
  customer: { id: 'customer-1', name: 'Ana Pérez', phone: null, address: null },
  deliveryDate: '2026-06-18',
  deliveryTime: 'noche',
  deliveryType: 'retiro',
  cooked: false,
  notes: null,
  discountPercent: 0,
  deliveryFee: 0,
  cookingFee: 0,
  subtotal: 36000,
  total: 36000,
  status: 'confirmado',
  isPaid: false,
  items: [
    {
      id: 'item-1',
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 24,
      unitPrice: 1500,
      subtotal: 36000,
    },
  ],
  addons: [],
};

const response: OrderListResponse = {
  orders: [{ ...pendingOrder, itemCount: 1, totalQuantity: 24 }],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
  stats: { active: 1, finalized: 0, pending: 1 },
};

describe('ProductionPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listOrders).mockResolvedValue(response);
    vi.mocked(updateOrderStatus).mockResolvedValue({ ...pendingOrder, status: 'preparado' });
  });

  it('shows the production summary and marks a pending order as prepared', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <ProductionPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Producción' })).toBeInTheDocument();
    expect(await screen.findByText('Carne suave')).toBeInTheDocument();
    expect(screen.getAllByText(/2 docenas/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /marcar preparado ana pérez/i }));

    await waitFor(() =>
      expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'preparado'),
    );
  });
});
