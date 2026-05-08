import type { AuthenticatedUser } from '../modules/auth/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
