import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RafflePage } from './RafflePage';

describe('RafflePage', () => {
  it('renders raffle summary and start action', () => {
    render(
      <MemoryRouter>
        <RafflePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /sorteo te pinta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sorteo/i })).toBeInTheDocument();
    expect(screen.getByText(/datos comerciales quedan reservados/i)).toBeInTheDocument();
    expect(screen.queryByText('26')).not.toBeInTheDocument();
    expect(screen.queryByText('41')).not.toBeInTheDocument();
  });
});
