import { describe, expect, it } from 'vitest';

import { BUSINESS_TIME_ZONE, getBusinessDateIso } from './date';

describe('business date utilities', () => {
  it('keeps the Argentina business day when UTC already moved to tomorrow', () => {
    expect(getBusinessDateIso(new Date('2026-05-31T00:00:00.000Z'))).toBe('2026-05-30');
  });

  it('uses the configured Argentina time zone by default', () => {
    expect(BUSINESS_TIME_ZONE).toBe('America/Argentina/Cordoba');
  });
});
