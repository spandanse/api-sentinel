const express = require('express');
const {
  findAccountByToken,
  findUserById,
} = require('./data/users');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

app.use(express.json({ limit: '10kb' }));

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-sentinel-vulnerable-api',
  });
});

app.use('/api/v1/auth', authRoutes);

// Authentication middleware for protected routes.
function authenticate(req, res, next) {
  const authorization = req.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authorization.slice('Bearer '.length);
  const account = findAccountByToken(token);

  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = findUserById(account.userId);
  next();
}

app.use('/api/v1/users', authenticate, usersRoutes);

// Demonstration vulnerability: the route requires authentication,
// but it does not verify that the requester has the admin role.
app.get('/api/v1/admin/reports', authenticate, (req, res) => {
  res.json({
    message: 'Administrative reports',
    requestedBy: req.user.username || req.user.name,
    reports: [
      { id: 1, title: 'Synthetic test report' },
    ],
  });
});

module.exports = app;
