import { validationResult } from 'express-validator';
import AppError from '../utils/appError.js';

// Middleware function to handle validation errors
const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    const errors = errs.array().reduce((acc, error) => {
      acc += `${error.path}: ${error.msg}, `;
      return acc;
    }, '');

    const errorMessages = errs.array().reduce((acc, error) => ({
      ...acc, // Spread the previous accumulator
      [error.path]: { message: error.msg }, // Correct computed property
    }), {});

    return next(
      new AppError(
        errors,
        400,
        errorMessages,
      ),
    );
  }
  next();
};

export default validate;
