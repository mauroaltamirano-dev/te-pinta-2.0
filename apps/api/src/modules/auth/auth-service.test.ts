import { hash } from 'bcryptjs';
import { describe, expect, it } from 'vitest';

import { authenticateAdmin, refreshAdminSession } from './auth-service';
import { signRefreshToken } from './jwt';

const secrets = {
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'b'.repeat(32),
};

describe('auth service', () => {
  it('authenticates the admin and returns access/refresh tokens', async () => {
    const passwordHash = await hash('super-secret', 12);

    const result = await authenticateAdmin(
      { email: 'ADMIN@TEPINTA.LOCAL', password: 'super-secret' },
      {
        findAdminByEmail: async () => ({
          id: 'admin',
          email: 'admin@tepinta.local',
          name: 'Admin Te Pinta',
          passwordHash,
        }),
      },
      secrets,
    );

    expect(result.user).toEqual({
      id: 'admin',
      email: 'admin@tepinta.local',
      name: 'Admin Te Pinta',
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejects invalid credentials', async () => {
    const passwordHash = await hash('super-secret', 12);

    await expect(
      authenticateAdmin(
        { email: 'admin@tepinta.local', password: 'wrong-password' },
        {
          findAdminByEmail: async () => ({
            id: 'admin',
            email: 'admin@tepinta.local',
            name: 'Admin Te Pinta',
            passwordHash,
          }),
        },
        secrets,
      ),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('refreshes an admin session from a valid refresh token', () => {
    const refreshToken = signRefreshToken(
      { userId: 'admin', email: 'admin@tepinta.local', name: 'Admin Te Pinta' },
      secrets,
    );

    const result = refreshAdminSession(refreshToken, secrets);

    expect(result.user.email).toBe('admin@tepinta.local');
    expect(result.accessToken).toEqual(expect.any(String));
  });
});
