import type { RequestHandler } from 'express';

import { ApiError } from './error-handler';
import { toAuthenticatedUser, verifyAccessToken, type JwtSecrets } from '../modules/auth/jwt';

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

export const authenticate = (secrets: JwtSecrets): RequestHandler => {
  return (req, _res, next) => {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      next(new ApiError(401, 'Unauthorized', 'UNAUTHORIZED'));
      return;
    }

    try {
      req.user = toAuthenticatedUser(verifyAccessToken(token, secrets));
      next();
    } catch {
      next(new ApiError(401, 'Unauthorized', 'UNAUTHORIZED'));
    }
  };
};
