import { body, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for phone number in request body
 */
export const validatePhone: ValidationChain[] = [
  body('phone')
    .exists().withMessage('Phone number is required')
    .isString().withMessage('Phone number must be a string')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (E.164)')
];

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }
  next();
} 