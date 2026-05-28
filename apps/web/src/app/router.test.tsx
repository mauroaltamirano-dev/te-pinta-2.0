import { describe, expect, it } from 'vitest';

import { FinancePage } from '@/features/finance/pages/FinancePage';

import { protectedRoutes } from './router';

describe('protected route registry', () => {
  it('registers the finance workspace under /finanzas', () => {
    const financeRoute = protectedRoutes.find((route) => route.path === 'finanzas');

    expect(financeRoute?.element).toEqual(<FinancePage />);
  });
});
