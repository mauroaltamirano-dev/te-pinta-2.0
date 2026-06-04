import { lazy, Suspense, type ComponentType } from 'react';

import { PageFallback } from '@/components/layout/PageFallback';

export const lazyRoute = <T extends Record<string, ComponentType>>(
  factory: () => Promise<T>,
  exportName: keyof T,
): ComponentType => {
  const LazyComponent = lazy(() =>
    factory().then((module) => ({ default: module[exportName] as ComponentType })),
  );

  return function LazyRoute() {
    return (
      <Suspense fallback={<PageFallback />}>
        <LazyComponent />
      </Suspense>
    );
  };
};
