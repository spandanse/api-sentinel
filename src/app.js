require('dotenv').config({ quiet: true });

const express = require('express');
const scansRouter = require('./routes/scans.routes');
const authRouter = require('./routes/auth.routes');
const adminRouter = require('./routes/admin.routes');
const authenticateToken = require('./middleware/auth.middleware');
const requireRole = require('./middleware/role.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');

const app = express();

app.use(express.json());

// Health check: verifies that the API responds.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-sentinel',
  });
});

// Authentication routes.
app.use('/api/v1/auth', authRouter);

// Scan management routes.
app.use('/api/v1/scans', authenticateToken, scansRouter);

// Administrative routes.
app.use('/api/v1/admin', authenticateToken, requireRole('admin'), adminRouter);

// Handle unknown endpoints and unexpected errors.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
