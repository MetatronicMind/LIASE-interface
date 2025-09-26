const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
    code: err.code || 'INTERNAL_ERROR'
  };

  // Rate limiting errors
  if (err.status === 429 || err.statusCode === 429) {
    error = {
      message: 'Too many requests. Please slow down and try again.',
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter || 60
    };
  }

  // Server overload/timeout errors
  if (err.code === 'ETIMEDOUT' || err.timeout) {
    error = {
      message: 'Request timeout. Server may be overloaded.',
      status: 503,
      code: 'REQUEST_TIMEOUT',
      retryAfter: 30
    };
  }

  // Connection errors
  if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
    error = {
      message: 'Service temporarily unavailable. Please try again.',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      retryAfter: 60
    };
  }

  // Memory/resource errors
  if (err.code === 'ENOMEM' || err.message?.includes('out of memory')) {
    error = {
      message: 'Server is experiencing high load. Please try again later.',
      status: 503,
      code: 'SERVER_OVERLOADED',
      retryAfter: 120
    };
  }

  // Cosmos DB errors
  if (err.code === 409) {
    error = {
      message: 'Resource already exists',
      status: 409,
      code: 'RESOURCE_CONFLICT'
    };
  }

  if (err.code === 404) {
    error = {
      message: 'Resource not found',
      status: 404,
      code: 'RESOURCE_NOT_FOUND'
    };
  }

  if (err.code === 403) {
    error = {
      message: 'Access denied',
      status: 403,
      code: 'ACCESS_DENIED'
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      message: 'Validation failed',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: err.errors || err.details
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401,
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      status: 401,
      code: 'TOKEN_EXPIRED'
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File too large',
      status: 400,
      code: 'FILE_TOO_LARGE'
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = {
      message: 'Too many files',
      status: 400,
      code: 'TOO_MANY_FILES'
    };
  }

  // Set retry headers for rate limiting and service unavailable errors
  if (error.retryAfter) {
    res.set('Retry-After', error.retryAfter);
  }

  // Send error response
  res.status(error.status).json({
    error: error.message,
    code: error.code,
    ...(error.retryAfter && { retryAfter: error.retryAfter }),
    ...(error.details && { details: error.details }),
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
