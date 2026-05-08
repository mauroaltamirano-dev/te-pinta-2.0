import jwt, { type SignOptions } from 'jsonwebtoken';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export type JwtSecrets = {
  accessSecret: string;
  refreshSecret: string;
};

export type TokenPayload = {
  userId: string;
  email: string;
  name: string;
};

type InternalTokenPayload = TokenPayload & {
  tokenType: 'access' | 'refresh';
};

const signToken = (
  payload: TokenPayload,
  secret: string,
  tokenType: InternalTokenPayload['tokenType'],
  expiresIn: SignOptions['expiresIn'],
): string => {
  return jwt.sign({ ...payload, tokenType }, secret, {
    expiresIn,
    issuer: 'te-pinta-api',
    audience: 'te-pinta-admin',
  });
};

const verifyToken = (
  token: string,
  secret: string,
  expectedType: InternalTokenPayload['tokenType'],
  errorMessage: string,
): TokenPayload => {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'te-pinta-api',
      audience: 'te-pinta-admin',
    }) as Partial<InternalTokenPayload>;

    if (decoded.tokenType !== expectedType || !decoded.userId || !decoded.email || !decoded.name) {
      throw new Error(errorMessage);
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    throw new Error(errorMessage);
  }
};

export const signAccessToken = (payload: TokenPayload, secrets: JwtSecrets): string => {
  return signToken(payload, secrets.accessSecret, 'access', '15m');
};

export const signRefreshToken = (payload: TokenPayload, secrets: JwtSecrets): string => {
  return signToken(payload, secrets.refreshSecret, 'refresh', '7d');
};

export const verifyAccessToken = (token: string, secrets: JwtSecrets): TokenPayload => {
  return verifyToken(token, secrets.accessSecret, 'access', 'Invalid access token');
};

export const verifyRefreshToken = (token: string, secrets: JwtSecrets): TokenPayload => {
  return verifyToken(token, secrets.refreshSecret, 'refresh', 'Invalid refresh token');
};

export const toAuthenticatedUser = (payload: TokenPayload): AuthenticatedUser => ({
  id: payload.userId,
  email: payload.email,
  name: payload.name,
});
