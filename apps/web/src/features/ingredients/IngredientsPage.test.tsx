import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { createQueryClient } from '@/lib/query-client';

import { createIngredient, deleteIngredient, listIngredients } from './ingredients-api';
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

describe('IngredientsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('deletes an ingredient from the list', async () => {
    vi.mocked(deleteIngredient).mockResolvedValue(undefined);

    renderIngredientsPage();

    const ingredientRow = within(await screen.findByLabelText(/ingrediente aceitunas/i));
    await userEvent.click(ingredientRow.getByRole('button', { name: /eliminar/i }));

    expect(vi.mocked(deleteIngredient).mock.calls[0]?.[0]).toBe('ingredient-2');
  });
});
