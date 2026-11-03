export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message])
    );
    return res.status(400).json({ message: 'Please check the highlighted fields.', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id format.' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error('❌', err);
  res.status(status).json({ message: err.message || 'Something went wrong.' });
};

// Wraps async route handlers so rejected promises hit the error handler.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
