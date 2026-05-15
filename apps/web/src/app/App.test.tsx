import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App scaffold', () => {
  it('renders the Te Pinta web shell with React Router content', () => {
    render(<App />);

    expect(screen.getByRole('img', { name: /te pinta/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pedidos claros/i })).toBeInTheDocument();
    expect(screen.getByText(/app interna pensada para el ritmo diario/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /ir al dashboard/i })[0]).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
