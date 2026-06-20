import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import type * as OrdersApiModule from '../orders/orders-api';

import { listAllOrders, listOrders } from '../orders/orders-api';
import { CustomersPage } from './CustomersPage';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from './customers-api';

vi.mock('../orders/orders-api', async (importOriginal) => {
  const actual = await importOriginal<typeof OrdersApiModule>();
  return {
    ...actual,
    listOrders: vi.fn(),
    listAllOrders: vi.fn(),
  };
});

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
    const orders = [
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
      ] as const;

    vi.mocked(listOrders).mockResolvedValue({
      orders: [...orders],
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
    vi.mocked(listAllOrders).mockResolvedValue([...orders]);
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

    await userEvent.type(screen.getByLabelText(/buscar clientes/i), '9988');

    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Gómez')).toBeInTheDocument();
  });

  it('shows the API error without injecting demo customers', async () => {
    vi.mocked(listCustomers).mockRejectedValue(new Error('Customers unavailable'));
    vi.mocked(listAllOrders).mockResolvedValue([]);

    renderCustomersPage();

    expect(
      await screen.findByText(/no se pudieron cargar los clientes/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no hay clientes cargados/i)).toBeInTheDocument();
    expect(screen.queryByText(/maría gómez/i)).not.toBeInTheDocument();
  });

  it('creates a customer from the form', async () => {
    vi.mocked(createCustomer).mockResolvedValue({
      id: 'customer-3',
      name: 'Carla Ruiz',
      phone: '1155550000',
      address: 'San Martín 123',
    });

    renderCustomersPage();
    await userEvent.click(screen.getByRole('button', { name: /nuevo cliente/i }));

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

  it('opens the detail panel when selecting a customer and saves changes', async () => {
    vi.mocked(updateCustomer).mockResolvedValue({
      id: 'customer-1',
      name: 'Ana Pérez',
      phone: '1133334444',
      address: 'Italia 456',
    });

    renderCustomersPage();

    await userEvent.click(await screen.findByLabelText(/cliente ana pérez/i));

    const detailPanel = screen.getByRole('region', { name: /detalle de ana pérez/i });
    expect(detailPanel).toHaveTextContent('Ana Pérez');
    expect(detailPanel).toHaveTextContent('Total comprado');

    await waitFor(() => {
      expect(detailPanel).toHaveTextContent('$ 36.000');
    });

    expect(detailPanel).toHaveTextContent('Historial de compras');
    expect(detailPanel).toHaveTextContent('Pendientes');

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

  it('opens the selected customer as a full-screen panel on mobile', async () => {
    mockDesktopViewport(false);

    renderCustomersPage();

    await userEvent.click(await screen.findByLabelText(/cliente bruno gómez/i));

    expect(screen.getByRole('region', { name: /detalle de bruno gómez/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del cliente/i)).toHaveValue('Bruno Gómez');
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /detalle de bruno gómez/i })).toHaveTextContent(
        '$ 6.500',
      );
    });

    await userEvent.click(screen.getByRole('button', { name: /volver/i }));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /detalle de bruno gómez/i })).not.toBeInTheDocument(),
    );
  });

  it('deletes a customer from the detail panel', async () => {
    vi.mocked(deleteCustomer).mockResolvedValue(undefined);

    renderCustomersPage();

    await userEvent.click(await screen.findByLabelText(/cliente bruno gómez/i));
    window.confirm = vi.fn(() => true);
    await userEvent.click(screen.getByRole('button', { name: /eliminar cliente/i }));

    expect(vi.mocked(deleteCustomer).mock.calls[0]?.[0]).toBe('customer-2');
  });

  it('filters customers with quick chips', async () => {
    renderCustomersPage();

    await screen.findByText('Ana Pérez');
    await userEvent.click(screen.getByRole('tab', { name: /con deuda/i }));

    expect(screen.queryByText('Bruno Gómez')).not.toBeInTheDocument();
  });
});
