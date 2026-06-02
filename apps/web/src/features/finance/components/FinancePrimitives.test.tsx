import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DisclosurePanel } from './DisclosurePanel';
import { FinanceActionSheet } from './FinanceActionSheet';
import { FinanceTable, type FinanceTableColumn } from './FinanceTable';
import { MetricCard } from './MetricCard';

describe('Finance shared primitives', () => {
  it('renders an accessible action sheet with close and back affordances', async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();

    const SheetHarness = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <FinanceActionSheet
          backLabel="Volver al catálogo"
          closeLabel="Cerrar creación"
          description="Cargá productos sin perder el flujo."
          isOpen={isOpen}
          onBack={handleBack}
          onClose={() => setIsOpen(false)}
          title="Nuevo producto"
        >
          <button type="button">Guardar producto</button>
        </FinanceActionSheet>
      );
    };

    render(<SheetHarness />);

    const dialog = screen.getByRole('dialog', { name: /nuevo producto/i });

    expect(dialog).toHaveAccessibleDescription(/cargá productos/i);
    expect(within(dialog).getByRole('button', { name: /guardar producto/i })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /volver al catálogo/i }));
    expect(handleBack).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole('button', { name: /cerrar creación/i }));
    expect(screen.queryByRole('dialog', { name: /nuevo producto/i })).not.toBeInTheDocument();
  });

  it('renders an accessible finance table and calls sortable header callbacks', async () => {
    const user = userEvent.setup();
    const handleSort = vi.fn();
    const columns: FinanceTableColumn<{ id: string; name: string; cost: string }>[] = [
      {
        id: 'name',
        header: 'Producto',
        render: (row) => row.name,
        sortDirection: 'ascending',
        sortLabel: 'Ordenar por producto',
        onSort: handleSort,
      },
      {
        id: 'cost',
        header: 'Costo',
        render: (row) => row.cost,
        align: 'right',
      },
    ];

    render(
      <FinanceTable
        ariaLabel="Tabla de productos"
        columns={columns}
        emptyState="Todavía no hay productos."
        getRowKey={(row) => row.id}
        rows={[{ id: 'flour', name: 'Harina 000', cost: '$1.200' }]}
      />,
    );

    const table = screen.getByRole('table', { name: /tabla de productos/i });

    expect(within(table).getByRole('columnheader', { name: /producto/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(table).getByRole('cell', { name: /harina 000/i })).toBeInTheDocument();

    await user.click(within(table).getByRole('button', { name: /ordenar por producto/i }));
    expect(handleSort).toHaveBeenCalledTimes(1);
  });

  it('shows the finance table empty state inside the table body', () => {
    const columns: FinanceTableColumn<{ id: string; name: string }>[] = [
      { id: 'name', header: 'Producto', render: (row) => row.name },
    ];

    render(
      <FinanceTable
        ariaLabel="Tabla vacía"
        columns={columns}
        emptyState="Todavía no hay productos."
        getRowKey={(row) => row.id}
        rows={[]}
      />,
    );

    expect(screen.getByRole('cell', { name: /todavía no hay productos/i })).toBeInTheDocument();
  });

  it('renders a compact metric card with value, trend, icon, and help text', () => {
    render(
      <MetricCard
        accent="success"
        helpText="Promedio calculado con las variedades activas."
        icon={<TrendingUp aria-hidden={true} />}
        label="Margen promedio"
        trend={{ label: '+4% vs objetivo', tone: 'positive' }}
        value="52%"
      />,
    );

    expect(screen.getByRole('article', { name: /margen promedio: 52%/i })).toBeInTheDocument();
    expect(screen.getByText('+4% vs objetivo')).toBeInTheDocument();
    expect(screen.getByText(/promedio calculado/i)).toBeInTheDocument();
  });

  it('toggles disclosure content with expanded state announced to assistive tech', async () => {
    const user = userEvent.setup();

    render(
      <DisclosurePanel summary="Costo, venta y servicio" title="Escenario de 3 docenas">
        <p>Ganancia estimada: $9.200</p>
      </DisclosurePanel>,
    );

    const trigger = screen.getByRole('button', { name: /escenario de 3 docenas/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/ganancia estimada/i)).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/ganancia estimada: \$9\.200/i)).toBeInTheDocument();
  });
});
