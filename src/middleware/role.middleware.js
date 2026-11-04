const VALID_ROLES = ['user', 'admin'];

function requireRole(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !VALID_ROLES.includes(role))
  ) {
    throw new Error('requireRole must receive one or more valid roles.');
  }

  return function authorizeRole(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.',
        message: 'Please log in to access this resource.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden.',
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

module.exports = requireRole;
