import type { ErrorRequestHandler, RequestHandler } from 'express';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, 'Route not found', 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }

  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
};
