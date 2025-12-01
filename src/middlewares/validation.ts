// src/middlewares/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const extractedErrors: any[] = [];
    errors.array().map((err: any) =>
      extractedErrors.push({ [err.path]: err.msg })
    );

    // Sử dụng ApiError với errors
    throw new ApiError(400, 'Validation error', extractedErrors);
  };
};