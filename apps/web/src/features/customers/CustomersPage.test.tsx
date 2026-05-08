import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { CustomersPage } from './CustomersPage';
import { createCustomer, deleteCustomer, listCustomers } from './customers-api';

vi.mock('./customers-api', () => ({
  createCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  listCustomers: vi.fn(),
  updateCustomer: vi.fn(),
}));

const renderCustomersPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <CustomersPage />
    </QueryClientProvider>,
  );
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listCustomers).mockResolvedValue([
      {
        id: 'customer-1',
        name: 'Ana Pérez',
        phone: '1122334455',
        address: 'Av. Siempre Viva 742',
      },
      {
        id: 'customer-2',
        name: 'Bruno Gómez',
        phone: '1199887766',
        address: null,
      },
    ]);
  });

  it('lists customers and filters by name or phone', async () => {
    renderCustomersPage();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Bruno Gómez')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/buscar cliente/i), '9988');

    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Gómez')).toBeInTheDocument();
  });

  it('creates a customer from the form', async () => {
    vi.mocked(createCustomer).mockResolvedValue({
      id: 'customer-3',
      name: 'Carla Ruiz',
      phone: '1155550000',
      address: 'San Martín 123',
    });

    renderCustomersPage();

    await userEvent.type(screen.getByLabelText(/nombre del cliente/i), 'Carla Ruiz');
    await userEvent.type(screen.getByLabelText(/teléfono/i), '1155550000');
    await userEvent.type(screen.getByLabelText(/dirección/i), 'San Martín 123');
    await userEvent.click(screen.getByRole('button', { name: /guardar cliente/i }));

    expect(vi.mocked(createCustomer).mock.calls[0]?.[0]).toEqual({
      name: 'Carla Ruiz',
      phone: '1155550000',
      address: 'San Martín 123',
    });
  });

  it('deletes a customer from the list', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue(undefined);

    renderCustomersPage();

    const brunoRow = within(await screen.findByLabelText(/cliente bruno gómez/i));
    await userEvent.click(brunoRow.getByRole('button', { name: /eliminar/i }));

    expect(vi.mocked(deleteCustomer).mock.calls[0]?.[0]).toBe('customer-2');
  });
});
