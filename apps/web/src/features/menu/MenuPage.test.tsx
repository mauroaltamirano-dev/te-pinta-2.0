import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { MenuPage } from './MenuPage';
import { createMenuItem, listMenuItems, updateMenuItem } from './menu-api';

vi.mock('./menu-api', () => ({
  createMenuItem: vi.fn(),
  listMenuItems: vi.fn(),
  updateMenuItem: vi.fn(),
}));

const renderMenuPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MenuPage />
    </QueryClientProvider>,
  );
};

describe('MenuPage', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.mocked(listMenuItems).mockResolvedValue([
      {
        id: 'menu-1',
        name: 'Carne suave',
        priceUnit: 1200,
        priceHalfDozen: 6500,
        priceDozen: 12000,
        costPerDozen: 4800,
        isActive: true,
      },
      {
        id: 'menu-2',
        name: 'Humita',
        priceUnit: 1100,
        priceHalfDozen: 6100,
        priceDozen: 11500,
        costPerDozen: 4300,
        isActive: false,
      },
    ]);
  });

  it('lists menu items and filters them by search text', async () => {
    renderMenuPage();

    expect(await screen.findByLabelText(/variedad carne suave/i)).toBeInTheDocument();
    expect(screen.getByText('Humita')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /detalle de variedad seleccionada/i }))
      .toHaveTextContent('Carne suave');

    await userEvent.type(screen.getByLabelText(/buscar variedad/i), 'carne');

    expect(screen.getByLabelText(/variedad carne suave/i)).toBeInTheDocument();
    expect(screen.queryByText('Humita')).not.toBeInTheDocument();
  });

  it('creates a menu item from the form', async () => {
    vi.mocked(createMenuItem).mockResolvedValue({
      id: 'menu-3',
      name: 'Jamón y queso',
      priceUnit: 1300,
      priceHalfDozen: 7000,
      priceDozen: 13000,
      costPerDozen: 5000,
      isActive: true,
    });

    renderMenuPage();
    await userEvent.click(screen.getAllByRole('button', { name: /\+ nueva variedad/i })[0]!);

    await userEvent.type(screen.getByLabelText(/nombre de variedad/i), 'Jamón y queso');
    await userEvent.clear(screen.getByLabelText(/precio unidad/i));
    await userEvent.type(screen.getByLabelText(/precio unidad/i), '1300');
    await userEvent.clear(screen.getByLabelText(/precio media docena/i));
    await userEvent.type(screen.getByLabelText(/precio media docena/i), '7000');
    await userEvent.clear(screen.getByLabelText(/precio docena/i));
    await userEvent.type(screen.getByLabelText(/^precio docena/i), '13000');
    await userEvent.clear(screen.getByLabelText(/costo por docena/i));
    await userEvent.type(screen.getByLabelText(/costo por docena/i), '5000');
    await userEvent.click(screen.getByRole('button', { name: /guardar variedad/i }));

    expect(vi.mocked(createMenuItem).mock.calls[0]?.[0]).toEqual({
      name: 'Jamón y queso',
      priceUnit: 1300,
      priceHalfDozen: 7000,
      priceDozen: 13000,
      costPerDozen: 5000,
      isActive: true,
    });
  });

  it('can toggle a menu item active state', async () => {
    vi.mocked(updateMenuItem).mockResolvedValue({
      id: 'menu-2',
      name: 'Humita',
      priceUnit: 1100,
      priceHalfDozen: 6100,
      priceDozen: 11500,
      costPerDozen: 4300,
      isActive: true,
    });

    renderMenuPage();

    const humitaRow = within(await screen.findByLabelText(/variedad humita/i));
    await userEvent.click(humitaRow.getByRole('button', { name: /activar/i }));

    expect(vi.mocked(updateMenuItem).mock.calls[0]?.slice(0, 2)).toEqual([
      'menu-2',
      { isActive: true },
    ]);
  });

  it('scrolls to the detail panel when selecting a menu card on mobile', async () => {
    renderMenuPage();

    const humitaCard = await screen.findByLabelText(/variedad humita/i);
    await userEvent.click(humitaCard);

    expect(screen.getByRole('region', { name: /detalle de variedad seleccionada/i }))
      .toHaveTextContent('Humita');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('can edit a menu item from the form panel', async () => {
    vi.mocked(updateMenuItem).mockResolvedValue({
      id: 'menu-1',
      name: 'Carne cortada a cuchillo',
      priceUnit: 1400,
      priceHalfDozen: 7200,
      priceDozen: 14000,
      costPerDozen: 5200,
      isActive: true,
    });

    renderMenuPage();

    const carneRow = within(await screen.findByLabelText(/variedad carne suave/i));
    await userEvent.click(carneRow.getByRole('button', { name: /editar/i }));

    await userEvent.clear(screen.getByLabelText(/nombre de variedad/i));
    await userEvent.type(screen.getByLabelText(/nombre de variedad/i), 'Carne cortada a cuchillo');
    await userEvent.clear(screen.getByLabelText(/precio unidad/i));
    await userEvent.type(screen.getByLabelText(/precio unidad/i), '1400');
    await userEvent.clear(screen.getByLabelText(/^precio docena/i));
    await userEvent.type(screen.getByLabelText(/^precio docena/i), '14000');

    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(vi.mocked(updateMenuItem).mock.calls[0]).toEqual([
      'menu-1',
      {
        name: 'Carne cortada a cuchillo',
        priceUnit: 1400,
        priceHalfDozen: 6500,
        priceDozen: 14000,
        costPerDozen: 4800,
        isActive: true,
      },
    ]);
  });

  it('scrolls to the edit form and focuses the name field when editing on mobile', async () => {
    renderMenuPage();

    const carneRow = await screen.findByLabelText(/variedad carne suave/i);
    await userEvent.click(within(carneRow).getByRole('button', { name: /editar/i }));

    await waitFor(() =>
      expect(screen.getByRole('region', { name: /formulario de edición de variedad/i }))
        .toHaveTextContent('Editando Carne suave'),
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    await waitFor(() => expect(screen.getByLabelText(/nombre de variedad/i)).toHaveFocus());
  });

  it('scrolls back to the edited variety after saving changes', async () => {
    vi.mocked(updateMenuItem).mockResolvedValue({
      id: 'menu-1',
      name: 'Carne suave corregida',
      priceUnit: 1200,
      priceHalfDozen: 6500,
      priceDozen: 12000,
      costPerDozen: 4800,
      isActive: true,
    });

    renderMenuPage();

    const carneRow = await screen.findByLabelText(/variedad carne suave/i);
    await userEvent.click(within(carneRow).getByRole('button', { name: /editar/i }));
    scrollIntoView.mockClear();

    await userEvent.clear(screen.getByLabelText(/nombre de variedad/i));
    await userEvent.type(screen.getByLabelText(/nombre de variedad/i), 'Carne suave corregida');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' }),
    );
  });
});
