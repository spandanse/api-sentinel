require('dotenv').config({ quiet: true });

const express = require('express');
const scansRouter = require('./routes/scans.routes');

const app = express();

app.use(express.json());

// Health check: verifies that the API responds.
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-sentinel',
  });
});

// Scan management routes.
app.use('/api/v1/scans', scansRouter);

module.exports = app;
