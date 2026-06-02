import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FinanceSectionNav, financeSections, type FinanceSectionId } from './FinanceSectionNav';

describe('FinanceSectionNav', () => {
  it('renders the finance sections without exposing the legacy stock tab', () => {
    render(<FinanceSectionNav activeSection="dashboard" onSectionChange={vi.fn()} />);

    const tablist = screen.getByRole('tablist', { name: /secciones de finanzas/i });

    expect(financeSections.map((section) => section.id)).toEqual([
      'dashboard',
      'catalog',
      'purchases',
      'base-costs',
      'recipes',
      'calculator',
    ] satisfies FinanceSectionId[]);
    expect(within(tablist).getByRole('tab', { name: /dashboard/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tablist).queryByRole('tab', { name: /stock/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /stock/i })).not.toBeInTheDocument();
  });

  it('changes section through the mobile select navigation', async () => {
    const user = userEvent.setup();
    const handleSectionChange = vi.fn();

    render(<FinanceSectionNav activeSection="dashboard" onSectionChange={handleSectionChange} />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: /sección de finanzas/i }),
      'purchases',
    );

    expect(handleSectionChange).toHaveBeenCalledWith('purchases');
  });
});
