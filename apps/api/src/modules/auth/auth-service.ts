import { compare } from 'bcryptjs';

import type { AuthLoginInput } from '@te-pinta/shared';

import { ApiError } from '../../middlewares/error-handler';
import {
  signAccessToken,
  signRefreshToken,
  toAuthenticatedUser,
  verifyRefreshToken,
  type AuthenticatedUser,
  type JwtSecrets,
  type TokenPayload,
} from './jwt';

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export type AdminUserRepository = {
  findAdminByEmail(email: string): Promise<AdminUserRecord | null>;
};

export type AuthSession = {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
};

export type RefreshedAuthSession = AuthSession;

const buildPayload = (user: AdminUserRecord | AuthenticatedUser): TokenPayload => ({
  userId: user.id,
  email: user.email,
  name: user.name,
});

export const authenticateAdmin = async (
  input: AuthLoginInput,
  repository: AdminUserRepository,
  secrets: JwtSecrets,
): Promise<AuthSession> => {
  const email = input.email.toLowerCase();
  const user = await repository.findAdminByEmail(email);

  if (!user || !(await compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const payload = buildPayload(user);

  return {
    user: toAuthenticatedUser(payload),
    accessToken: signAccessToken(payload, secrets),
    refreshToken: signRefreshToken(payload, secrets),
  };
};

export const refreshAdminSession = (
  refreshToken: string | undefined,
  secrets: JwtSecrets,
): RefreshedAuthSession => {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
  }

  try {
    const payload = verifyRefreshToken(refreshToken, secrets);

    return {
      user: toAuthenticatedUser(payload),
      accessToken: signAccessToken(payload, secrets),
      refreshToken: signRefreshToken(payload, secrets),
    };
  } catch {
    throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }
};
