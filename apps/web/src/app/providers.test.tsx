import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { AppProviders } from './providers';

const QueryProbe = () => {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => 'query-ready',
  });

  return <span>{data ?? 'loading'}</span>;
};

describe('AppProviders', () => {
  it('provides TanStack Query context', async () => {
    render(
      <AppProviders>
        <QueryProbe />
      </AppProviders>,
    );

    expect(await screen.findByText('query-ready')).toBeInTheDocument();
  });
});
