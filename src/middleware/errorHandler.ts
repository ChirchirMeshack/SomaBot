import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Global error handling middleware for Express
 * Logs the error and returns a consistent JSON response
 */
export default function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`Error: ${err.message || err}`);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
} 