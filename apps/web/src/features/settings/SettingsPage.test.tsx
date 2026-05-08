import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listSettings, updateSetting } from './settings-api';
import { SettingsPage } from './SettingsPage';

vi.mock('./settings-api', () => ({
  listSettings: vi.fn(),
  updateSetting: vi.fn(),
}));

const renderSettingsPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listSettings).mockResolvedValue([
      { key: 'delivery_fee', value: '1500' },
      { key: 'store_name', value: 'Te Pinta' },
    ]);
  });

  it('lists settings and highlights the delivery fee', async () => {
    renderSettingsPage();

    expect(await screen.findByText('delivery_fee')).toBeInTheDocument();
    expect(screen.getAllByText('$ 1.500')).toHaveLength(2);
    expect(screen.getByText('store_name')).toBeInTheDocument();
  });

  it('updates the delivery fee setting', async () => {
    vi.mocked(updateSetting).mockResolvedValue({ key: 'delivery_fee', value: '1800' });

    renderSettingsPage();

    const deliveryCard = within(await screen.findByLabelText(/setting delivery_fee/i));
    await userEvent.clear(deliveryCard.getByLabelText(/valor/i));
    await userEvent.type(deliveryCard.getByLabelText(/valor/i), '1800');
    await userEvent.click(deliveryCard.getByRole('button', { name: /guardar/i }));

    expect(vi.mocked(updateSetting).mock.calls[0]?.[0]).toEqual({
      key: 'delivery_fee',
      value: '1800',
    });
  });
});
