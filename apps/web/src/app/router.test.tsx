import { describe, expect, it } from 'vitest';
import { Navigate } from 'react-router-dom';

import { FinancePage } from '@/features/finance/pages/FinancePage';

import { protectedRoutes } from './router';

describe('protected route registry', () => {
  it('registers the finance workspace under /finanzas', () => {
    const financeRoute = protectedRoutes.find((route) => route.path === 'finanzas');

    expect(financeRoute?.element).toEqual(<FinancePage />);
  });

  it('keeps stale /ingredients URLs protected and redirects them to the finance catalog', () => {
    const ingredientsRoute = protectedRoutes.find((route) => route.path === 'ingredients');

    expect(ingredientsRoute?.element).toEqual(
      <Navigate replace to="/finanzas?section=catalog" />,
    );
  });
});
