const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  // Require the standard Bearer token format.
  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      error: 'Authentication required.',
      message: 'A valid Bearer token must be provided.',
    });
  }

  const token = authorization.slice(7);

  if (!token || token.includes(' ')) {
    return res.status(401).json({
      error: 'Authentication required.',
      message: 'A valid Bearer token must be provided.',
    });
  }

  // A missing server secret is a configuration error, not a client error.
  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'api-sentinel',
      audience: 'api-sentinel-client',
    });

    // Only accept tokens containing a valid subject (user ID).
    if (typeof decoded.sub !== 'string' || !decoded.sub) {
      return res.status(401).json({
        error: 'Invalid authentication token.',
        message: 'Please log in again.',
      });
    }

    req.user = {
      id: decoded.sub,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid authentication token.',
      message: 'Please log in again.',
    });
  }
}

module.exports = authenticateToken;
