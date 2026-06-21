import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getBusinessDateIso } from '@te-pinta/shared';

import { createQueryClient } from '@/lib/query-client';

import { listCustomers } from '../customers/customers-api';
import { listMenuItems } from '../menu/menu-api';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrder,
  updateOrderPayment,
  updateOrderStatus,
  type OrderListItem,
} from './orders-api';
import { getDeliveryFee, getOrderPromotionSettings } from './settings-api';
import { OrdersPage } from './OrdersPage';

vi.mock('../customers/customers-api', () => ({
  listCustomers: vi.fn(),
}));

vi.mock('../menu/menu-api', () => ({
  listMenuItems: vi.fn(),
}));

vi.mock('./settings-api', () => ({
  getDeliveryFee: vi.fn(),
  getOrderPromotionSettings: vi.fn(),
}));

vi.mock('./orders-api', () => ({
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  listOrders: vi.fn(),
  updateOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateOrderPayment: vi.fn(),
  deleteOrder: vi.fn(),
}));

const orderListItem = {
  id: 'order-1',
  customer: {
    id: 'customer-1',
    name: 'Ana Pérez',
    phone: '1122334455',
    address: 'Av. Siempre Viva 742',
  },
  deliveryDate: '2026-05-06',
  deliveryTime: 'noche' as const,
  deliveryType: 'envio' as const,
  cooked: false,
  notes: 'Tocar timbre',
  discountPercent: 10,
  deliveryFee: 1500,
  cookingFee: 0,
  subtotal: 24000,
  total: 23100,
  status: 'confirmado' as const,
  isPaid: false,
  items: [
    {
      id: 'item-1',
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 12,
      unitPrice: 12000,
      subtotal: 12000,
    },
    {
      id: 'item-2',
      menuItemId: 'menu-2',
      menuItemName: 'Humita',
      quantity: 12,
      unitPrice: 12000,
      subtotal: 12000,
    },
  ],
  itemCount: 2,
  totalQuantity: 24,
};

const finalizedOrderListItem = {
  ...orderListItem,
  id: 'order-2',
  customer: {
    id: 'customer-2',
    name: 'Mauro Altamirano',
    phone: '3537559269',
    address: 'Alcorta 66',
  },
  deliveryDate: '2026-05-08',
  deliveryTime: 'mediodia' as const,
  status: 'entregado' as const,
  isPaid: true,
  total: 39500,
};

const afternoonOrderListItem = {
  ...orderListItem,
  id: 'order-3',
  customer: {
    id: 'customer-3',
    name: 'Luis Gómez',
    phone: '3511112222',
    address: 'Ruta 9 100',
  },
  deliveryTime: 'tarde' as const,
  status: 'preparado' as const,
  cooked: true,
  total: 18000,
};

const orderList = [orderListItem];

const orderListResponse = (orders: OrderListItem[]) => {
  const finalized = orders.filter((order) => order.status === 'entregado' && order.isPaid).length;
  const pendingVarieties = [
    ...orders
      .filter((order) => order.status === 'confirmado')
      .flatMap((order) => order.items ?? [])
      .reduce<Map<string, { menuItemId: string; menuItemName: string; quantity: number }>>(
        (totals, item) => {
          const current = totals.get(item.menuItemId) ?? {
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: 0,
          };
          current.quantity += item.quantity;
          totals.set(item.menuItemId, current);
          return totals;
        },
        new Map(),
      )
      .values(),
  ].sort((left, right) => left.menuItemName.localeCompare(right.menuItemName, 'es-AR'));

  return {
    orders,
    pagination: {
      page: 1,
      pageSize: 25,
      total: orders.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    stats: {
      active: orders.length - finalized,
      finalized,
      pending: orders.filter((order) => order.status === 'confirmado').length,
      pendingVarieties,
    },
  };
};

const orderDetail = {
  ...orderListItem,
  addons: [],
  items: [
    {
      id: 'item-1',
      menuItemId: 'menu-1',
      menuItemName: 'Carne suave',
      quantity: 12,
      unitPrice: 12000,
      subtotal: 12000,
    },
    {
      id: 'item-2',
      menuItemId: 'menu-2',
      menuItemName: 'Humita',
      quantity: 12,
      unitPrice: 12000,
      subtotal: 12000,
    },
  ],
};

const renderOrdersPage = () => {
  const queryClient = createQueryClient();

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <OrdersPage />
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

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDesktopViewport(true);
    vi.mocked(listOrders).mockResolvedValue(orderListResponse(orderList));
    vi.mocked(getOrder).mockResolvedValue(orderDetail);
    vi.mocked(updateOrder).mockResolvedValue(orderDetail);
    vi.mocked(deleteOrder).mockResolvedValue(undefined);
    vi.mocked(listCustomers).mockResolvedValue([
      {
        id: 'customer-1',
        name: 'Ana Pérez',
        phone: '1122334455',
        address: 'Av. Siempre Viva 742',
      },
      {
        id: 'customer-2',
        name: 'Bruno López',
        phone: '1199998888',
        address: 'Belgrano 500',
      },
    ]);
    vi.mocked(listMenuItems).mockResolvedValue([
      {
        id: 'menu-1',
        name: 'Carne suave',
        priceUnit: 1200,
        priceHalfDozen: 6500,
        priceDozen: 12000,
        costPerDozen: 4800,
        isActive: true,
        isArchived: false,
      },
      {
        id: 'menu-2',
        name: 'Humita',
        priceUnit: 1100,
        priceHalfDozen: 6100,
        priceDozen: 11500,
        costPerDozen: 4300,
        isActive: true,
        isArchived: false,
      },
    ]);
    vi.mocked(getDeliveryFee).mockResolvedValue(1500);
    vi.mocked(getOrderPromotionSettings).mockResolvedValue({
      bulkDozenThreshold: 3,
      bulkDiscountPercent: 10,
      combinedDozenQuantity: 12,
      combinedDozenPrice: 15000,
      cookingFee: 0,
      addons: [
        { addonId: 'yasgua_salsa', name: 'Yasgua salsa', price: 500 },
        { addonId: 'yasgua_cremosa', name: 'Yasgua cremosa', price: 1000 },
      ],
    });
  });

  it('opens the selected order detail in a desktop drawer and updates it when selecting another order', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([orderListItem, afternoonOrderListItem]),
    );
    vi.mocked(getOrder).mockImplementation(async (id) =>
      id === 'order-3'
        ? { ...orderDetail, ...afternoonOrderListItem, items: orderDetail.items }
        : orderDetail,
    );

    renderOrdersPage();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByText(/phase 4\.5/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/detalle del pedido seleccionado/i)).not.toBeInTheDocument();

    const orderCard = within(screen.getByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));

    const drawer = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));
    expect(drawer.getByRole('heading', { name: /#p-00001/i })).toBeInTheDocument();
    expect(drawer.getByRole('tab', { name: /resumen/i })).toHaveAttribute('aria-selected', 'true');
    expect(drawer.getByText('Carne suave')).toBeInTheDocument();
    expect(drawer.getByText('Humita')).toBeInTheDocument();
    expect(drawer.getAllByText(/^12 unidades$/i)).toHaveLength(2);
    expect(drawer.queryByText(/12 unidades ·/i)).not.toBeInTheDocument();
    expect(drawer.getByText('$ 23.100')).toBeInTheDocument();
    expect(screen.getByLabelText(/pedido ana pérez/i)).toHaveAttribute('aria-selected', 'true');
    expect(getOrder).toHaveBeenCalledWith('order-1');

    await userEvent.click(
      within(screen.getByLabelText(/pedido luis gómez/i)).getByRole('button', {
        name: /ver detalle/i,
      }),
    );
    expect(await screen.findByRole('heading', { name: /#p-00003/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/pedido luis gómez/i)).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/pedido ana pérez/i)).toHaveAttribute('aria-selected', 'false');
  });

  it('closes the desktop detail panel with Escape and the close button', async () => {
    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));

    expect(await screen.findByRole('dialog', { name: /detalle del pedido/i })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /detalle del pedido/i })).not.toBeInTheDocument();

    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));
    const detail = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));
    await userEvent.click(detail.getByRole('button', { name: /cerrar detalle/i }));
    expect(screen.queryByRole('dialog', { name: /detalle del pedido/i })).not.toBeInTheDocument();
  });

  it('uses a full-screen mobile detail view with back and fixed actions', async () => {
    mockDesktopViewport(false);
    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));

    const page = within(
      await screen.findByRole('region', { name: /pantalla detalle del pedido/i }),
    );
    expect(page.getByRole('heading', { name: /#p-00001/i })).toBeInTheDocument();
    expect(page.getByRole('button', { name: /volver a pedidos/i })).toBeInTheDocument();
    expect(page.getByRole('navigation', { name: /secciones del detalle/i })).toBeInTheDocument();
    expect(page.getByLabelText(/acciones principales del pedido/i)).toHaveClass('fixed');

    await userEvent.click(page.getByRole('button', { name: /volver a pedidos/i }));
    expect(
      screen.queryByRole('region', { name: /pantalla detalle del pedido/i }),
    ).not.toBeInTheDocument();
  });

  it('shows active orders by default, finalized orders by filter, and formats order preview for Argentina', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([orderListItem, finalizedOrderListItem]),
    );

    renderOrdersPage();

    const activeCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    expect(activeCard.getByText(/miércoles/i)).toBeInTheDocument();
    expect(activeCard.getByText(/6 may 2026/i)).toBeInTheDocument();
    expect(activeCard.getByText(/1122334455/)).toBeInTheDocument();
    expect(activeCard.getByText(/av. siempre viva 742/i)).toBeInTheDocument();
    expect(activeCard.getByText(/12u\. carne suave/i)).toBeInTheDocument();
    expect(activeCard.getByText(/12u\. humita/i)).toBeInTheDocument();
    expect(activeCard.getByLabelText(/total del pedido/i)).toHaveTextContent('$ 23.100');
    expect(activeCard.queryByText(/variedades/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pedido mauro altamirano/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /finalizados/i }));

    const finalizedCard = within(await screen.findByLabelText(/pedido mauro altamirano/i));
    expect(finalizedCard.getByText(/viernes/i)).toBeInTheDocument();
    expect(finalizedCard.getByText(/8 may 2026/i)).toBeInTheDocument();
    expect(finalizedCard.getByText(/3537559269/)).toBeInTheDocument();
    expect(finalizedCard.getByLabelText(/total del pedido/i)).toHaveTextContent('$ 39.500');
    expect(screen.queryByLabelText(/pedido ana pérez/i)).not.toBeInTheDocument();
  });

  it('shows pending varieties only from active confirmed orders', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        orderListItem,
        afternoonOrderListItem,
        {
          ...orderListItem,
          id: 'order-4',
          customer: { ...orderListItem.customer, id: 'customer-4', name: 'Zoe Torres' },
          items: [
            {
              id: 'item-4',
              menuItemId: 'menu-1',
              menuItemName: 'Carne suave',
              quantity: 6,
              unitPrice: 6500,
              subtotal: 6500,
            },
          ],
          totalQuantity: 6,
        },
        finalizedOrderListItem,
      ]),
    );

    renderOrdersPage();

    await screen.findByLabelText(/pedido ana pérez/i);
    const pendingPanel = within(await screen.findByLabelText(/variedades pendientes/i));
    expect(pendingPanel.getByText(/18u\./i)).toBeInTheDocument();
    expect(pendingPanel.getByText(/carne suave/i)).toBeInTheDocument();
    expect(pendingPanel.getByText(/12u\./i)).toBeInTheDocument();
    expect(pendingPanel.getByText(/humita/i)).toBeInTheDocument();
  });

  it('hydrates variety names when the order list only has total quantities', async () => {
    const { items: _items, ...legacyOrderListItem } = orderListItem;
    void _items;
    vi.mocked(listOrders).mockResolvedValue({
      orders: [legacyOrderListItem],
      pagination: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      stats: {
        active: 1,
        finalized: 0,
        pending: 1,
      },
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    expect(await orderCard.findByText(/12u\. carne suave/i)).toBeInTheDocument();
    expect(orderCard.getByText(/12u\. humita/i)).toBeInTheDocument();

    const pendingPanel = within(screen.getByLabelText(/variedades pendientes/i));
    expect(await pendingPanel.findByText(/carne suave/i)).toBeInTheDocument();
    expect(pendingPanel.getByText(/humita/i)).toBeInTheDocument();
  });

  it('renders dashboard summary panels and the order table header', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([orderListItem, finalizedOrderListItem]),
    );

    renderOrdersPage();

    const summary = within(await screen.findByLabelText(/resumen de pedidos/i));
    expect(summary.getByText(/pedidos activos/i)).toBeInTheDocument();
    expect(summary.getByText(/pedidos finalizados/i)).toBeInTheDocument();
    expect(summary.getByText(/pendientes/i)).toBeInTheDocument();
    expect(summary.getByText(/ventas del día/i)).toBeInTheDocument();

    const header = within(screen.getByLabelText(/encabezado de tabla de pedidos/i));
    for (const column of [
      'Pedido',
      'Cliente',
      'Entrega',
      'Método',
      'Estado',
      'Total',
      'Acciones',
    ]) {
      expect(header.getByText(column)).toBeInTheDocument();
    }
  });

  it('keeps the header actions actionable without a notification control', async () => {
    renderOrdersPage();

    expect(await screen.findByRole('heading', { name: /pedidos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ nuevo pedido/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /notificaciones de pedidos/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/notificaciones/i)).not.toBeInTheDocument();
  });

  it('highlights delivery dates that are today or tomorrow in the order preview', async () => {
    const today = new Date();
    const todayIso = getBusinessDateIso(today);
    const tomorrowIso = getBusinessDateIso(addDays(today, 1));

    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        { ...orderListItem, deliveryDate: todayIso },
        {
          ...afternoonOrderListItem,
          id: 'order-tomorrow',
          customer: { ...afternoonOrderListItem.customer, name: 'Pedido Mañana' },
          deliveryDate: tomorrowIso,
        },
      ]),
    );

    renderOrdersPage();

    const todayCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    const tomorrowCard = within(await screen.findByLabelText(/pedido pedido mañana/i));

    expect(todayCard.getByText('HOY')).toBeInTheDocument();
    expect(tomorrowCard.getByText('MAÑANA')).toBeInTheDocument();
  });

  it('filters active orders by delivery date in the table', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        orderListItem,
        afternoonOrderListItem,
        {
          ...orderListItem,
          id: 'order-4',
          deliveryDate: '2026-05-07',
          customer: { ...orderListItem.customer, name: 'Otro día' },
        },
        finalizedOrderListItem,
      ]),
    );

    renderOrdersPage();

    expect(await screen.findByLabelText(/pedido ana pérez/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pedido luis gómez/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/filtrar por fecha de entrega/i), '2026-05-06');

    expect(screen.getByLabelText(/pedido ana pérez/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pedido luis gómez/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/pedido otro día/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pedido mauro altamirano/i)).not.toBeInTheDocument();
  });

  it('searches, sorts, and applies status and method filters from the toolbar', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        orderListItem,
        afternoonOrderListItem,
        {
          ...orderListItem,
          id: 'order-4',
          customer: { ...orderListItem.customer, id: 'customer-4', name: 'Zoe Torres' },
          cooked: true,
          deliveryType: 'retiro' as const,
          isPaid: true,
          total: 45000,
        },
      ]),
    );

    renderOrdersPage();

    expect(await screen.findByLabelText(/pedido ana pérez/i)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/ordenar por/i), 'total_desc');

    const cardsByPrice = screen.getAllByRole('article', { name: /pedido /i });
    expect(cardsByPrice[0]).toHaveAccessibleName(/zoe torres/i);
    expect(cardsByPrice[1]).toHaveAccessibleName(/ana pérez/i);
    expect(cardsByPrice[2]).toHaveAccessibleName(/luis gómez/i);

    await userEvent.type(screen.getByRole('searchbox', { name: /buscar pedido/i }), 'luis');
    expect(screen.queryByLabelText(/pedido ana pérez/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/pedido luis gómez/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByRole('searchbox', { name: /buscar pedido/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /estado/i }), 'preparado');
    expect(screen.queryByLabelText(/pedido ana pérez/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/pedido luis gómez/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /estado/i }), 'todos');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /método/i }), 'pagado');
    expect(screen.getByLabelText(/pedido zoe torres/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/pedido ana pérez/i)).not.toBeInTheDocument();
  });

  it('keeps the closest and farthest date sort options aligned with their labels', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        {
          ...orderListItem,
          id: 'order-4',
          customer: { ...orderListItem.customer, id: 'customer-4', name: 'Pedido Lejano' },
          deliveryDate: '2026-05-10',
        },
        orderListItem,
      ]),
    );

    renderOrdersPage();

    expect(await screen.findByLabelText(/pedido ana pérez/i)).toBeInTheDocument();
    const closestCards = screen.getAllByRole('article', { name: /pedido /i });
    expect(closestCards[0]).toHaveAccessibleName(/ana pérez/i);
    expect(closestCards[1]).toHaveAccessibleName(/pedido lejano/i);
    expect(vi.mocked(listOrders).mock.calls[0]?.[0]).toMatchObject({
      sortBy: 'deliveryDate',
      sortDir: 'asc',
    });

    await userEvent.selectOptions(screen.getByLabelText(/ordenar por/i), 'date_desc');

    const farthestCards = screen.getAllByRole('article', { name: /pedido /i });
    expect(farthestCards[0]).toHaveAccessibleName(/pedido lejano/i);
    expect(farthestCards[1]).toHaveAccessibleName(/ana pérez/i);
    expect(vi.mocked(listOrders).mock.calls.at(-1)?.[0]).toMatchObject({
      sortBy: 'deliveryDate',
      sortDir: 'desc',
    });
  });

  it('orders same-day deliveries by shift from mediodía to noche', async () => {
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([
        {
          ...orderListItem,
          id: 'order-night',
          customer: { ...orderListItem.customer, id: 'customer-night', name: 'Noche' },
          deliveryTime: 'noche',
        },
        {
          ...orderListItem,
          id: 'order-midday',
          customer: { ...orderListItem.customer, id: 'customer-midday', name: 'Mediodía' },
          deliveryTime: 'mediodia',
        },
        {
          ...orderListItem,
          id: 'order-afternoon',
          customer: { ...orderListItem.customer, id: 'customer-afternoon', name: 'Tarde' },
          deliveryTime: 'tarde',
        },
      ]),
    );

    renderOrdersPage();

    await screen.findByLabelText(/pedido mediodía/i);
    const cards = screen.getAllByRole('article', { name: /pedido /i });
    expect(cards[0]).toHaveAccessibleName(/mediodía/i);
    expect(cards[1]).toHaveAccessibleName(/tarde/i);
    expect(cards[2]).toHaveAccessibleName(/noche/i);
  });

  it('renders the create order dialog outside the page container so the overlay covers the whole app', async () => {
    const { container } = renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));

    const dialog = await screen.findByRole('dialog', { name: /nuevo pedido/i });
    expect(container).not.toContain(dialog);
  });

  it('generates a visible kitchen list even when automatic clipboard copy is unavailable', async () => {
    renderOrdersPage();

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('checkbox', { name: /seleccionar pedido #p-00001 para lista de cocina/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /generar lista/i }));

    const generatedList = await screen.findByLabelText(/lista de cocina generada/i);
    const generatedListText = (generatedList as HTMLTextAreaElement).value;
    expect(generatedListText).toContain('*LISTA DE COCINA*');
    expect(generatedListText).toContain('*1. Ana Pérez*  ·  _#P-00001_');
    expect(generatedListText).toContain('*Franja:* Noche · ENVÍO · CRUDO');
    expect(generatedListText).toContain('*Variedades:*');
    expect(generatedListText).toContain('• Carne suave: *12 u.*');
    expect(generatedListText).toContain('*Total pedido:* $ 23.100');
    expect(generatedListText).toContain('*TOTALES POR VARIEDAD*');
    expect(generatedListText).toContain('• Carne suave: *12 u.*');
    expect(generatedListText).toContain('• Humita: *12 u.*');
    expect(generatedListText).not.toContain('_Dirección:_');
    expect(generatedListText).not.toContain('*Entrega:*');
    expect(generatedListText).not.toContain('_Tel:_');
    expect(screen.getByText(/la podés copiar desde abajo/i)).toBeInTheDocument();
  });

  it('shows the redesigned desktop order form sections and updates the sticky summary', async () => {
    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    expect(dialog.getByRole('heading', { name: /1\. cliente/i })).toBeInTheDocument();
    expect(dialog.getByRole('heading', { name: /2\. detalles del pedido/i })).toBeInTheDocument();
    expect(dialog.getByRole('heading', { name: /3\. productos/i })).toBeInTheDocument();
    expect(dialog.getByRole('heading', { name: /4\. resumen del pedido/i })).toBeInTheDocument();
    expect(dialog.getByText(/podrás revisar el pedido antes de confirmarlo/i)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: /seleccionar cliente ana pérez/i }));
    const carneCard = within(dialog.getByLabelText(/variedad carne suave/i));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ docena/i }));
    const summary = within(dialog.getByLabelText(/preview de total/i));

    expect(summary.getByText('Ana Pérez')).toBeInTheDocument();
    expect(summary.getByText(/Carne suave/)).toBeInTheDocument();
    expect(summary.getByText(/1 × \$ 12\.000/)).toBeInTheDocument();
    expect(summary.getByText('$ 13.500')).toBeInTheDocument();
  });

  it('shows the mobile order wizard and advances through the three steps', async () => {
    mockDesktopViewport(false);
    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    expect(dialog.getByRole('heading', { name: /nuevo pedido/i })).toBeInTheDocument();
    expect(dialog.getByText(/cliente y entrega/i)).toBeInTheDocument();
    expect(dialog.getByText(/variedades/i)).toBeInTheDocument();
    expect(dialog.getByText(/extras y resumen/i)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: /^continuar$/i }));
    expect(dialog.getByRole('heading', { name: /^variedades$/i })).toBeInTheDocument();
    const stepTwoContinue = dialog.getByRole('button', { name: /^continuar$/i });
    expect(stepTwoContinue).toHaveTextContent(/continuar/i);
    expect(stepTwoContinue.closest('form')).toBeNull();

    await userEvent.click(stepTwoContinue);
    expect(dialog.getByRole('heading', { name: /extras y resumen/i })).toBeInTheDocument();
    expect(dialog.getByText(/pedido seguro y confirmado/i)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /^crear pedido$/i })).toBeInTheDocument();
  });

  it('does not create the mobile order when continuing from varieties to extras', async () => {
    mockDesktopViewport(false);
    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    await dialog.findByText('Ana Pérez');
    await userEvent.click(dialog.getByRole('button', { name: /seleccionar cliente ana pérez/i }));
    await userEvent.type(dialog.getByLabelText(/fecha de entrega/i), '2026-05-07');
    await userEvent.click(dialog.getByRole('button', { name: /^continuar$/i }));

    const carneCard = within(await dialog.findByLabelText(/variedad carne suave/i));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ docena/i }));
    await userEvent.click(dialog.getByRole('button', { name: /^continuar$/i }));

    expect(createOrder).not.toHaveBeenCalled();
    expect(dialog.getByRole('heading', { name: /extras y resumen/i })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /^crear pedido$/i })).toBeInTheDocument();
  });

  it('lets mobile users return to the first step after final validation errors', async () => {
    mockDesktopViewport(false);
    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    await userEvent.type(dialog.getByLabelText(/fecha de entrega/i), '2026-05-07');
    await userEvent.click(dialog.getByRole('button', { name: /^continuar$/i }));

    const carneCard = within(await dialog.findByLabelText(/variedad carne suave/i));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ docena/i }));
    await userEvent.click(dialog.getByRole('button', { name: /^continuar$/i }));
    await userEvent.click(dialog.getByRole('button', { name: /^crear pedido$/i }));

    expect(createOrder).not.toHaveBeenCalled();
    expect(dialog.getByRole('status', { name: /errores del pedido/i })).toHaveTextContent(
      /seleccioná un cliente/i,
    );

    await userEvent.click(dialog.getByRole('button', { name: /cliente y entrega/i }));

    expect(dialog.getByRole('searchbox', { name: /buscar cliente/i })).toBeInTheDocument();
    expect(dialog.getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('creates an order for an existing customer with delivery, discount, fee preview and varieties', async () => {
    vi.mocked(createOrder).mockResolvedValue(orderDetail);

    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    await dialog.findByText('Bruno López');
    await userEvent.type(dialog.getByRole('searchbox', { name: /buscar cliente/i }), 'ana');
    expect(dialog.queryByText('Bruno López')).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: /seleccionar cliente ana pérez/i }));
    await userEvent.type(dialog.getByLabelText(/fecha de entrega/i), '2026-05-07');
    await userEvent.selectOptions(dialog.getByLabelText(/franja/i), 'noche');
    expect(dialog.getByRole('button', { name: /envío/i })).toBeInTheDocument();
    expect(dialog.queryByText(/incluye fee de delivery/i)).not.toBeInTheDocument();
    expect(dialog.queryByText(/el cliente pasa a buscar/i)).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /crudo/i })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: /cocinado/i })).toBeInTheDocument();
    expect(dialog.queryByLabelText(/pedido cocido/i)).not.toBeInTheDocument();
    await userEvent.clear(dialog.getByLabelText(/descuento/i));
    await userEvent.type(dialog.getByLabelText(/descuento/i), '10');
    const carneCard = within(dialog.getByLabelText(/variedad carne suave/i));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ docena/i }));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ unidad/i }));
    const yasguaCard = within(dialog.getByLabelText(/topping yasgua salsa/i));
    await userEvent.click(yasguaCard.getByRole('button', { name: /sumar yasgua salsa/i }));

    const preview = within(dialog.getByLabelText(/preview de total/i));
    expect(preview.getByText('$ 13.700')).toBeInTheDocument();
    expect(preview.getAllByText(/adicionales/i).length).toBeGreaterThan(0);
    expect(preview.getAllByText('$ 500').length).toBeGreaterThan(0);
    expect(preview.getByText(/delivery/i)).toBeInTheDocument();
    expect(preview.getByText('$ 1.500')).toBeInTheDocument();
    expect(preview.getByText('$ 13.830')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: /^crear pedido$/i }));

    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).toEqual({
      customer: { existingCustomerId: 'customer-1' },
      deliveryDate: '2026-05-07',
      deliveryTime: 'noche',
      deliveryType: 'envio',
      cooked: false,
      notes: undefined,
      discountPercent: 10,
      deliveryFee: 1500,
      items: [{ menuItemId: 'menu-1', quantity: 13 }],
      addons: [{ addonId: 'yasgua_salsa', quantity: 1 }],
    });
    expect(screen.queryByRole('dialog', { name: /nuevo pedido/i })).not.toBeInTheDocument();
  });

  it('does not submit an incomplete order form with invalid required inputs', async () => {
    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));
    await dialog.findByText('Ana Pérez');
    await userEvent.click(dialog.getByRole('button', { name: /^crear pedido$/i }));

    expect(createOrder).not.toHaveBeenCalled();
    expect(dialog.getByLabelText(/fecha de entrega/i)).toBeInvalid();
    const errors = dialog.getByRole('status', { name: /errores del pedido/i });
    expect(errors).toHaveTextContent(/seleccioná un cliente/i);
    expect(errors).toHaveTextContent(/agregá al menos una variedad/i);
  });

  it('creates an order with only the new customer name because phone and address can be added later', async () => {
    vi.mocked(createOrder).mockResolvedValue(orderDetail);

    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    await userEvent.click(dialog.getByRole('radio', { name: /nuevo cliente/i }));
    await userEvent.type(dialog.getByLabelText(/nombre nuevo cliente/i), 'Carla Ruiz');
    await userEvent.type(dialog.getByLabelText(/fecha de entrega/i), '2026-05-07');
    const humitaCard = within(dialog.getByLabelText(/variedad humita/i));
    await userEvent.click(humitaCard.getByRole('button', { name: /\+ media/i }));

    await userEvent.click(dialog.getByRole('button', { name: /^crear pedido$/i }));

    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).toMatchObject({
      customer: { newCustomer: { name: 'Carla Ruiz' } },
      deliveryType: 'envio',
      cooked: false,
      items: [{ menuItemId: 'menu-2', quantity: 6 }],
    });
  });

  it('creates an order with a new customer mode', async () => {
    vi.mocked(createOrder).mockResolvedValue(orderDetail);

    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /\+ nuevo pedido/i }));
    const dialog = within(await screen.findByRole('dialog', { name: /nuevo pedido/i }));

    await userEvent.click(dialog.getByRole('radio', { name: /nuevo cliente/i }));
    await userEvent.type(dialog.getByLabelText(/nombre nuevo cliente/i), 'Carla Ruiz');
    await userEvent.type(dialog.getByLabelText(/teléfono nuevo cliente/i), '1155550000');
    await userEvent.type(dialog.getByLabelText(/dirección nuevo cliente/i), 'San Martín 123');
    await userEvent.type(dialog.getByLabelText(/fecha de entrega/i), '2026-05-07');
    await userEvent.click(dialog.getByRole('button', { name: /retiro/i }));
    await userEvent.click(dialog.getByRole('button', { name: /cocinado/i }));
    const humitaCard = within(dialog.getByLabelText(/variedad humita/i));
    await userEvent.click(humitaCard.getByRole('button', { name: /\+ media/i }));

    await userEvent.click(dialog.getByRole('button', { name: /^crear pedido$/i }));

    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).toMatchObject({
      customer: {
        newCustomer: {
          name: 'Carla Ruiz',
          phone: '1155550000',
          address: 'San Martín 123',
        },
      },
      cooked: true,
      items: [{ menuItemId: 'menu-2', quantity: 6 }],
    });
  });

  it('edits an order from the preview using the order dialog', async () => {
    vi.mocked(updateOrder).mockResolvedValue({ ...orderDetail, cooked: true });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /más opciones/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /editar pedido de ana pérez/i }));

    const dialog = within(await screen.findByRole('dialog', { name: /editar pedido/i }));
    expect(dialog.getByLabelText(/fecha de entrega/i)).toHaveValue('2026-05-06');
    expect(dialog.getByRole('button', { name: /envío/i })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(dialog.getByRole('button', { name: /cocinado/i }));
    const carneCard = within(dialog.getByLabelText(/variedad carne suave/i));
    await userEvent.click(carneCard.getByRole('button', { name: /\+ unidad/i }));

    await userEvent.click(dialog.getByRole('button', { name: /guardar cambios/i }));

    expect(updateOrder).toHaveBeenCalledWith('order-1', {
      customer: { existingCustomerId: 'customer-1' },
      deliveryDate: '2026-05-06',
      deliveryTime: 'noche',
      deliveryType: 'envio',
      cooked: true,
      notes: 'Tocar timbre',
      discountPercent: 10,
      deliveryFee: 1500,
      items: [
        { menuItemId: 'menu-1', quantity: 13 },
        { menuItemId: 'menu-2', quantity: 12 },
      ],
      addons: [],
    });
  });

  it('deletes an order from the preview after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /más opciones/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /eliminar pedido de ana pérez/i }));

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar el pedido de Ana Pérez?');
    expect(vi.mocked(deleteOrder).mock.calls[0]?.[0]).toBe('order-1');
    confirmSpy.mockRestore();
  });

  it('shows compact status, payment, delivery and shift badges in the order preview', async () => {
    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    const paymentButton = orderCard.getByRole('button', { name: /marcar como pagado/i });

    const statusBadge = orderCard.getByText(/^Confirmado$/i);
    const deliveryBadge = orderCard.getByText(/envío/i);
    expect(statusBadge).toHaveClass('h-[1.45rem]', 'rounded-full', 'bg-violet-600');
    expect(deliveryBadge).toHaveClass('h-[1.45rem]', 'rounded-full', 'bg-sky-600');
    expect(orderCard.queryByText(/crudo/i)).not.toBeInTheDocument();
    expect(orderCard.getByText(/noche/i)).toHaveClass('bg-indigo-100');
    expect(screen.getByLabelText(/indicador de estado confirmado/i)).toHaveClass('bg-violet-500');
    expect(paymentButton).toHaveClass('h-[1.45rem]', 'rounded-full', 'bg-red-500');
    expect(paymentButton).toHaveTextContent('No pagado');
  });

  it('updates payment from the order preview', async () => {
    vi.mocked(updateOrderPayment).mockResolvedValue({
      ...orderDetail,
      isPaid: true,
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /marcar como pagado/i }));

    expect(updateOrderPayment).toHaveBeenCalledWith('order-1', true);
  });

  it('toggles confirmed and prepared from the order preview without using delivered', async () => {
    vi.mocked(updateOrderStatus).mockResolvedValue({
      ...orderDetail,
      status: 'preparado',
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /marcar pedido como preparado/i }));

    expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'preparado');
  });

  it('updates payment from the order detail panel', async () => {
    vi.mocked(updateOrderPayment).mockResolvedValue({
      ...orderDetail,
      isPaid: true,
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));
    const detail = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));
    await userEvent.click(detail.getByRole('button', { name: /marcar pedido como pagado/i }));

    expect(updateOrderPayment).toHaveBeenCalledWith('order-1', true);
  });

  it('copies a clean customer-facing order detail from the detail panel', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));
    const detail = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));

    await userEvent.click(detail.getByRole('button', { name: /copiar para cliente/i }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const message = writeText.mock.calls[0]?.[0] as string;
    expect(message).toContain('*Pedido #P-00001*');
    expect(message).toContain('*Productos:*');
    expect(message).toContain('• 12u. Carne suave — $ 12.000');
    expect(message).toContain('• 12u. Humita — $ 12.000');
    expect(message).toContain('*Resumen:*');
    expect(message).toContain('*Total: $ 23.100*');
    expect(message).not.toContain('*Entrega:*');
    expect(message).not.toContain('• Fecha:');
    expect(message).not.toContain('Pago: Pendiente');
    expect(message).not.toContain('Hola');
    expect(await detail.findByRole('status')).toHaveTextContent(/detalle copiado/i);
  });

  it('keeps mobile filters collapsed until opening the filter panel', async () => {
    mockDesktopViewport(false);
    renderOrdersPage();

    expect(await screen.findByRole('searchbox', { name: /buscar pedido/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/filtrar por fecha de entrega/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /filtros/i }));

    expect(screen.getByLabelText(/filtrar por fecha de entrega/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /estado/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /método/i })).toBeInTheDocument();
  });

  it('updates an order status from the detail panel actions', async () => {
    vi.mocked(updateOrderStatus).mockResolvedValue({
      ...orderDetail,
      status: 'preparado',
    });

    renderOrdersPage();

    const orderCard = within(await screen.findByLabelText(/pedido ana pérez/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));
    const detail = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));
    await userEvent.click(detail.getByRole('button', { name: /marcar como listo/i }));

    expect(updateOrderStatus).toHaveBeenCalledWith('order-1', 'preparado');
  });

  it('lets delivered orders return to prepared from the detail panel', async () => {
    const deliveredDetail = {
      ...orderDetail,
      ...finalizedOrderListItem,
      items: orderDetail.items,
      addons: orderDetail.addons,
    };
    vi.mocked(listOrders).mockResolvedValue(
      orderListResponse([orderListItem, finalizedOrderListItem]),
    );
    vi.mocked(getOrder).mockResolvedValue(deliveredDetail);
    vi.mocked(updateOrderStatus).mockResolvedValue({
      ...deliveredDetail,
      status: 'preparado',
    });

    renderOrdersPage();

    await userEvent.click(await screen.findByRole('button', { name: /finalizados/i }));
    const orderCard = within(await screen.findByLabelText(/pedido mauro altamirano/i));
    await userEvent.click(orderCard.getByRole('button', { name: /ver detalle/i }));
    const detail = within(await screen.findByRole('dialog', { name: /detalle del pedido/i }));

    const backToPreparedButton = detail.getByRole('button', { name: /volver a preparado/i });
    expect(backToPreparedButton).toBeEnabled();
    expect(detail.getByRole('button', { name: /^entregado$/i })).toBeDisabled();

    await userEvent.click(backToPreparedButton);

    expect(updateOrderStatus).toHaveBeenCalledWith('order-2', 'preparado');
  });
});
