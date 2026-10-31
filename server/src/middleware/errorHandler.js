/**
 * Centralized Express Error Handling Middleware.
 * Adheres to standard error JSON format defined in AGENTS.md.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred';

  console.error(`[Server-Error] [${errorCode}] ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: {
      message,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? err.details || null : null
    }
  });
};
