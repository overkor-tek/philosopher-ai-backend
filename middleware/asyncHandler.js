/**
 * Async Handler Middleware
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Wraps async route handlers to catch errors automatically
 */

/**
 * Wrap an async function to catch errors and pass to next()
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 *
 * @example
 * // Instead of:
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await User.findAll();
 *     res.json(users);
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 *
 * // Use:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
function asyncHandler(fn) {
  return function asyncUtilWrap(req, res, next) {
    const fnReturn = fn(req, res, next);
    return Promise.resolve(fnReturn).catch(next);
  };
}

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Custom error with statusCode property
 */
function createError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Common HTTP errors
 */
const HttpError = {
  BadRequest: (message = 'Bad request') => createError(message, 400),
  Unauthorized: (message = 'Unauthorized') => createError(message, 401),
  Forbidden: (message = 'Forbidden') => createError(message, 403),
  NotFound: (message = 'Not found') => createError(message, 404),
  Conflict: (message = 'Conflict') => createError(message, 409),
  TooManyRequests: (message = 'Too many requests') => createError(message, 429),
  Internal: (message = 'Internal server error') => createError(message, 500)
};

/**
 * Validation error helper
 * @param {Object} errors - Object with field names as keys and error messages as values
 * @returns {Error} Validation error with errors property
 */
function validationError(errors) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.errors = errors;
  return error;
}

/**
 * Not found middleware - catches 404s
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function notFoundHandler(req, res, next) {
  const error = createError(`Cannot ${req.method} ${req.path}`, 404);
  next(error);
}

/**
 * Global error handler middleware
 * @param {Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;

  // Log error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  // Build response
  const response = {
    success: false,
    error: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  };

  // Include validation errors if present
  if (err.errors) {
    response.errors = err.errors;
  }

  // Include error ID if available (from error tracker)
  if (err.errorId) {
    response.errorId = err.errorId;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  asyncHandler,
  createError,
  HttpError,
  validationError,
  notFoundHandler,
  errorHandler
};
