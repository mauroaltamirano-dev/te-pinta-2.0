import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from './ingredients-api';
import { IngredientsPage } from './IngredientsPage';

vi.mock('./ingredients-api', () => ({
  createIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  listIngredients: vi.fn(),
  updateIngredient: vi.fn(),
}));

const renderIngredientsPage = () => {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <IngredientsPage />
    </QueryClientProvider>,
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

describe('IngredientsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDesktopViewport(true);
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(listIngredients).mockResolvedValue([
      {
        id: 'ingredient-1',
        name: 'Harina 0000',
        unit: 'kg',
        purchasePrice: 900,
      },
      {
        id: 'ingredient-2',
        name: 'Aceitunas',
        unit: 'g',
        purchasePrice: 120,
      },
    ]);
  });

  it('lists ingredients and filters by name', async () => {
    renderIngredientsPage();

    expect(await screen.findByText('Harina 0000')).toBeInTheDocument();
    expect(screen.getByText('Aceitunas')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/buscar ingrediente/i), 'harina');

    expect(screen.getByText('Harina 0000')).toBeInTheDocument();
    expect(screen.queryByText('Aceitunas')).not.toBeInTheDocument();
  });

  it('creates an ingredient from the form', async () => {
    vi.mocked(createIngredient).mockResolvedValue({
      id: 'ingredient-3',
      name: 'Mozzarella',
      unit: 'kg',
      purchasePrice: 4200,
    });

    renderIngredientsPage();

    await userEvent.type(screen.getByLabelText(/nombre del ingrediente/i), 'Mozzarella');
    await userEvent.selectOptions(screen.getByLabelText(/unidad/i), 'kg');
    await userEvent.clear(screen.getByLabelText(/precio de compra/i));
    await userEvent.type(screen.getByLabelText(/precio de compra/i), '4200');
    await userEvent.click(screen.getByRole('button', { name: /guardar ingrediente/i }));

    expect(vi.mocked(createIngredient).mock.calls[0]?.[0]).toEqual({
      name: 'Mozzarella',
      unit: 'kg',
      purchasePrice: 4200,
    });
  });

  it('opens the edit panel when selecting an ingredient and saves changes', async () => {
    vi.mocked(updateIngredient).mockResolvedValue({
      id: 'ingredient-1',
      name: 'Harina 0000',
      unit: 'kg',
      purchasePrice: 1100,
    });

    renderIngredientsPage();

    await userEvent.click(await screen.findByLabelText(/ingrediente harina 0000/i));

    expect(
      screen.getByRole('region', { name: /formulario de edición de ingrediente/i }),
    ).toHaveTextContent('Editando Harina 0000');
    expect(screen.getByLabelText(/nombre del ingrediente/i)).toHaveValue('Harina 0000');
    expect(screen.getByLabelText(/unidad/i)).toHaveValue('kg');
    expect(screen.getByLabelText(/precio de compra/i)).toHaveValue(900);

    await userEvent.clear(screen.getByLabelText(/precio de compra/i));
    await userEvent.type(screen.getByLabelText(/precio de compra/i), '1100');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(vi.mocked(updateIngredient).mock.calls[0]).toEqual([
      'ingredient-1',
      {
        name: 'Harina 0000',
        unit: 'kg',
        purchasePrice: 1100,
      },
    ]);
  });

  it('opens the selected ingredient as a full-screen edit panel on mobile', async () => {
    mockDesktopViewport(false);

    renderIngredientsPage();

    await userEvent.click(await screen.findByLabelText(/ingrediente aceitunas/i));

    expect(
      screen.getByRole('region', { name: /formulario de edición de ingrediente/i }),
    ).toHaveTextContent('Editando Aceitunas');
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del ingrediente/i)).toHaveValue('Aceitunas');

    await userEvent.click(screen.getByRole('button', { name: /volver/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /formulario de edición de ingrediente/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('deletes an ingredient from the list', async () => {
    vi.mocked(deleteIngredient).mockResolvedValue(undefined);

    renderIngredientsPage();

    const ingredientRow = within(await screen.findByLabelText(/ingrediente aceitunas/i));
    await userEvent.click(ingredientRow.getByRole('button', { name: /eliminar/i }));

    expect(vi.mocked(deleteIngredient).mock.calls[0]?.[0]).toBe('ingredient-2');
  });
});
