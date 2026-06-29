import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // If it's operational (AppError), we trust it and send the specific details
  if (err instanceof AppError) {
    logger.warn(`Operational Error: [${req.method}] ${req.originalUrl} - ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err.statusCode === 422 && { errors: (err as any).errors }),
    });
  }

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    logger.warn(`Validation Error: [${req.method}] ${req.originalUrl} - 400 - ${err.message}`);
    return res.status(400).json({
      status: 'fail',
      message: 'Input validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Log all non-operational / general errors with stacks
  logger.error(`Critical Server Error: [${req.method}] ${req.originalUrl}`, err);

  const response = {
    status: 'error',
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  return res.status(500).json(response);
}
