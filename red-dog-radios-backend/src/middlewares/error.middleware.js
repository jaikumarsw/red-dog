class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join('. ');
    return res.status(400).json({ success: false, message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const keyValue = err.keyValue || {};
    const field = Object.keys(keyValue)[0] || 'field';
    let message;
    if (field === 'email') {
      message = 'This email is already registered. Please sign in.';
    } else if (field === 'username') {
      message =
        'A database index conflict occurred on username. Contact support or run a one-time index sync on the users collection.';
    } else {
      message = `This ${field} is already in use. Please choose a different ${field}.`;
    }
    return res.status(409).json({ success: false, message });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Operational errors (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Unhandled errors
  console.error('[ErrorMiddleware] Unhandled error:', err.message);
  console.error('[ErrorMiddleware] Stack:', err.stack);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

module.exports = { AppError, errorHandler, notFoundHandler };
