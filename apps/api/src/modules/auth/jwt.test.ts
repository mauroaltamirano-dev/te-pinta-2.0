import { describe, expect, it } from 'vitest';

import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

const secrets = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
};
const payload = { userId: 'admin', email: 'admin@tepinta.local', name: 'Admin Te Pinta' };

describe('jwt helpers', () => {
  it('signs and verifies access tokens', () => {
    const token = signAccessToken(payload, secrets);

    expect(verifyAccessToken(token, secrets)).toMatchObject(payload);
  });

  it('signs and verifies refresh tokens separately from access tokens', () => {
    const token = signRefreshToken(payload, secrets);

    expect(verifyRefreshToken(token, secrets)).toMatchObject(payload);
    expect(() => verifyAccessToken(token, secrets)).toThrow('Invalid access token');
  });
});
