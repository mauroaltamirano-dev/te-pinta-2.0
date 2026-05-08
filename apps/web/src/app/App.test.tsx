import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App scaffold', () => {
  it('renders the Te Pinta web shell with React Router content', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /te pinta/i })).toBeInTheDocument();
    expect(screen.getByText(/gestión diaria de empanadas/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir al dashboard/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});
