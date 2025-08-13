/* eslint-disable no-const-assign */
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleRateLimitError = () => new AppError('Too many requests. Please try again later.', 429);
const handleAuthorizationError = () => new AppError('You do not have permission to perform this action.', 403);

const handleServiceError = (err) => {
  if (err.response?.status === 401) {
    return new AppError('Authentication failed. Please check your credentials.', 401);
  }
  if (err.response?.status === 403) {
    return new AppError('Service access forbidden. Please verify your permissions.', 403);
  }
  return new AppError('Service error occurred.', err.response?.status || 500);
};
const sendErrorDev = (err, res) => {
  logger.error(err, 'Error in Development:', {
    message: err.message,
    stack: err.stack,
  });
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // known error
  if (err.isOperational) {
    logger.warn(err, 'Operational Error:', { message: err.message });
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
    });
    // other unknown errors
  } else {
    logger.error(err, 'Unknown Error:', { message: err.message });
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};


export default function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    const error = { ...err, name: err.name };

    // if (error.name === 'AxiosError') error = handleServiceError(error);
    // if (error.name === 'CastError') error = handleCastErrorDB(error);
    // if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    // if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    // if (error.status === 429) error = handleRateLimitError();
    // if (error.status === 403) error = handleAuthorizationError();

    sendErrorProd(error, res);
  }
}
