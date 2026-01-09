import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error with proper formatting
  logger.error(message, {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      isOperational: err.isOperational,
    },
    path: req.path,
    method: req.method,
    statusCode,
    ...(req.body && Object.keys(req.body).length > 0 && { body: req.body }),
    ...(req.query && Object.keys(req.query).length > 0 && { query: req.query }),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
