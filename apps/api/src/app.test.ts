import { describe, expect, it } from 'vitest';

import { createApp, healthPayload } from './app';

type ExpressLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
};

describe('createApp', () => {
  it('registers a health endpoint payload', () => {
    const app = createApp({ allowedOrigin: 'http://localhost:5173' });
    const stack = (app.router.stack ?? []) as ExpressLayer[];
    const healthRoute = stack.find(
      (layer) => layer.route?.path === '/health' && layer.route.methods.get,
    );

    expect(healthRoute).toBeDefined();
    expect(healthPayload).toEqual({ status: 'ok', service: 'te-pinta-api' });
  });
});
