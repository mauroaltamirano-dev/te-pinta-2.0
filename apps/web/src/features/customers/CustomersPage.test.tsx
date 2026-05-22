import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { listOrders } from '../orders/orders-api';
import { CustomersPage } from './CustomersPage';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from './customers-api';

vi.mock('../orders/orders-api', () => ({
  listOrders: vi.fn(),
}));

vi.mock('./customers-api', () => ({
  createCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  listCustomers: vi.fn(),
  updateCustomer: vi.fn(),
}));

const renderCustomersPage = () => {
  const queryClient = createQueryClient();

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <CustomersPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
};

const mockDesktopViewport = (isDesktop: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('1024px') ? isDesktop : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDesktopViewport(true);
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(listOrders).mockResolvedValue({
      orders: [
        {
          id: 'order-3',
          customer: {
            id: 'customer-1',
            name: 'Ana Pérez',
            phone: '1122334455',
            address: 'Av. Siempre Viva 742',
          },
          deliveryDate: '2026-05-08',
          deliveryTime: 'tarde',
          deliveryType: 'envio',
          cooked: true,
          notes: null,
          discountPercent: 0,
          deliveryFee: 0,
          cookingFee: 0,
          subtotal: 24000,
          total: 24000,
          status: 'entregado',
          isPaid: true,
          itemCount: 2,
          totalQuantity: 24,
        },
        {
          id: 'order-1',
          customer: {
            id: 'customer-1',
            name: 'Ana Pérez',
            phone: '1122334455',
            address: 'Av. Siempre Viva 742',
          },
          deliveryDate: '2026-05-06',
          deliveryTime: 'tarde',
          deliveryType: 'envio',
          cooked: false,
          notes: null,
          discountPercent: 0,
          deliveryFee: 0,
          cookingFee: 0,
          subtotal: 12000,
          total: 12000,
          status: 'confirmado',
          isPaid: false,
          itemCount: 1,
          totalQuantity: 12,
        },
        {
          id: 'order-2',
          customer: {
            id: 'customer-2',
            name: 'Bruno Gómez',
            phone: '1199887766',
            address: null,
          },
          deliveryDate: '2026-05-07',
          deliveryTime: 'mediodia',
          deliveryType: 'retiro',
          cooked: false,
          notes: null,
          discountPercent: 0,
          deliveryFee: 0,
          cookingFee: 0,
          subtotal: 6500,
          total: 6500,
          status: 'preparado',
          isPaid: true,
          itemCount: 1,
          totalQuantity: 6,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 25,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      stats: { active: 2, finalized: 1 },
    });
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

  it('opens the edit panel when selecting a customer and saves changes', async () => {
    vi.mocked(updateCustomer).mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Pérez',
      phone: '1133334444',
      address: 'Italia 456',
    });

    renderCustomersPage();

    await userEvent.click(await screen.findByLabelText(/cliente ana pérez/i));

    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('Editando Ana Pérez');
    expect(screen.getByLabelText(/nombre del cliente/i)).toHaveValue('Ana Pérez');
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue('1122334455');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('Total gastado');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('$ 36.000');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('Historial reciente');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('Saldo no pagado');

    await userEvent.clear(screen.getByLabelText(/teléfono/i));
    await userEvent.type(screen.getByLabelText(/teléfono/i), '1133334444');
    await userEvent.clear(screen.getByLabelText(/dirección/i));
    await userEvent.type(screen.getByLabelText(/dirección/i), 'Italia 456');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(vi.mocked(updateCustomer).mock.calls[0]).toEqual([
      'customer-1',
      {
        name: 'Ana Pérez',
        phone: '1133334444',
        address: 'Italia 456',
      },
    ]);
  });

  it('opens the selected customer as a full-screen edit panel on mobile', async () => {
    mockDesktopViewport(false);

    renderCustomersPage();

    await userEvent.click(await screen.findByLabelText(/cliente bruno gómez/i));

    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('Editando Bruno Gómez');
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del cliente/i)).toHaveValue('Bruno Gómez');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('$ 6.500');
    expect(
      screen.getByRole('region', { name: /formulario de edición de cliente/i }),
    ).toHaveTextContent('6 unidades acumuladas');

    await userEvent.click(screen.getByRole('button', { name: /volver/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /formulario de edición de cliente/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('deletes a customer from the list', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue(undefined);

    renderCustomersPage();

    const brunoRow = within(await screen.findByLabelText(/cliente bruno gómez/i));
    await userEvent.click(brunoRow.getByRole('button', { name: /eliminar/i }));

    expect(vi.mocked(deleteCustomer).mock.calls[0]?.[0]).toBe('customer-2');
  });
});
