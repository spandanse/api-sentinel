function errorHandler(err, req, res, next) {
  // Log the error type for debugging without exposing internal details.
  console.error('API error:', err.name || 'UnknownError');

  // Invalid JSON is a client-side error, not a server failure.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid request body.',
      message: 'The request body must contain valid JSON.',
    });
  }

  // Do not expose database errors, stack traces, or internal messages.
  return res.status(500).json({
    error: 'Internal server error.',
    message: 'Something went wrong while processing the request.',
  });
}

module.exports = errorHandler;
