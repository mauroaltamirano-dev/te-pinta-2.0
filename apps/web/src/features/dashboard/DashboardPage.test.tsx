import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { getDailyDashboard } from './dashboard-api';
import { DashboardPage } from './DashboardPage';

vi.mock('./dashboard-api', () => ({
  getDailyDashboard: vi.fn(),
}));

const renderDashboardPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getDailyDashboard).mockResolvedValue({
      date: '2026-05-06',
      orderCount: 3,
      totalRevenue: 45600,
      deliveryShifts: {
        mediodia: 1,
        tarde: 0,
        noche: 2,
      },
      topVarieties: [
        { menuItemId: 'menu-1', name: 'Carne suave', quantity: 24 },
        { menuItemId: 'menu-2', name: 'Humita', quantity: 12 },
      ],
    });
  });

  it('shows daily order count, revenue, delivery shifts and top varieties', async () => {
    renderDashboardPage();

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('$ 45.600')).toBeInTheDocument();
    expect(screen.getByText(/mediodía/i).closest('p')).toHaveTextContent('1');
    expect(screen.getByText(/noche/i).closest('p')).toHaveTextContent('2');
    expect(screen.getByText('Carne suave')).toBeInTheDocument();
    expect(screen.getByText(/24 unidades/i)).toBeInTheDocument();
  });

  it('reloads the dashboard for the selected date', async () => {
    renderDashboardPage();

    fireEvent.change(await screen.findByLabelText(/fecha del dashboard/i), {
      target: { value: '2026-05-07' },
    });

    await waitFor(() => {
      expect(getDailyDashboard).toHaveBeenLastCalledWith({ date: '2026-05-07' });
    });
  });
});
