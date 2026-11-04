const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

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

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET is not configured.'));
  }

  let decoded;

  // First, verify the JWT independently of the database lookup.
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'api-sentinel',
      audience: 'api-sentinel-client',
    });
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid authentication token.',
      message: 'Please log in again.',
    });
  }

  if (typeof decoded.sub !== 'string' || !decoded.sub) {
    return res.status(401).json({
      error: 'Invalid authentication token.',
      message: 'Please log in again.',
    });
  }

  // Next, confirm that the account still exists in the database.
  try {
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'name', 'email', 'role'],
    });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed.',
        message: 'The account associated with this token no longer exists.',
      });
    }

    // Attach only the required, non-sensitive user information.
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    // Database errors are server errors, not authentication failures.
    return next(error);
  }
}

module.exports = authenticateToken;
